<script setup lang="ts">
import { ref, watch, onUnmounted, nextTick } from "vue";
import BrandMark from "./BrandMark.vue";
import { X, ArrowRight } from "lucide-vue-next";
import { loginOpen, post, setToken } from "../lib/api";
const phone = ref(""),
  code = ref(""),
  error = ref(""),
  busy = ref(false),
  seconds = ref(0),
  phoneInput = ref<HTMLInputElement>(),
  dialog = ref<HTMLElement>();
let timer: ReturnType<typeof setInterval> | undefined;
const viewportHeight = ref(window.visualViewport?.height || window.innerHeight),
  viewportTop = ref(0);
let previousOverflow = "",
  previousFocus: HTMLElement | null = null,
  locked = false;
function updateViewport() {
  viewportHeight.value = window.visualViewport?.height || window.innerHeight;
  viewportTop.value = window.visualViewport?.offsetTop || 0;
}
function releaseDialog() {
  window.visualViewport?.removeEventListener("resize", updateViewport);
  window.visualViewport?.removeEventListener("scroll", updateViewport);
  window.removeEventListener("resize", updateViewport);
  if (locked) document.body.style.overflow = previousOverflow;
  locked = false;
}
watch(loginOpen, async (value) => {
  if (value) {
    error.value = "";
    previousFocus = document.activeElement as HTMLElement;
    previousOverflow = document.body.style.overflow;
    locked = true;
    document.body.style.overflow = "hidden";
    updateViewport();
    window.visualViewport?.addEventListener("resize", updateViewport);
    window.visualViewport?.addEventListener("scroll", updateViewport);
    window.addEventListener("resize", updateViewport);
    await nextTick();
    phoneInput.value?.focus({ preventScroll: true });
  } else {
    releaseDialog();
    await nextTick();
    previousFocus?.focus({ preventScroll: true });
  }
});
onUnmounted(() => {
  clearInterval(timer);
  releaseDialog();
});
function trapFocus(event: KeyboardEvent) {
  if (event.key !== "Tab") return;
  const items = dialog.value?.querySelectorAll<HTMLElement>(
    "button:not(:disabled),input:not(:disabled)",
  );
  if (!items?.length) return;
  const first = items[0],
    last = items[items.length - 1];
  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault();
    last.focus();
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault();
    first.focus();
  }
}
async function send() {
  error.value = "";
  if (!/^1\d{10}$/.test(phone.value)) {
    error.value = "请填写11位手机号码";
    return;
  }
  busy.value = true;
  try {
    await post("/auth/send-code", { phone: phone.value });
    seconds.value = 60;
    timer = setInterval(() => {
      seconds.value--;
      if (!seconds.value) clearInterval(timer);
    }, 1000);
  } catch (e) {
    error.value = (e as Error).message;
  } finally {
    busy.value = false;
  }
}
async function login() {
  error.value = "";
  if (!/^1\d{10}$/.test(phone.value) || !/^\d{6}$/.test(code.value)) {
    error.value = "请填写手机号码和6位验证码";
    return;
  }
  busy.value = true;
  try {
    const out = await post<{ token: string }>("/auth/verify", {
      phone: phone.value,
      code: code.value,
    });
    setToken(out.token);
    loginOpen.value = false;
    code.value = "";
  } catch (e) {
    error.value = (e as Error).message;
  } finally {
    busy.value = false;
  }
}
</script>
<template>
  <Teleport to="body"
    ><div
      v-if="loginOpen"
      class="modal-backdrop"
      :style="{
        height: `${viewportHeight}px`,
        top: `${viewportTop}px`,
        bottom: 'auto',
      }"
      @click.self="loginOpen = false"
      @keydown.esc="loginOpen = false"
    >
      <section
        ref="dialog"
        @keydown="trapFocus"
        class="login-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="login-title"
      >
        <button
          class="icon-button close"
          aria-label="关闭登录"
          @click="loginOpen = false"
        >
          <X /></button
        ><BrandMark class="login-brand" /><span class="eyebrow"
          >留住每一次讲会的进步</span
        >
        <h2 id="login-title">登录后，接着讲。</h2>
        <p class="muted">讲题记录会保存在你的账号里。</p>
        <form @submit.prevent="login">
          <label for="phone">手机号码</label
          ><input
            id="phone"
            ref="phoneInput"
            v-model="phone"
            type="tel"
            inputmode="numeric"
            autocomplete="tel"
            maxlength="11"
            placeholder="请输入手机号码"
          /><label for="code">验证码</label>
          <div class="code-field">
            <input
              id="code"
              v-model="code"
              inputmode="numeric"
              autocomplete="one-time-code"
              maxlength="6"
              placeholder="6位验证码"
            /><button
              type="button"
              class="text-button"
              :disabled="busy || seconds > 0"
              @click="send"
            >
              {{ seconds ? `${seconds}秒后重发` : "获取验证码" }}
            </button>
          </div>
          <p v-if="error" class="error-message" role="alert">{{ error }}</p>
          <button class="button primary full" :disabled="busy">
            {{ busy ? "正在登录…" : "登录并继续" }}<ArrowRight :size="18" />
          </button>
          <p class="small muted">当前为内测，验证码请使用 888888。</p>
        </form>
      </section>
    </div></Teleport
  >
</template>
