<script setup lang="ts">
import { ref, onMounted, watch } from "vue";
import { useRouter } from "vue-router";
import { ArrowLeft, BookOpen, ChevronRight } from "lucide-vue-next";
import { api, token, chapterNames, legacyServerMode } from "../lib/api";
import { listLocalSessions } from "../lib/sessions/storage";
import { localSessionDetail } from "../lib/sessions/progress";
import type { SessionDetail } from "../lib/types";
import LoadingState from "../components/LoadingState.vue";
const router = useRouter(),
  items = ref<(SessionDetail & { local?: boolean })[]>([]),
  busy = ref(false),
  error = ref("");
async function load() {
  busy.value = true;
  error.value = "";
  try {
    const local = await listLocalSessions();
    if (local.length || !token.value || !legacyServerMode()) {
      items.value = local.map(localSessionDetail);
      return;
    }
    items.value = (
      await api<{ sessions: SessionDetail[] }>("/history?limit=100")
    ).sessions;
  } catch (e) {
    error.value = (e as Error).message;
  } finally {
    busy.value = false;
  }
}
watch(token, load);
onMounted(load);
function date(value: string) {
  return new Date(value).toLocaleDateString("zh-CN", {
    month: "long",
    day: "numeric",
  });
}
</script>
<template>
  <div class="flow-page">
    <RouterLink to="/" class="back-link"
      ><ArrowLeft :size="17" />回到首页</RouterLink
    ><span class="eyebrow">慢慢来，每次讲会一点</span>
    <h1 class="page-title">讲过的题，都在这里。</h1>
    <LoadingState v-if="busy" title="正在整理讲题记录" />
    <div v-else-if="error" class="error-card" role="alert">
      <p>{{ error }}</p>
      <button class="button subtle" @click="load">重新加载</button>
    </div>
    <div v-else-if="items.length" class="history-list">
      <button
        v-for="s in items"
        :key="s.id"
        class="history-row"
        @click="
          router.push(
            `/session/${s.local ? 'local:' : ''}${s.id}/${s.status === 'DONE' ? 'result' : s.teachingCompleted ? 'exercise' : s.guide ? 'lesson' : 'insight'}`,
          )
        "
      >
        <span class="history-icon"><BookOpen :size="22" /></span
        ><span class="history-info"
          ><strong
            >{{ chapterNames[s.question.chapterId] || "数学" }} ·
            {{ date(s.createdAt) }}</strong
          ><span>{{
            s.question.keyInsight || s.question.questionText
          }}</span></span
        ><span class="history-state">{{
          s.status === "DONE" ? "已完成" : "继续讲"
        }}</span
        ><ChevronRight :size="18" />
      </button>
    </div>
    <div v-else class="empty-card">
      <BookOpen :size="34" />
      <h2>第一份讲会笔记，等你开始。</h2>
      <p class="muted">拍下孩子不会的一道题，记录就会出现在这里。</p>
      <button class="button primary" @click="router.push('/')">
        去拍一道题
      </button>
    </div>
  </div>
</template>
