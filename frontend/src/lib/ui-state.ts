/** 全局界面状态：登录弹窗和短提示。ref 让 Vue 在值变化时更新界面。 */
import { ref } from "vue";

const tokenKey = "jianghui-token";
export const token = ref(localStorage.getItem(tokenKey) || "");
export const loginOpen = ref(false);
export const notice = ref("");
let noticeTimer: ReturnType<typeof setTimeout>;

export function tell(message: string) {
  notice.value = message;
  clearTimeout(noticeTimer);
  noticeTimer = setTimeout(() => (notice.value = ""), 4500);
}

export function setToken(value: string) {
  token.value = value;
  if (value) localStorage.setItem(tokenKey, value);
  else {
    localStorage.removeItem(tokenKey);
    localStorage.removeItem("jianghui-last-session");
  }
}

export function requireLogin() {
  if (token.value) return true;
  loginOpen.value = true;
  return false;
}

export const legacyServerMode = () =>
  import.meta.env.VITE_LEGACY_SERVER === "1" ||
  localStorage.getItem("jianghui-legacy-server") === "1";
