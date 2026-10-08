<script setup lang="ts">
import { computed, onMounted, onUnmounted } from "vue";
import { RouterView, useRoute } from "vue-router";
import {
  Camera,
  History,
  LogIn,
  LogOut,
  Key,
  RotateCcw,
} from "lucide-vue-next";
import BrandMark from "./components/BrandMark.vue";
import LoginDialog from "./components/LoginDialog.vue";
import ApiKeyDialog from "./components/ApiKeyDialog.vue";
import {
  token,
  loginOpen,
  notice,
  setToken,
  tell,
  apiKeyDialogOpen,
  localConfig,
  legacyServerMode,
} from "./lib/api";
import {
  startAssetSync,
  assetSync,
  flushAssetOutbox,
  loadAssetBundle,
} from "./lib/assets";
import { nativePlatform, openExternal } from "./lib/platform";
// iPad WebViews can identify as Macintosh, so exclude touch devices.
const nativeMac =
  nativePlatform() &&
  /Macintosh|MacIntel/.test(navigator.userAgent + navigator.platform) &&
  navigator.maxTouchPoints === 0;
let stopSync: (() => void) | undefined;
function openModelSettings(event: MouseEvent) {
  // Safari does not focus a button on pointer click; retain an explicit return target.
  (event.currentTarget as HTMLElement).focus({ preventScroll: true });
  apiKeyDialogOpen.value = true;
}
function externalLink(event: MouseEvent) {
  // A component may already handle this link (for example the model settings dialog).
  if (event.defaultPrevented || !nativePlatform()) return;
  const anchor = (event.target as Element)?.closest?.("a[href]");
  if (
    anchor instanceof HTMLAnchorElement &&
    /^https?:/.test(anchor.href) &&
    anchor.target === "_blank"
  ) {
    event.preventDefault();
    void openExternal(anchor.href).catch((e) => tell((e as Error).message));
  }
}
onMounted(() => {
  stopSync = startAssetSync();
  // 启动时校验版本，不阻塞首页；失败时由后续业务读取显示错误并允许重试。
  void loadAssetBundle().catch(() => {});
  document.addEventListener("click", externalLink);
});
onUnmounted(() => {
  stopSync?.();
  document.removeEventListener("click", externalLink);
});
const route = useRoute();
const isSession = computed(() => route.path.startsWith("/session/"));
const sectionName = computed(() =>
  isSession.value
    ? "讲题笔记"
    : route.path === "/history"
      ? "讲题记录"
      : "讲题工作台",
);
function logout() {
  setToken("");
  tell("已退出登录");
}
</script>
<template>
  <div
    class="app-shell"
    :class="{ 'is-session': isSession, 'native-macos': nativeMac }"
    :inert="loginOpen || apiKeyDialogOpen"
  >
    <aside class="app-sidebar">
      <div
        v-if="nativeMac"
        class="sidebar-window-drag"
        data-tauri-drag-region
        aria-hidden="true"
      />
      <RouterLink to="/" class="brand" aria-label="讲会首页"
        ><BrandMark /><span
          >讲会<span class="brand-caption">家长讲题助手</span></span
        ></RouterLink
      >
      <span class="sidebar-label">我的学习空间</span>
      <nav class="sidebar-nav" aria-label="主导航">
        <RouterLink to="/" :class="{ active: route.path === '/' || isSession }"
          ><Camera :size="20" />拍题讲解<span class="nav-indicator"
        /></RouterLink>
        <RouterLink to="/history" :class="{ active: route.path === '/history' }"
          ><History :size="20" />讲题记录</RouterLink
        >
      </nav>
    </aside>
    <div class="app-frame">
      <header
        class="site-header"
        :data-tauri-drag-region="nativeMac ? '' : undefined"
      >
        <RouterLink to="/" class="brand mobile-brand" aria-label="讲会首页"
          ><BrandMark /><span>讲会</span></RouterLink
        >
        <div
          class="workspace-title"
          :data-tauri-drag-region="nativeMac ? '' : undefined"
        >
          <span
            class="workspace-dot"
            :data-tauri-drag-region="nativeMac ? '' : undefined"
          />{{ sectionName }}
        </div>
        <div class="header-actions">
          <button
            v-if="assetSync.pending"
            class="nav-link"
            type="button"
            @click="flushAssetOutbox(true)"
            :disabled="assetSync.syncing"
            :aria-label="`${assetSync.pending}份内容待同步，点击重试`"
            :title="assetSync.error || '已保存在本机，点击重试同步'"
          >
            <RotateCcw :size="16" /><span>{{ assetSync.pending }}</span>
          </button>
          <span class="subject-chip header-subject">数学讲题</span
          ><button
            class="nav-link"
            :class="{ 'key-active': !!localConfig.apiKey }"
            @click="openModelSettings"
            :title="localConfig.apiKey ? '模型已配置' : '配置模型'"
            :aria-label="
              localConfig.apiKey ? '本地模式已开启，点击修改' : '配置 API Key'
            "
          >
            <Key :size="16" /><span class="key-label">{{
              localConfig.apiKey ? "模型设置" : "配置模型"
            }}</span></button
          ><button
            v-if="legacyServerMode() && !token"
            class="nav-link"
            @click="loginOpen = true"
          >
            <LogIn :size="16" />登录</button
          ><button
            v-else-if="legacyServerMode()"
            class="nav-link quiet"
            @click="logout"
          >
            <LogOut :size="16" />退出
          </button>
        </div>
      </header>
      <main id="main">
        <RouterView v-slot="{ Component }"
          ><Transition name="view" mode="out-in"
            ><KeepAlive include="Home"
              ><component :is="Component" /></KeepAlive></Transition
        ></RouterView>
      </main>
      <nav v-if="!isSession" class="mobile-app-nav" aria-label="应用导航">
        <RouterLink
          to="/"
          :class="{ active: route.path === '/' }"
          :aria-current="route.path === '/' ? 'page' : undefined"
          ><Camera :size="22" /><span>拍题讲解</span></RouterLink
        ><RouterLink
          to="/history"
          :class="{ active: route.path === '/history' }"
          :aria-current="route.path === '/history' ? 'page' : undefined"
          ><History :size="22" /><span>讲题记录</span></RouterLink
        >
      </nav>
    </div>
  </div>
  <LoginDialog />
  <ApiKeyDialog :open="apiKeyDialogOpen" @close="apiKeyDialogOpen = false" />
  <div v-if="notice" class="toast" role="status">{{ notice }}</div>
</template>
