<script setup lang="ts">
import {
  ref,
  watch,
  onActivated,
  onDeactivated,
  onUnmounted,
  nextTick,
} from "vue";
import { useRouter } from "vue-router";
import {
  Camera,
  ImagePlus,
  ArrowUpRight,
  ArrowRight,
  BookOpen,
  Focus,
  Check,
  ChevronRight,
} from "lucide-vue-next";
import ImageCropper from "../components/ImageCropper.vue";
import LoadingState from "../components/LoadingState.vue";
import {
  api,
  token,
  chapterNames,
  requireModel,
  legacyServerMode,
} from "../lib/api";
import { cancelModelRequest } from "../lib/model/client";
import { analyzeQuestion } from "../lib/teaching/analysis";
import { saveLocalSession, listLocalSessions } from "../lib/sessions/storage";
import { localSessionDetail } from "../lib/sessions/progress";
import type { LocalSessionState } from "../lib/sessions/types";
import { choosePhoto, photoDataUrl } from "../lib/platform";
import type { SessionDetail } from "../lib/types";
const router = useRouter();
const camera = ref<HTMLInputElement>();
const album = ref<HTMLInputElement>();
const selected = ref<File>();
const busy = ref(false);
const error = ref("");
const history = ref<(SessionDetail & { local?: boolean })[]>([]);
const historyError = ref("");
const historyLoading = ref(Boolean(token.value));
const elapsed = ref(0);
let interval: ReturnType<typeof setInterval> | undefined;
async function choose(event: Event) {
  error.value = "";
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  input.value = "";
  if (!file) return;
  if (!file.type.startsWith("image/")) {
    error.value = "请选择题目的照片";
    return;
  }
  selected.value = file;
  await nextTick();
  document
    .getElementById("upload")
    ?.scrollIntoView({ behavior: "smooth", block: "start" });
}
function openCamera() {
  choosePhoto(camera.value);
}
function openAlbum() {
  choosePhoto(album.value);
}

// 首页缓存保留裁剪草稿；离开时取消识题，过期响应不能抢走当前页面。
let active = true;
let analysisRequest = 0;
function deactivate() {
  active = false;
  ++analysisRequest;
  if (busy.value) cancelModelRequest();
  busy.value = false;
  clearInterval(interval);
}
async function analyze(file: File) {
  if (!requireModel()) return;
  const request = ++analysisRequest;
  const current = () => active && request === analysisRequest;
  busy.value = true;
  error.value = "";
  elapsed.value = 0;
  const timer = setInterval(() => elapsed.value++, 1000);
  interval = timer;
  try {
    const result = await analyzeQuestion(file);
    if (!current()) return;
    const imageDataUrl = await photoDataUrl(file);
    if (!current()) return;
    // 先保存本地笔记，再进入讲题页；刷新或下次打开时可恢复照片与进度。
    const session: LocalSessionState = {
      id: Date.now(), // 本地笔记 ID，不作为服务端会话 ID 使用
      local: true,
      analysis: result,
      imageDataUrl,
      createdAt: new Date().toISOString(),
    };
    await saveLocalSession(session);
    if (!current()) return;
    selected.value = undefined;
    busy.value = false;
    localStorage.setItem("jianghui-last-session", `local:${session.id}`);
    await router.push(`/session/local:${session.id}/insight`);
  } catch (e) {
    if (current()) error.value = (e as Error).message;
  } finally {
    if (current()) busy.value = false;
    clearInterval(timer);
  }
}

