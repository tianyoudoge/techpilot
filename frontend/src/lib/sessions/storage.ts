/** 笔记读写：照片和进度存进 IndexedDB；保留旧版 localStorage 数据迁移。 */
import { all, read, write } from "../client-store";
import type { LocalSessionState } from "./types";

const LOCAL_SESSION_KEY = "jianghui-local-session";
async function migrateLegacySession() {
  const raw = localStorage.getItem(LOCAL_SESSION_KEY);
  if (!raw) return;
  try {
    const s = JSON.parse(raw) as LocalSessionState;
    if (
      s.local === true &&
      Number.isSafeInteger(s.id) &&
      !(await read("sessions", String(s.id)))
    )
      await write("sessions", String(s.id), s);
    localStorage.removeItem(LOCAL_SESSION_KEY);
  } catch {
    /* Retain an unreadable legacy value for recovery. */
  }
}
export async function readLocalSession(
  sessionId: string,
): Promise<LocalSessionState | null> {
  await migrateLegacySession();
  if (!/^local:\d+$/.test(sessionId)) return null;
  return (
    (await read<LocalSessionState>("sessions", sessionId.slice(6))) ?? null
  );
}
export async function listLocalSessions(): Promise<LocalSessionState[]> {
  await migrateLegacySession();
  return (await all<LocalSessionState>("sessions")).sort((a, b) =>
    (b.updatedAt ?? b.createdAt).localeCompare(a.updatedAt ?? a.createdAt),
  );
}
export async function saveLocalSession(s: LocalSessionState) {
  s.updatedAt = new Date().toISOString();
  await write("sessions", String(s.id), s);
}
