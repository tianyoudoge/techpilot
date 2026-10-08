/** 本地数据库。H5 和 Tauri 使用同一套代码；照片放这里，避免占满 localStorage。
 * cache：服务端资产快照；sessions：用户笔记；generated：本地生成资产；
 * outbox：待回传队列；receipts：服务端接收记录。
 */
let database: Promise<IDBDatabase> | undefined;
const stores = [
  "cache",
  "sessions",
  "generated",
  "outbox",
  "receipts",
] as const;
// as const 保留表名的具体值；StoreName 只能是上面五个名字之一。
export type StoreName = (typeof stores)[number];
function db(): Promise<IDBDatabase> {
  return (database ??= new Promise((resolve, reject) => {
    const request = indexedDB.open("jianghui-client", 1);
    request.onupgradeneeded = () => {
      for (const name of stores)
        if (!request.result.objectStoreNames.contains(name))
          request.result.createObjectStore(name);
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => {
      database = undefined;
      reject(request.error);
    };
  }));
}
export async function read<T>(
  store: StoreName,
  key: string,
): Promise<T | undefined> {
  const connection = await db();
  return new Promise((resolve, reject) => {
    const request = connection.transaction(store).objectStore(store).get(key);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}
export async function all<T>(store: StoreName): Promise<T[]> {
  const connection = await db();
  return new Promise((resolve, reject) => {
    const request = connection.transaction(store).objectStore(store).getAll();
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}
export async function write(store: StoreName, key: string, value: unknown) {
  await writeBatch([{ store, key, value }]);
}
export async function writeBatch(
  entries: {
    store: StoreName;
    key: string;
    value?: unknown;
    remove?: boolean;
  }[],
) {
  const connection = await db();
  return new Promise<void>((resolve, reject) => {
    const tx = connection.transaction(
      [...new Set(entries.map((e) => e.store))],
      "readwrite",
    );
    for (const entry of entries) {
      const store = tx.objectStore(entry.store);
      if (entry.remove) store.delete(entry.key);
      else store.put(entry.value, entry.key);
    }
    // 一批写入必须全部成功后才算保存成功。不要在单条 put 成功时就返回。
    tx.oncomplete = () => resolve();
    tx.onabort = () =>
      reject(tx.error ?? new Error("本地保存失败，请检查可用空间"));
    tx.onerror = () => reject(tx.error);
  });
}
