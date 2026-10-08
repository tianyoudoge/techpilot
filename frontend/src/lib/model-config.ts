/** 用户设备上的供应商、模型与 Key 配置。保留已有存储键，升级后不丢设置。 */
import { ref } from "vue";
import { tell } from "./ui-state";

const apiKeyKey = "jianghui-local-api-key";
const apiBaseKey = "jianghui-local-api-base";
const apiModelVisionKey = "jianghui-local-model-vision";
const apiModelTextKey = "jianghui-local-model-text";

export interface LocalConfig {
  apiKey: string;
  baseUrl: string;
  // 设置页只选一个模型，保存时两个字段相同；保留字段名以兼容旧设置。
  modelVision: string;
  modelText: string;
}

const DEFAULT_BASE_URL = "https://api.deepseek.com";
const DEFAULT_MODEL_VISION = "deepseek-flash";
const DEFAULT_MODEL_TEXT = "deepseek-flash";

export const localConfig = ref<LocalConfig>({
  apiKey: localStorage.getItem(apiKeyKey) || "",
  baseUrl: localStorage.getItem(apiBaseKey) || DEFAULT_BASE_URL,
  modelVision: localStorage.getItem(apiModelVisionKey) || DEFAULT_MODEL_VISION,
  modelText: localStorage.getItem(apiModelTextKey) || DEFAULT_MODEL_TEXT,
});

export function saveLocalConfig(cfg: LocalConfig) {
  localConfig.value = { ...cfg };
  localStorage.setItem(apiKeyKey, cfg.apiKey);
  localStorage.setItem(apiBaseKey, cfg.baseUrl || DEFAULT_BASE_URL);
  localStorage.setItem(
    apiModelVisionKey,
    cfg.modelVision || DEFAULT_MODEL_VISION,
  );
  localStorage.setItem(apiModelTextKey, cfg.modelText || DEFAULT_MODEL_TEXT);
}

export function clearLocalConfig() {
  localConfig.value = {
    apiKey: "",
    baseUrl: DEFAULT_BASE_URL,
    modelVision: DEFAULT_MODEL_VISION,
    modelText: DEFAULT_MODEL_TEXT,
  };
  [apiKeyKey, apiBaseKey, apiModelVisionKey, apiModelTextKey].forEach((k) =>
    localStorage.removeItem(k),
  );
}

export function requireModel() {
  if (localConfig.value.apiKey.trim()) return true;
  apiKeyDialogOpen.value = true;
  tell("先配置你的模型，再开始讲题");
  return false;
}

export const apiKeyDialogOpen = ref(false);
