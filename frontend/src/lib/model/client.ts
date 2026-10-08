/** 模型通信：不决定题目内容，只负责可靠地发送请求并取回文字。 */
import type { LocalConfig } from "../model-config";
import { ApiError } from "../api";
import { platformFetch } from "../platform";

export function extractJSON(raw: string): string {
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) return raw;
  return raw.slice(start, end + 1);
}

// 模型请求排队执行。前一次失败后仍让后续请求继续，避免队列被一个错误卡死。

let requestQueue: Promise<unknown> = Promise.resolve();

export function enqueue<T>(fn: () => Promise<T>): Promise<T> {
  const next = requestQueue.then(() => fn());
  requestQueue = next.catch(() => undefined);
  return next;
}

// 统一处理供应商兼容接口；Key 只发给模型供应商。

interface ChatMessage {
  role: "system" | "user" | "assistant";
  content:
    | string
    | Array<{ type: string; text?: string; image_url?: { url: string } }>;
}

let activeModelController: AbortController | undefined;
export function cancelModelRequest() {
  activeModelController?.abort(
    new DOMException("已取消模型请求", "AbortError"),
  );
}

export async function llmCall(
  cfg: LocalConfig,
  messages: ChatMessage[],
  model: string,
  maxTokens: number | null,
  timeoutMs = 90000,
): Promise<string> {
  if (!cfg.apiKey.trim()) throw new ApiError("请先配置自己的模型 API Key", 0);
  const controller = new AbortController();
  activeModelController = controller;
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  const body: Record<string, unknown> = { model, messages };
  if (maxTokens !== null) body.max_tokens = maxTokens;
  // Official DeepSeek defaults to thinking mode. Our short JSON tasks need an
  // actual answer within this budget, rather than spending it all on reasoning.
  if (new URL(cfg.baseUrl).hostname === "api.deepseek.com")
    body.thinking = { type: "disabled" };
  try {
    const res = await platformFetch(
      `${cfg.baseUrl.replace(/\/+$/, "")}/chat/completions`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${cfg.apiKey}`,
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      },
    );
    if (res.status === 429)
      throw new ApiError("请求太频繁，请稍等一会儿再试", 429);
    if (res.status === 401)
      throw new ApiError("API Key 不正确，请检查后重新填写", 401);
    const data = await res.json().catch(() => {
      throw new ApiError("模型返回了无法解析的内容", 0);
    });
    if (!res.ok)
      throw new ApiError(
        data?.error?.message || "模型请求失败，请重试",
        res.status,
      );
    const usage = data.usage;
    if (usage)
      localStorage.setItem(
        "jianghui-last-model-usage",
        JSON.stringify({ model, ...usage }),
      );
    const content = data.choices?.[0]?.message?.content;
    if (typeof content !== "string" || !content.trim())
      throw new ApiError("模型未返回有效内容，请重试", 0);
    return content;
  } catch (e) {
    if (e instanceof ApiError) throw e;
    if (controller.signal.aborted)
      throw new ApiError(
        controller.signal.reason?.message === "已取消模型请求"
          ? "已取消模型请求，已保存内容仍保留"
          : "模型响应超时，请重试",
        0,
      );
    throw new ApiError("网络连接失败，请检查网络后重试", 0);
  } finally {
    clearTimeout(timer);
    if (activeModelController === controller) activeModelController = undefined;
  }
}
