<template>
  <div class="video-player">
    <div class="player-container">
      <!-- PC端：内嵌 iframe -->
      <div v-if="!isMobile" class="iframe-wrapper">
        <iframe
          :src="embedUrl"
          width="100%"
          height="500"
          scrolling="no"
          border="0"
          frameborder="0"
          allowfullscreen
        />
      </div>

      <!-- 移动端：显示跳转按钮 -->
      <div v-else class="mobile-placeholder">
        <div class="placeholder-content">
          <div class="icon">📱</div>
          <h3>点击下方按钮在 Bilibili 中播放</h3>
          <p>将自动跳转到 {{ formatTime(segment.startTime) }} 开始播放</p>
        </div>
      </div>
    </div>

    <!-- 片段信息 -->
    <div class="segment-info">
      <div class="info-row">
        <span class="label">视频标题：</span>
        <span class="value">{{ segment.video.title }}</span>
      </div>
      <div class="info-row">
        <span class="label">片段时长：</span>
        <span class="value">{{ duration }} 秒</span>
      </div>
      <div class="info-row">
        <span class="label">播放范围：</span>
        <span class="value">
          {{ formatTime(segment.startTime) }} - {{ formatTime(segment.endTime) }}
        </span>
      </div>
    </div>

    <!-- 操作按钮 -->
    <div class="actions">
      <button v-if="!isMobile" @click="replaySegment" class="btn btn-primary">
        ▶️ 重新播放
      </button>
      <button v-else @click="openInBilibili" class="btn btn-primary btn-large">
        📱 在 Bilibili 中打开
      </button>
      <button @click="openInNewTab" class="btn btn-secondary">
        🔗 新窗口打开
      </button>
    </div>

    <!-- 片段摘要 -->
    <div v-if="segment.summary" class="segment-summary">
      <h4>📝 片段摘要</h4>
      <p>{{ segment.summary }}</p>
    </div>

    <!-- 转录文本 -->
    <div v-if="segment.transcript && showTranscript" class="segment-transcript">
      <h4>📄 讲稿内容</h4>
      <p>{{ segment.transcript }}</p>
    </div>
    <button
      v-if="segment.transcript"
      @click="showTranscript = !showTranscript"
      class="btn btn-text"
    >
      {{ showTranscript ? '收起讲稿' : '查看讲稿' }}
    </button>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import type { VideoSegment } from '../lib/types';
import { openExternal } from '../lib/platform';
import { tell } from '../lib/ui-state';

const props = defineProps<{
  segment: VideoSegment;
}>();

const showTranscript = ref(false);

// 检测是否移动端
const isMobile = computed(() => {
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
    navigator.userAgent
  );
});

// 计算时长
const duration = computed(() => {
  return props.segment.endTime - props.segment.startTime;
});

// 构造嵌入播放器 URL
const embedUrl = computed(() => {
  const { bvid, page = 1 } = props.segment.video;
  const { startTime } = props.segment;
  return `https://player.bilibili.com/player.html?bvid=${bvid}&page=${page}&t=${startTime}&autoplay=1&high_quality=1`;
});

// 构造网页播放 URL
const webUrl = computed(() => {
  const { bvid, page = 1 } = props.segment.video;
  const { startTime } = props.segment;
  return `https://www.bilibili.com/video/${bvid}?p=${page}&t=${startTime}`;
});

// 格式化时间
function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

// 重新播放片段
function replaySegment() {
  const iframe = document.querySelector('.iframe-wrapper iframe') as HTMLIFrameElement;
  if (iframe) {
    iframe.src = embedUrl.value;
  }
}

// Use a universal HTTPS link: the OS can open the supported app or the browser,
// while the current lesson and application WebView remain intact.
async function openInBilibili() {
  try { await openExternal(webUrl.value); }
  catch { tell('暂时无法打开视频，请稍后再试'); }
}
const openInNewTab = openInBilibili;
</script>

<style scoped>
.video-player {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  padding: 1rem;
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.player-container {
  width: 100%;
  background: #000;
  border-radius: 8px;
  overflow: hidden;
}

.iframe-wrapper {
  position: relative;
  width: 100%;
  padding-bottom: 56.25%; /* 16:9 aspect ratio */
  height: 0;
}

.iframe-wrapper iframe {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
}

.mobile-placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 300px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  text-align: center;
  padding: 2rem;
}

.placeholder-content .icon {
  font-size: 4rem;
  margin-bottom: 1rem;
}

.placeholder-content h3 {
  margin: 0 0 0.5rem 0;
  font-size: 1.25rem;
}

.placeholder-content p {
  margin: 0;
  opacity: 0.9;
  font-size: 0.95rem;
}

.segment-info {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  padding: 1rem;
  background: #f8f9fa;
  border-radius: 6px;
}

.info-row {
  display: flex;
  gap: 0.5rem;
}

.info-row .label {
  font-weight: 600;
  color: #495057;
  min-width: 90px;
}

.info-row .value {
  color: #212529;
}

.actions {
  display: flex;
  gap: 0.75rem;
  flex-wrap: wrap;
}

.btn {
  padding: 0.5rem 1rem;
  border: none;
  border-radius: 6px;
  font-size: 0.95rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-primary {
  background: #667eea;
  color: white;
}

.btn-primary:hover {
  background: #5568d3;
}

.btn-primary.btn-large {
  padding: 0.75rem 1.5rem;
  font-size: 1.1rem;
  width: 100%;
}

.btn-secondary {
  background: white;
  color: #667eea;
  border: 1px solid #667eea;
}

.btn-secondary:hover {
  background: #f8f9fa;
}

.btn-text {
  background: transparent;
  color: #667eea;
  padding: 0.5rem;
  text-decoration: underline;
}

.btn-text:hover {
  color: #5568d3;
}

.segment-summary,
.segment-transcript {
  padding: 1rem;
  background: #f8f9fa;
  border-radius: 6px;
}

.segment-summary h4,
.segment-transcript h4 {
  margin: 0 0 0.75rem 0;
  font-size: 1rem;
  color: #495057;
}

.segment-summary p,
.segment-transcript p {
  margin: 0;
  line-height: 1.6;
  color: #212529;
}

@media (max-width: 768px) {
  .video-player {
    padding: 0.75rem;
  }

  .iframe-wrapper {
    padding-bottom: 75%; /* Taller aspect ratio for mobile */
  }

  .info-row {
    flex-direction: column;
    gap: 0.25rem;
  }

  .info-row .label {
    min-width: auto;
  }
}
</style>
