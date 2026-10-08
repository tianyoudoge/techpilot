<script setup lang="ts">
import { ref, watch, onUnmounted } from 'vue';
import { token, requireLogin, setToken, safeUrl } from '../lib/api';
const props = defineProps<{ url: string }>();
const source = ref(''), error = ref(''), loading = ref(false);
let version = 0, blobURL = '', controller: AbortController | undefined;
function release() {
  controller?.abort();
  if (blobURL) URL.revokeObjectURL(blobURL);
  blobURL = ''; source.value = '';
}
async function load() {
  const current = ++version;
  release(); error.value = ''; loading.value = false;
  if (!props.url) return;
  if (!props.url.startsWith('/api/v1/images/questions/')) {
    source.value = /^data:image\/(png|jpeg|webp|gif);base64,[a-zA-Z0-9+/=]+$/.test(props.url) ? props.url : safeUrl(props.url);
    return;
  }
  if (!token.value) return;
  const requestToken = token.value;
  const requestController = new AbortController();
  controller = requestController;
  loading.value = true;
  const timer = setTimeout(() => requestController.abort(), 20000);
  try {
    const response = await fetch(props.url, { headers: { Authorization: `Bearer ${requestToken}` }, signal: requestController.signal });
    if (current !== version || requestToken !== token.value) return;
    if (response.status === 401) { setToken(''); requireLogin(); throw new Error('请重新登录后查看照片'); }
    if (!response.ok || !response.headers.get('content-type')?.startsWith('image/')) throw new Error('照片暂时没有打开，请重试');
    const blob = await response.blob();
    if (current !== version || requestToken !== token.value) return;
    blobURL = URL.createObjectURL(blob); source.value = blobURL;
  } catch (e) {
    if (current === version && requestToken === token.value) error.value = e instanceof Error && e.name !== 'AbortError' ? e.message : '照片加载超时，请重试';
  } finally { clearTimeout(timer); if (current === version) loading.value = false; }
}
watch(() => [props.url, token.value], load, { immediate: true });
onUnmounted(() => { version++; release(); });
</script>
<template>
  <img v-if="source" :src="source" alt="上传的原题照片" @error="error = '照片暂时没有打开，请重试'; source = ''" />
  <p v-else-if="loading" class="small muted" role="status">正在读取原题照片…</p>
  <div v-if="error" class="photo-load-error" role="alert"><p>{{ error }}</p><button class="button subtle" @click="load">重试照片</button></div>
</template>
