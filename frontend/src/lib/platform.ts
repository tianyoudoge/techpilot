/** 平台差异集中在这里：浏览器、iOS、其他 Tauri 端的网络、照片和外链能力。 */
import { isTauri } from "@tauri-apps/api/core";

export function nativePlatform() {
  return isTauri();
}
function iosAssetRequest(url: string) {
  // 真机验证：iOS 的 Rust 请求可能报错误 65，WebKit 配合本地 HTTP 配置可访问。
  // 只切换固定局域网 API；模型供应商仍用原生 HTTP，以免受到浏览器 CORS 限制。
  const ios =
    /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  if (!ios) return false;
  const parsed = new URL(url);
  return (
    parsed.origin === ASSET_SERVICE_BASE &&
    parsed.pathname.startsWith("/api/v1/")
  );
}
export async function platformFetch(
  url: string,
  options: RequestInit = {},
): Promise<Response> {
  if (nativePlatform() && /^https?:/.test(url) && !iosAssetRequest(url)) {
    const { fetch } = await import("@tauri-apps/plugin-http");
    return fetch(url, options);
  }
  return window.fetch(url, options);
}
// 局域网测试的固定地址。改 IP 时还需同步 iOS 的 ATS 配置与 Tauri HTTP 权限。
export const ASSET_SERVICE_BASE = "http://192.168.0.112:5173";
export function serviceBase(): string {
  return nativePlatform() ? ASSET_SERVICE_BASE : "";
}
export function serviceUrl(path: string) {
  return `${serviceBase()}/api/v1${path}`;
}
export async function openExternal(url: string) {
  const parsed = new URL(url);
  if (!["https:", "http:"].includes(parsed.protocol)) return;
  if (nativePlatform()) {
    const { openUrl } = await import("@tauri-apps/plugin-opener");
    await openUrl(parsed.href);
  } else window.open(parsed.href, "_blank", "noopener,noreferrer");
}
export function choosePhoto(input: HTMLInputElement | undefined) {
  input?.click();
}
export async function photoDataUrl(file: File): Promise<string> {
  if (!file.type.startsWith("image/") || file.size > 10 * 1024 * 1024)
    throw new Error("请选择10MB以内的照片");
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("照片读取失败"));
    reader.readAsDataURL(file);
  });
}
