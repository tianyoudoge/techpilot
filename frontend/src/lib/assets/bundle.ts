/** 资产读取：网络快照、IndexedDB 缓存、撤回记录，以及本地生成资产的合并。 */
import { platformFetch, serviceBase } from "../platform";
import { all, read, write } from "../client-store";
import type {
  AssetContent,
  KnowledgeData,
  KnowledgeAssetRaw,
  SharedAsset,
  Receipt,
} from "./types";

const bundleRequests = new Map<string, Promise<KnowledgeData>>();
const snapshots = new Map<
  string,
  { data: KnowledgeData; refreshedAt: number }
>();
function complete(c: AssetContent) {
  return (
    !!c.definition?.trim() &&
    !!c.explanation?.trim() &&
    !!c.workedExample?.trim()
  );
}

async function fetchBundle(server: string): Promise<KnowledgeData> {
  const cached = await read<KnowledgeData>("cache", `bundle:${server}`);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15000);
  try {
    const response = await platformFetch(`${server}/api/v1/assets/bundle`, {
      headers: cached ? { "If-None-Match": `"${cached.version}"` } : {},
      signal: controller.signal,
    });
    if (response.status === 304 && cached) return cached;
    const body = await response.json();
    if (
      !response.ok ||
      body.code !== 0 ||
      body.data.schemaVersion !== 1 ||
      !Array.isArray(body.data.taxonomy) ||
      !Array.isArray(body.data.sharedAssets)
    )
      throw new Error("资产服务返回了不兼容的数据");
    await write("cache", `bundle:${server}`, body.data);
    return body.data;
  } catch (error) {
    // 网络暂时不可用时，已有笔记仍可以使用上次下载的资产。
    if (cached) return cached;
    throw new Error(
      `知识资产加载失败，请检查资产服务地址和网络：${error instanceof Error ? error.message : String(error)}`,
    );
  } finally {
    clearTimeout(timer);
  }
}
export async function loadAssetBundle(force = false): Promise<KnowledgeData> {
  const server = serviceBase();
  const snapshot = snapshots.get(server);
  if (force || !snapshot || Date.now() - snapshot.refreshedAt > 60000) {
    if (!bundleRequests.has(server))
      bundleRequests.set(
        server,
        fetchBundle(server)
          .then((data) => {
            snapshots.set(server, { data, refreshedAt: Date.now() });
            return data;
          })
          .finally(() => {
            bundleRequests.delete(server);
          }),
      );
    await bundleRequests.get(server);
  }
  if (server !== serviceBase())
    throw new Error("资产服务已切换，请重新打开这份笔记");
  // 每次以服务端新快照为准，撤回的资产不能被本地旧副本重新补回来。
  const data = structuredClone(snapshots.get(server)!.data);
  const generated = await all<SharedAsset>("generated");
  const receipts = await all<Receipt>("receipts");
  for (const a of generated) {
    const receipt = receipts.find(
      (r) => r.localId === a.id && r.server === server,
    );
    // 服务端已接收的资产，需服从服务端的发布与撤回状态。
    if (
      receipt &&
      (data.withdrawnIds.includes(receipt.id) ||
        data.sharedAssets.some((p) => p.id === receipt.id))
    )
      continue;
    if (receipt && ["REJECTED", "REVOKED"].includes(receipt.status)) continue;
    const canonical = data.assets.find((k) => k.id === a.knowledgePointId);
    if (
      !canonical ||
      canonical.grade !== a.grade ||
      canonical.chapterId !== a.chapterId
    )
      continue;
    data.sharedAssets.push(a);
  }
  for (const a of data.sharedAssets.filter((a) => a.kind === "knowledge")) {
    const existing = data.assets.find((k) => k.id === a.knowledgePointId);
    if (!existing) continue;
    for (const field of [
      "definition",
      "explanation",
      "workedExample",
    ] as const) {
      if (!existing[field]?.trim()) existing[field] = a.content[field] ?? "";
    }
  }
  return data;
}
export function invalidateAssets() {
  snapshots.clear();
}
export function hasKnowledgeAsset(a: KnowledgeAssetRaw) {
  return complete(a);
}