let historyRequest = 0;
async function loadHistory() {
  const request = ++historyRequest;
  history.value = [];
  historyError.value = "";
  historyLoading.value = Boolean(token.value);
  try {
    const local = await listLocalSessions();
    if (request === historyRequest)
      history.value = local.slice(0, 3).map(localSessionDetail);
    if (local.length || !token.value || !legacyServerMode()) return;
    const out = await api<{ sessions: SessionDetail[] }>("/history?limit=3");
    if (request === historyRequest) history.value = out.sessions;
  } catch (e) {
    if (request === historyRequest) historyError.value = (e as Error).message;
  } finally {
    if (request === historyRequest) historyLoading.value = false;
  }
}
watch(token, loadHistory);
onActivated(() => {
  active = true;
  loadHistory();
});
onDeactivated(deactivate);
onUnmounted(deactivate);
function resume(s: SessionDetail & { local?: boolean }) {
  router.push(
    `/session/${s.local ? "local:" : ""}${s.id}/${s.status === "DONE" ? "result" : s.teachingCompleted ? "exercise" : s.guide ? "lesson" : "insight"}`,
  );
}
</script>
<template>
  <div
    class="home-page"
    :class="{ 'photo-active': selected, 'has-records': history.length > 0 }"
  >
    <div v-if="!selected && historyLoading" class="home-pending" role="status">
      正在整理你的讲题记录…
    </div>
    <template v-else-if="!selected">
      <div class="workspace-welcome">
        <div>
          <span class="eyebrow">给孩子讲题，也给自己一点把握</span>
          <h1>
            {{ history.length ? "接着上次，继续讲会。" : "今天，讲会一道题。" }}
          </h1>
          <p>
            {{
              history.length
                ? "继续之前的进度，也可以拍一道新题。"
                : "拍下卡住的那一步，我们陪你一起弄明白。"
            }}
          </p>
        </div>
        <span class="welcome-badge"><Check :size="15" />先理解，再讲解</span>
      </div>
      <div class="home-workspace">
        <section class="capture-panel" aria-labelledby="capture-title">
          <div class="capture-visual" aria-hidden="true">
            <div class="scan-frame">
              <svg viewBox="0 0 230 160" fill="none">
                <rect
                  x="49"
                  y="14"
                  width="130"
                  height="134"
                  rx="12"
                  fill="white"
                  stroke="#D5DFF8"
                />
                <rect
                  x="65"
                  y="32"
                  width="52"
                  height="6"
                  rx="3"
                  fill="#B9C8F4"
                />
                <path
                  d="M66 59h78M66 73h57M66 88h67"
                  stroke="#D7DFF1"
                  stroke-width="5"
                  stroke-linecap="round"
                />
                <path
                  d="M32 39V20h20m128 0h19v19M32 124v19h20m128 0h19v-19"
                  stroke="#365AE8"
                  stroke-width="3"
                  stroke-linecap="round"
                />
                <path d="M35 106h160" stroke="#365AE8" stroke-width="2" />
                <rect
                  x="127"
                  y="112"
                  width="67"
                  height="29"
                  rx="14.5"
                  fill="#D9F28C"
                />
                <path
                  d="m147 127 5 5 10-11"
                  stroke="#31441B"
                  stroke-width="2.5"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                />
                <circle cx="19" cy="77" r="5" fill="#B3C8FF" />
                <circle cx="210" cy="60" r="7" fill="#D9F28C" />
              </svg>
            </div>
          </div>
          <div class="capture-copy">
            <span class="capture-kicker"
              ><Focus :size="16" />从眼前这道题开始</span
            >
            <h2 id="capture-title">把不懂的这一步，<br />讲清楚。</h2>
            <p>
              从知识点和需要的基础开始，<br
                class="desktop-break"
              />准备你能读懂、也能讲出来的讲解。
            </p>
            <div class="hero-actions">
              <button class="button primary camera-button" @click="openCamera">
                <Camera :size="20" />拍题，开始讲<ArrowUpRight
                  :size="18"
                /></button
              ><button class="button subtle album-button" @click="openAlbum">
                <ImagePlus :size="18" />从相册选择
              </button>
            </div>
            <span class="capture-note">拍清一道题，保留完整题干和图形。</span>
          </div>
        </section>
        <aside v-if="!history.length" class="workspace-guide">
          <div class="guide-heading">
            <span class="guide-icon"><BookOpen :size="20" /></span>
            <h2>从看懂，到讲会</h2>
          </div>
          <ol class="learning-path">
            <li>
              <span>01</span>
              <div>
                <strong>先把自己讲明白</strong>
                <p>知识点和需要的基础，一起补上。</p>
              </div>
            </li>
            <li>
              <span>02</span>
              <div>
                <strong>跟着讲给孩子听</strong>
                <p>一步一步问，卡住了就换个讲法。</p>
              </div>
            </li>
            <li>
              <span>03</span>
              <div>
                <strong>做一道，检查理解</strong>
                <p>换个条件再试，看看是不是真的会。</p>
              </div>
            </li>
          </ol>
        </aside>
      </div>
      <section v-if="history.length" class="recent-section">
        <div class="section-heading">
          <div>
            <h2>最近讲过</h2>
            <p class="muted">接着上次的进度，或者回顾讲会的题。</p>
          </div>
          <RouterLink to="/history" class="text-link"
            >全部记录<ArrowRight :size="16"
          /></RouterLink>
        </div>
        <div v-if="history.length" class="history-list">
          <button
            v-for="s in history"
            :key="s.id"
            class="history-row"
            :class="{ 'in-progress': s.status !== 'DONE' }"
            @click="resume(s)"
          >
            <span class="history-icon"><BookOpen :size="21" /></span
            ><span class="history-info"
              ><strong>{{
                chapterNames[s.question.chapterId] || "数学讲题"
              }}</strong
              ><span>{{ s.question.keyInsight }}</span></span
            ><span class="history-state">{{
              s.status === "DONE" ? "查看结果" : "继续讲题"
            }}</span
            ><ChevronRight :size="18" />
          </button>
        </div>
      </section>
      <p v-if="historyError" class="home-history-error" role="alert">
        {{ historyError }}
        <button class="text-link" @click="loadHistory">重试记录</button>
      </p>
    </template>
    <input
      ref="camera"
      class="hidden-input"
      type="file"
      accept="image/*"
      capture="environment"
      aria-label="拍摄题目"
      @change="choose"
    /><input
      ref="album"
      class="hidden-input"
      type="file"
      accept="image/*"
      aria-label="从相册选择题目"
      @change="choose"
    />
    <section v-if="selected" class="upload-section" id="upload">
      <LoadingState
        v-if="busy"
        title="先看看，这题在问什么"
        :description="
          elapsed > 8
            ? '这道题需要多看一会儿，请保留页面。'
            : '正在辨认题目条件和关键的一步。'
        "
      /><button v-if="busy" class="button subtle" @click="cancelModelRequest">
        取消分析</button
      ><ImageCropper
        v-else
        :file="selected"
        @cancel="selected = undefined"
        @confirm="analyze"
      />
    </section>
    <p v-if="error" class="error-message standalone" role="alert">
      {{ error }}
    </p>
  </div>
</template>
