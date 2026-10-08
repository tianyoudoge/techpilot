/** 轻服务端请求入口；模型调用在 model/client.ts，设备设置在 model-config.ts。
 * 继续导出旧的公共名称，避免已有页面和测试的导入路径失效。
 */
import { platformFetch, serviceUrl } from "./platform";
import { token, loginOpen, setToken } from "./ui-state";
export {
  token,
  loginOpen,
  notice,
  tell,
  setToken,
  requireLogin,
  legacyServerMode,
} from "./ui-state";
export {
  localConfig,
  saveLocalConfig,
  clearLocalConfig,
  requireModel,
  apiKeyDialogOpen,
} from "./model-config";
export type { LocalConfig } from "./model-config";
export {
  safeArray,
  safeObject,
  timeLabel,
  safeUrl,
  chapterNames,
} from "./formatters";

export class ApiError extends Error {
  constructor(
    message: string,
    public code: number,
  ) {
    super(message);
  }
}

export async function api<T>(
  path: string,
  options: RequestInit = {},
  timeout = 100000,
): Promise<T> {
  const requestToken = token.value;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);
  try {
    const headers = new Headers(options.headers);
    if (token.value) headers.set("Authorization", `Bearer ${token.value}`);
    if (options.body && !(options.body instanceof FormData))
      headers.set("Content-Type", "application/json");
    const response = await platformFetch(serviceUrl(path), {
      ...options,
      headers,
      signal: controller.signal,
    });
    const body = await response.json().catch(() => {
      throw new ApiError("服务暂时无法连接，请稍后重试", response.status);
    });
    if (requestToken !== token.value)
      throw new ApiError("账号已切换，请重新打开这份笔记", 1002);
    if (
      (response.status === 401 || body.code === 1002) &&
      !path.startsWith("/assets") &&
      !path.startsWith("/knowledge") &&
      !path.startsWith("/segments") &&
      !path.startsWith("/taxonomy")
    ) {
      setToken("");
      loginOpen.value = true;
      throw new ApiError("登录已过期，重新登录后可以继续", 1002);
    }
    if (!response.ok || body.code !== 0)
      throw new ApiError(body.message || "暂时没有完成，请重试", body.code);
    return body.data as T;
  } catch (error) {
    if (error instanceof ApiError) throw error;
    if (error instanceof DOMException && error.name === "AbortError")
      throw new ApiError("等待时间有点长，请重试。已保存的内容会保留。", 0);
    throw new ApiError("网络连接失败，请检查网络后重试", 0);
  } finally {
    clearTimeout(timer);
  }
}

export function post<T>(path: string, body: unknown = {}) {
  return api<T>(path, { method: "POST", body: JSON.stringify(body) });
}

export function upload<T>(path: string, file: File) {
  const form = new FormData();
  form.append("image", file);
  return api<T>(path, { method: "POST", body: form });
}
