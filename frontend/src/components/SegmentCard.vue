<template>
  <div class="segment-card" @click="$emit('play', segment)">
    <div class="card-content">
      <!-- 封面或占位图 -->
      <div class="thumbnail">
        <div class="play-overlay">
          <div class="play-icon">▶️</div>
        </div>
        <div class="duration-badge">
          {{ formatDuration(segment.endTime - segment.startTime) }}
        </div>
      </div>

      <!-- 片段信息 -->
      <div class="info">
        <h3 class="title">{{ segment.video.title }}</h3>

        <div class="meta">
          <span class="time">
            ⏱️ {{ formatTime(segment.startTime) }} - {{ formatTime(segment.endTime) }}
          </span>
        </div>

        <p v-if="segment.summary" class="summary">
          {{ truncate(segment.summary, 80) }}
        </p>

        <!-- 标签 -->
        <div class="tags">
          <span v-if="segment.difficulty" class="tag difficulty">
            难度 {{ segment.difficulty }}
          </span>
          <span v-for="tag in segment.style.slice(0, 2)" :key="tag" class="tag">
            {{ tag }}
          </span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { VideoSegment } from '../lib/types';

defineProps<{
  segment: VideoSegment;
}>();

defineEmits<{
  play: [segment: VideoSegment];
}>();

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

function formatDuration(seconds: number): string {
  if (seconds < 60) {
    return `${seconds}秒`;
  }
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return secs > 0 ? `${mins}分${secs}秒` : `${mins}分`;
}

function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + '...';
}
</script>

<style scoped>
.segment-card {
  background: white;
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  cursor: pointer;
  transition: all 0.3s;
}

.segment-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
}

.card-content {
  display: flex;
  flex-direction: column;
}

.thumbnail {
  position: relative;
  width: 100%;
  padding-bottom: 56.25%; /* 16:9 */
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  overflow: hidden;
}

.play-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.3);
  transition: background 0.3s;
}

.segment-card:hover .play-overlay {
  background: rgba(0, 0, 0, 0.5);
}

.play-icon {
  font-size: 3rem;
  opacity: 0.9;
  transition: transform 0.3s;
}

.segment-card:hover .play-icon {
  transform: scale(1.2);
}

.duration-badge {
  position: absolute;
  bottom: 8px;
  right: 8px;
  background: rgba(0, 0, 0, 0.8);
  color: white;
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 0.85rem;
  font-weight: 500;
}

.info {
  padding: 1rem;
}

.title {
  margin: 0 0 0.5rem 0;
  font-size: 1rem;
  font-weight: 600;
  color: #212529;
  line-height: 1.4;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}

.meta {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.5rem;
  font-size: 0.85rem;
  color: #6c757d;
}

.summary {
  margin: 0.5rem 0;
  font-size: 0.9rem;
  color: #495057;
  line-height: 1.5;
}

.tags {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-top: 0.75rem;
}

.tag {
  display: inline-block;
  padding: 0.25rem 0.5rem;
  background: #e9ecef;
  color: #495057;
  border-radius: 4px;
  font-size: 0.8rem;
  font-weight: 500;
}

.tag.difficulty {
  background: #667eea;
  color: white;
}

@media (max-width: 768px) {
  .info {
    padding: 0.75rem;
  }

  .title {
    font-size: 0.95rem;
  }

  .summary {
    font-size: 0.85rem;
  }
}
</style>
