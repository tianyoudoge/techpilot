<template>
  <Teleport to="body">
    <div v-if="open" class="key-dialog-backdrop" @click.self="close">
      <div class="key-dialog" role="dialog" aria-labelledby="key-dialog-title">
        <h2 id="key-dialog-title" class="key-dialog-title">配置模型</h2>
        <div class="provider-tabs" role="tablist" aria-label="模型供应商">
          <button
            v-for="item in modelProviders"
            :key="item.id"
            type="button"
            role="tab"
            :aria-selected="providerId === item.id"
            :class="{ selected: providerId === item.id }"
            @click="chooseProvider(item.id)"
          >
            {{ item.name }}
          </button>
        </div>
        <label class="key-dialog-label" for="model-input">模型</label>
        <select id="model-input" v-model="model" class="key-dialog-input">
          <option v-for="name in availableModels" :key="name" :value="name">
            {{ name }}
          </option>
        </select>
        <label class="key-dialog-label" for="api-key-input">API Key</label>
        <input
          id="api-key-input"
          v-model="form.apiKey"
          type="password"
          class="key-dialog-input"
          placeholder="粘贴供应商的 API Key"
          autocomplete="off"
          spellcheck="false"
        />
        <p v-if="provider" class="key-help">
          在供应商控制台创建并复制密钥。<a
            :href="provider.keyUrl"
            target="_blank"
            rel="noopener noreferrer"
            @click.prevent="getKey"
            >获取 API Key ↗</a
          >
        </p>
        <p v-if="error" role="alert" class="error-message">{{ error }}</p>
        <div class="key-dialog-actions">
          <button
            v-if="hasSaved"
            class="key-dialog-btn key-dialog-btn--secondary"
            type="button"
            @click="handleClear"
          >
            清除 Key
          </button>
          <button
            class="key-dialog-btn key-dialog-btn--secondary"
            type="button"
            @click="close"
          >
            取消
          </button>
          <button
            class="key-dialog-btn key-dialog-btn--primary"
            type="button"
            @click="handleSave"
            :disabled="!form.apiKey.trim() || !model.trim()"
          >
            保存
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { reactive, computed, watch, ref } from "vue";
import {
  localConfig,
  saveLocalConfig,
  clearLocalConfig,
} from "../lib/model-config";
import { modelProviders } from "../lib/model-providers";
import { openExternal } from "../lib/platform";
import { invalidateAssets, flushAssetOutbox } from "../lib/assets";
const props = defineProps<{ open: boolean }>();
const emit = defineEmits<{ (e: "close"): void }>();
const providerId = ref("deepseek");
const provider = computed(() =>
  modelProviders.find((p) => p.id === providerId.value),
);
const model = ref("");
const form = reactive({ apiKey: "", baseUrl: "" });
const error = ref("");
const drafts = new Map<
  string,
  { apiKey: string; baseUrl: string; model: string }
