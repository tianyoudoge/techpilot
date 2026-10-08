/** 回传队列：只提交可复用资产，不带原题、照片或 Key；离线后按退避策略重试。 */
import { ref } from "vue";
import { platformFetch, serviceBase } from "../platform";
import { all, read, write, writeBatch } from "../client-store";
import type {
  AssetSubmission,
  SharedAsset,
  Contribution,
  Receipt,
} from "./types";

export const assetSync = ref({ pending: 0, error: "", syncing: false });
let flushing: Promise<void> | undefined;

export async function rememberAsset(
  asset: AssetSubmission,
  server = serviceBase(),
): Promise<SharedAsset> {
  // 只挑允许分享的字段；不能直接把整个笔记对象放进回传队列。
  const clean: AssetSubmission = {
    schemaVersion: 1,
    kind: asset.kind,
    knowledgePointId: asset.knowledgePointId,
    grade: asset.grade,
    chapterId: asset.chapterId,
    difficulty: asset.difficulty,
    audience: asset.audience,
    generatorModel: asset.generatorModel,
    promptVersion: asset.promptVersion,
    ...(asset.kind === "template" ? { method: asset.method } : {}),
    content:
      asset.kind === "knowledge"
        ? {
            definition: asset.content.definition,
            explanation: asset.content.explanation,
            workedExample: asset.content.workedExample,
          }
        : asset.kind === "template"
          ? {
              explanation: asset.content.explanation,
              steps: asset.content.steps?.map((s) => ({
                stepNo: s.stepNo,
                title: s.title,
                question: s.question,
                ifCorrect: s.ifCorrect,
                ifWrong: s.ifWrong,
              })),
            }
          : {
              content: asset.content.content,
              answer: asset.content.answer,
              solutionSteps: asset.content.solutionSteps,
              variationReason: asset.content.variationReason,
            },
    review: {
      correct: asset.review.correct,
      reason: asset.review.reason,
      independentAnswer: asset.review.independentAnswer,
    },
  };
  if (!clean.review.correct)
    throw new Error("未通过复核的资产不能保存为可用资产");
  const identity = JSON.stringify({
    kind: clean.kind,
    knowledgePointId: clean.knowledgePointId,
    audience: clean.audience,
    method: clean.method,
    difficulty: clean.difficulty,
    content: clean.content,
  });
  const bytes = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(identity),
  );
  const id = [...new Uint8Array(bytes)]
    .map((v) => v.toString(16).padStart(2, "0"))
    .join("");
  const row = { id, ...clean };
  const key = `${server}:${id}`;
  const acknowledged = await read<Receipt>("receipts", key);
  const queued = await read<Contribution>("outbox", key);
  await writeBatch([
    { store: "generated", key: id, value: row },
    ...(!acknowledged && !queued
      ? [
          {
            store: "outbox" as const,
            key,
            value: { id, asset: clean, server, attempts: 0, nextAttempt: 0 },
          },
        ]
      : []),
  ]);
  void flushAssetOutbox();
  return row;
}
export function flushAssetOutbox(force = false): Promise<void> {
  // 多个页面可能同时请求同步；共用同一个 Promise，避免重复提交。
  if (flushing) return flushing;
  const work = () => flush(force);
  const task = (async () => {
    if (navigator.locks)
      await navigator.locks.request("jianghui-assets-outbox", work);
    else await work();
  })()
    .catch((e) => {
      assetSync.value.error = e instanceof Error ? e.message : "回传失败";
    })
    .finally(() => {
      flushing = undefined;
      assetSync.value.syncing = false;
    });
  flushing = task;
  return task;
}
async function flush(force: boolean) {
  const server = serviceBase();
  const pending = await all<Contribution>("outbox");
  assetSync.value.pending = pending.length;
  assetSync.value.error = "";
  assetSync.value.syncing = true;
  for (const item of pending) {
    if (item.server !== server || (!force && item.nextAttempt > Date.now()))
      continue;
    const key = `${server}:${item.id}`;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 10000);
    try {
      const response = await platformFetch(
        `${server}/api/v1/assets/contributions`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(item.asset),
          signal: controller.signal,
        },
      );
      const body = await response.json();
      if (!response.ok || body.code !== 0 || !body.data?.id)
        throw new Error(body.message || "资产回传失败");
      await writeBatch([
        {
          store: "receipts",
          key,
          value: {
            id: body.data.id,
            localId: item.id,
            server,
            status: body.data.status,
          },
        },
        { store: "outbox", key, remove: true },
      ]);
    } catch (e) {
      item.attempts++;
      item.nextAttempt =
        Date.now() + Math.min(300000, 5000 * 2 ** Math.min(item.attempts, 6));
      await write("outbox", key, item);
      assetSync.value.error = e instanceof Error ? e.message : "资产回传失败";
    } finally {
      clearTimeout(timer);
    }
  }
  assetSync.value.pending = (await all("outbox")).length;
}
export function startAssetSync() {
  const resume = () => {
    if (document.visibilityState === "visible") void flushAssetOutbox();
  };
  window.addEventListener("online", resume);
  document.addEventListener("visibilitychange", resume);
  const timer = setInterval(resume, 30000);
  resume();
  return () => {
    clearInterval(timer);
    window.removeEventListener("online", resume);
    document.removeEventListener("visibilitychange", resume);
  };
}
