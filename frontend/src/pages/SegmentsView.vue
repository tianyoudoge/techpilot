<template>
  <div class="segments-page">
    <header class="page-header">
      <h1>📚 视频片段浏览</h1>
      <p>选择章节查看相关的教学视频片段</p>
    </header>

    <!-- 章节选择 -->
    <div class="chapter-filter">
      <label>选择章节：</label>
      <select v-model="selectedChapter" @change="loadSegments">
        <option value="">全部章节</option>
        <option v-for="(name, id) in chapterNames" :key="id" :value="id">
          {{ name }}
        </option>
      </select>
      <span class="count">共 {{ segments.length }} 个片段</span>
    </div>

    <!-- 加载状态 -->
    <div v-if="loading" class="loading">
      <div class="spinner"></div>
      <p>加载中...</p>
    </div>

    <!-- 片段列表 -->
    <div v-else-if="segments.length > 0" class="segments-grid">
      <SegmentCard
        v-for="segment in segments"
        :key="segment.id"
        :segment="segment"
        @play="openPlayer"
      />
    </div>

    <!-- 空状态 -->
    <div v-else class="empty-state">
      <div class="icon">📹</div>
      <p>暂无视频片段</p>
    </div>

    <!-- 视频播放器弹窗 -->
    <div v-if="currentSegment" class="player-modal" @click.self="closePlayer">
      <div class="modal-content">
        <button class="close-btn" @click="closePlayer">✕</button>
        <VideoPlayer :segment="currentSegment" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { chapterNames } from '../lib/api';
import { getVideoSegments, preloadDatabase } from '../lib/api-client';
import type { VideoSegment } from '../lib/types';
import SegmentCard from '../components/SegmentCard.vue';
import VideoPlayer from '../components/VideoPlayer.vue';

const selectedChapter = ref('');
const segments = ref<VideoSegment[]>([]);
const loading = ref(false);
const currentSegment = ref<VideoSegment | null>(null);

async function loadSegments() {
  loading.value = true;
  try {
    segments.value = await getVideoSegments({
      chapter: selectedChapter.value || undefined,
      limit: 50,
    });
  } catch (error) {
    console.error('加载片段失败:', error);
    segments.value = [];
  } finally {
    loading.value = false;
  }
}

function openPlayer(segment: VideoSegment) {
  currentSegment.value = segment;
  document.body.style.overflow = 'hidden'; // 禁止背景滚动
}

function closePlayer() {
  currentSegment.value = null;
  document.body.style.overflow = ''; // 恢复滚动
}

onMounted(() => {
  loadSegments();
});
</script>

<style scoped>
.segments-page {
  max-width: 1200px;
  margin: 0 auto;
  padding: 2rem 1rem;
}

.page-header {
  text-align: center;
  margin-bottom: 2rem;
}

.page-header h1 {
  margin: 0 0 0.5rem 0;
  font-size: 2rem;
  color: #212529;
}

.page-header p {
  margin: 0;
  color: #6c757d;
  font-size: 1rem;
}

.chapter-filter {
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-bottom: 2rem;
  padding: 1rem;
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.chapter-filter label {
  font-weight: 600;
  color: #495057;
}

.chapter-filter select {
  padding: 0.5rem 1rem;
  border: 1px solid #ced4da;
  border-radius: 6px;
  font-size: 0.95rem;
  background: white;
  cursor: pointer;
  min-width: 200px;
}

.chapter-filter select:focus {
  outline: none;
  border-color: #667eea;
}

.chapter-filter .count {
  margin-left: auto;
  color: #6c757d;
  font-size: 0.9rem;
}

.loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 4rem 2rem;
  color: #6c757d;
}

.spinner {
  width: 40px;
  height: 40px;
  border: 4px solid #e9ecef;
  border-top-color: #667eea;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.segments-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 1.5rem;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 4rem 2rem;
  color: #6c757d;
}

.empty-state .icon {
  font-size: 4rem;
  margin-bottom: 1rem;
  opacity: 0.5;
}

.empty-state p {
  margin: 0;
  font-size: 1.1rem;
}

.player-modal {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.8);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 1rem;
  overflow-y: auto;
}

.modal-content {
  position: relative;
  width: 100%;
  max-width: 900px;
  max-height: 90vh;
  overflow-y: auto;
  border-radius: 12px;
  background: white;
}

.close-btn {
  position: absolute;
  top: 1rem;
  right: 1rem;
  width: 36px;
  height: 36px;
  border: none;
  background: rgba(0, 0, 0, 0.5);
  color: white;
  font-size: 1.5rem;
  border-radius: 50%;
  cursor: pointer;
  z-index: 10;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.2s;
}

.close-btn:hover {
  background: rgba(0, 0, 0, 0.7);
}

@media (max-width: 768px) {
  .segments-page {
    padding: 1rem 0.5rem;
  }

  .page-header h1 {
    font-size: 1.5rem;
  }

  .chapter-filter {
    flex-direction: column;
    align-items: stretch;
  }

  .chapter-filter select {
    width: 100%;
  }

  .chapter-filter .count {
    margin-left: 0;
    text-align: center;
  }

  .segments-grid {
    grid-template-columns: 1fr;
    gap: 1rem;
  }

  .modal-content {
    max-width: 100%;
    max-height: 100vh;
    border-radius: 0;
  }
}
</style>