>();
const availableModels = computed(() => provider.value?.models ?? []);
function chooseProvider(id: string) {
  if (id === providerId.value) return;
  drafts.set(providerId.value, { ...form, model: model.value });
  providerId.value = id;
  const saved = drafts.get(id);
  // 每个供应商有自己的草稿；切换时不能把上一家的 Key 发给另一家。
  form.apiKey = saved?.apiKey ?? "";
  form.baseUrl = saved?.baseUrl ?? provider.value?.baseUrl ?? "";
  model.value = saved?.model ?? provider.value?.models[0] ?? "";
  error.value = "";
}
watch(
  () => props.open,
  (open) => {
    if (!open) return;
    drafts.clear();
    error.value = "";
    const cfg = localConfig.value;
    const existing = modelProviders.find(
      (p) =>
        p.baseUrl === cfg.baseUrl.replace(/\/+$/, "") ||
        (p.id === "deepseek" &&
          cfg.baseUrl.replace(/\/+$/, "") === "https://api.deepseek.com/v1"),
    );
    providerId.value = existing?.id ?? "deepseek";
    form.apiKey = existing ? cfg.apiKey : "";
    form.baseUrl = provider.value!.baseUrl;
    model.value = provider.value!.models.includes(cfg.modelVision)
      ? cfg.modelVision
      : provider.value!.models[0];
  },
  { immediate: true },
);
const hasSaved = computed(() => !!localConfig.value.apiKey);
function close() {
  drafts.clear();
  emit("close");
}
async function getKey() {
  if (provider.value)
    try {
      await openExternal(provider.value.keyUrl);
    } catch {
      error.value = "无法打开，请稍后再试";
    }
}
function handleSave() {
  try {
    const url = new URL(form.baseUrl);
    if (
      !["https:", "http:"].includes(url.protocol) ||
      url.username ||
      url.password ||
      url.search ||
      url.hash ||
      !model.value.trim()
    )
      throw new Error("请检查接口地址和模型");
    saveLocalConfig({
      apiKey: form.apiKey.trim(),
      baseUrl: form.baseUrl.trim().replace(/\/+$/, ""),
      modelVision: model.value.trim(),
      modelText: model.value.trim(),
    });
    invalidateAssets();
    void flushAssetOutbox(true);
    close();
  } catch (e) {
    error.value = (e as Error).message;
  }
}
function handleClear() {
  clearLocalConfig();
  form.apiKey = "";
  close();
}
</script>

<style scoped>
.key-dialog-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  z-index: 200;
  display: flex;
  align-items: flex-end;
  justify-content: center;
  padding: 0;
}

@media (min-width: 480px) {
  .key-dialog-backdrop {
    align-items: center;
    padding: 16px;
  }
}

.key-dialog {
  background: var(--color-surface, #fff);
  border-radius: 16px 16px 0 0;
  padding: 24px 20px 32px;
  width: 100%;
  max-width: 480px;
  max-height: 90dvh;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

@media (min-width: 480px) {
  .key-dialog {
    border-radius: 16px;
  }
}

.key-dialog-title {
  font-size: 1.125rem;
  font-weight: 600;
  margin: 0;
}

.key-dialog-label {
  font-size: 0.8125rem;
  font-weight: 500;
  display: block;
}

.key-dialog-input {
  width: 100%;
  box-sizing: border-box;
  padding: 10px 12px;
  border: 1px solid var(--color-border, #ddd);
  border-radius: 8px;
  font-size: 0.9375rem;
  font-family: monospace;
  background: var(--color-surface, #fff);
  color: var(--color-text, #111);
  outline: none;
}

.key-dialog-input:focus {
  border-color: var(--color-accent, #0066cc);
  box-shadow: 0 0 0 3px
    color-mix(in srgb, var(--color-accent, #0066cc) 20%, transparent);
}

.key-dialog-actions {
  display: flex;
  gap: 8px;
  justify-content: flex-end;
  margin-top: 4px;
}

.key-dialog-btn {
  padding: 10px 18px;
  border-radius: 8px;
  font-size: 0.9375rem;
  font-weight: 500;
  cursor: pointer;
  border: none;
  min-height: 44px;
}

.key-dialog-btn--secondary {
  background: var(--color-surface-raised, #f0f0f0);
  color: var(--color-text, #111);
}

.key-dialog-btn--primary {
  background: var(--color-accent, #0066cc);
  color: #fff;
}

.key-dialog-btn--primary:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.key-dialog-btn:focus-visible {
  outline: 3px solid var(--color-accent, #0066cc);
  outline-offset: 2px;
}

.provider-tabs {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
}
.provider-tabs button {
  min-height: 44px;
  padding: 8px 10px;
  border: 1px solid var(--border);
  border-radius: 10px;
  color: var(--muted);
}
.provider-tabs button.selected {
  color: var(--primary);
  background: var(--primary-soft);
  border-color: var(--primary);
  font-weight: 650;
}
.key-dialog {
  padding-bottom: calc(24px + env(safe-area-inset-bottom));
}
.key-help {
  margin: 0;
  font-size: 12px;
  color: var(--muted);
}
.key-help a {
  color: var(--primary);
}
.key-dialog-input {
  font-family: inherit;
}
.key-dialog-btn--primary {
  background: var(--primary);
}
</style>
