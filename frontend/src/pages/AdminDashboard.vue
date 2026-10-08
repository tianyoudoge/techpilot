<template>
  <div class="admin-dashboard">
    <header class="dashboard-header">
      <h1>📊 TeachPilot 后台管理</h1>
      <div class="stats-summary">
        <div class="stat-card">
          <div class="stat-value">{{ stats.totalKnowledgePoints }}</div>
          <div class="stat-label">知识点</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">{{ stats.totalSegments }}</div>
          <div class="stat-label">视频片段</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">{{ stats.totalVideos }}</div>
          <div class="stat-label">源视频</div>
        </div>
      </div>
    </header>

    <p v-if="loadError" role="alert">{{ loadError }} <button @click="loadTaxonomy">重试</button></p>
    <div class="dashboard-content">
      <!-- 左侧：知识点树 -->
      <aside class="knowledge-tree-panel">
        <div class="panel-header">
          <h2>🌳 知识点树</h2>
          <div class="filters">
            <input
              v-model="searchQuery"
              type="text"
              placeholder="搜索知识点..."
              class="search-input"
            />
          </div>
        </div>

        <div class="tree-content" v-if="!loading">
          <div
            v-for="grade in filteredGrades"
            :key="grade.name"
            class="grade-group"
          >
            <h3 class="grade-title">{{ grade.name }}</h3>

            <div
              v-for="chapter in grade.chapters"
              :key="chapter.id"
              class="chapter-node"
            >
              <div
                class="chapter-header"
                @click="toggleChapter(chapter.id)"
                :class="{ active: selectedChapter === chapter.id }"
              >
                <span class="toggle-icon">
                  {{ expandedChapters.has(chapter.id) ? '▼' : '▶' }}
                </span>
                <span class="chapter-name">{{ chapter.name }}</span>
                <span class="chapter-count">{{ chapter.segmentCount }}</span>
              </div>

              <div
                v-if="expandedChapters.has(chapter.id)"
                class="knowledge-points"
              >
                <div
                  v-for="kp in chapter.knowledgePoints"
                  :key="kp.id"
                  class="kp-item"
                  @click="selectKnowledgePoint(kp)"
                  :class="{ selected: selectedKP?.id === kp.id }"
                >
                  <div class="kp-info">
                    <span class="kp-name">{{ kp.name }}</span>
                  </div>
                  <span class="kp-segment-count">
                    {{ kp.segmentCount }} 片段
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div v-else class="loading">
          <div class="spinner"></div>
          <p>加载中...</p>
        </div>
      </aside>

      <!-- 右侧：视频片段列表 -->
      <main class="segments-panel">
        <div class="panel-header">
          <h2>🎬 关联视频片段</h2>
          <div v-if="selectedKP" class="kp-detail">
            <strong>{{ selectedKP.name }}</strong>
            <p v-if="selectedKP.description">{{ selectedKP.description }}</p>
          </div>
        </div>

        <div v-if="selectedKP && !loadingSegments" class="segments-list">
          <div
            v-for="segment in currentSegments"
            :key="segment.id"
            class="segment-item"
          >
            <div class="segment-thumbnail">
              <div class="play-icon">▶️</div>
              <div class="duration">
                {{ formatDuration(segment.endTime - segment.startTime) }}
              </div>
            </div>

            <div class="segment-info">
              <h4 class="segment-title">{{ segment.video.title }}</h4>
              <p class="segment-summary">{{ segment.summary || '无摘要' }}</p>

              <div class="segment-meta">
                <span class="meta-item">
                  ⏱️ {{ formatTime(segment.startTime) }} - {{ formatTime(segment.endTime) }}
                </span>
                <span class="meta-item">
                  📊 难度: {{ segment.difficulty }}
                </span>
                <span class="meta-item">
                  ⭐ 质量: {{ (segment.qualityScore * 100).toFixed(0) }}%
                </span>
              </div>

              <div class="segment-tags">
                <span v-for="tag in segment.style" :key="tag" class="tag">
                  {{ tag }}
                </span>
              </div>
            </div>

            <div class="segment-actions">
              <button @click="playSegment(segment)" class="btn-play">
                播放
              </button>
              <button @click="viewDetails(segment)" class="btn-detail">
                详情
              </button>
            </div>
          </div>

          <div v-if="currentSegments.length === 0" class="empty-state">
            <div class="icon">📭</div>
            <p>该知识点暂无关联视频片段</p>
          </div>
        </div>

        <div v-else-if="loadingSegments" class="loading">
          <div class="spinner"></div>
          <p>加载片段中...</p>
        </div>

        <div v-else class="placeholder">
          <div class="icon">👈</div>
          <p>请从左侧选择知识点查看关联视频</p>
        </div>
      </main>
    </div>
  </div>
</template>

<script setup lang="ts">
import { openExternal } from '../lib/platform';
import { tell } from '../lib/ui-state';
import { ref, computed, onMounted } from 'vue';
import { getVideoSegments, getSegmentStats, getTaxonomy } from '../lib/api-client';
import { chapterNames } from '../lib/api';
import { knowledgeLabel } from '../lib/knowledge-label';
import type { VideoSegment } from '../lib/types';

interface KnowledgePoint {
  id: string;
  name: string;
  description?: string;
  chapterId: string;
  segmentCount: number;
}

interface Chapter {
  id: string;
  name: string;
  knowledgePoints: KnowledgePoint[];
  segmentCount: number;
}

interface Grade {
  name: string;
  chapters: Chapter[];
}

const loading = ref(true);
const loadError = ref('');
const loadingSegments = ref(false);
const searchQuery = ref('');
const expandedChapters = ref(new Set<string>());
const selectedChapter = ref<string | null>(null);
const selectedKP = ref<KnowledgePoint | null>(null);
const currentSegments = ref<VideoSegment[]>([]);

const stats = ref({
  totalKnowledgePoints: 0,
  totalSegments: 0,
  totalVideos: 0
});

const grades = ref<Grade[]>([]);

// 过滤后的年级数据
const filteredGrades = computed(() => {
  if (!searchQuery.value) return grades.value;

  const query = searchQuery.value.toLowerCase();
  return grades.value.map(grade => ({
    ...grade,
    chapters: grade.chapters.map(chapter => ({
      ...chapter,
      knowledgePoints: chapter.knowledgePoints.filter(kp =>
        kp.name.toLowerCase().includes(query) ||
        kp.id.toLowerCase().includes(query)
      )
    })).filter(chapter => chapter.knowledgePoints.length > 0)
  })).filter(grade => grade.chapters.length > 0);
});

// 加载 taxonomy 和统计数据
async function loadTaxonomy() {
  loading.value = true;
  try {
    const [taxonomy, inventory] = await Promise.all([getTaxonomy(), getSegmentStats()]);
    stats.value = inventory;

    // 组织成树形结构
    const gradeMap = new Map<string, Grade>();

    for (const kp of taxonomy) {
      const gradeName = getGradeName(kp.id);
      const chapterId = kp.chapterId || 'other';

      if (!gradeMap.has(gradeName)) {
        gradeMap.set(gradeName, {
          name: gradeName,
          chapters: []
        });
      }

      const grade = gradeMap.get(gradeName)!;
      let chapter = grade.chapters.find(c => c.id === chapterId);

      if (!chapter) {
        chapter = {
          id: chapterId,
          name: getChapterName(chapterId),
          knowledgePoints: [],
          segmentCount: 0
        };
        grade.chapters.push(chapter);
      }

      // 获取该知识点的片段数量
      const segmentCount = inventory.byKnowledgePoint[kp.id] || 0;

      chapter.knowledgePoints.push({
        id: kp.id,
        name: knowledgeLabel(kp.id, kp.name),
        description: kp.description,
        chapterId: chapterId,
        segmentCount: segmentCount
      });

      chapter.segmentCount += segmentCount;
    }

    grades.value = Array.from(gradeMap.values());
  } catch (error) {
    loadError.value = "内容加载失败，请检查 Go 服务是否启动后重试。";
    console.error('加载 taxonomy 失败:', error);
  } finally {
    loading.value = false;
  }
}

// 从知识点 ID 推断年级
function getGradeName(kpId: string): string {
  const grade = kpId.match(/^MATH_0([1-9])_/);
  if (grade) {
    const names = ['小学一年级', '小学二年级', '小学三年级', '小学四年级', '小学五年级', '小学六年级', '初一（七年级）', '初二（八年级）', '初三（九年级）'];
    return names[Number(grade[1]) - 1];
  }
  if (kpId.startsWith('MATH_07') || kpId.includes('RATIONAL_NUMBER') || kpId.includes('LINEAR_EQUATION_ONE')) {
    return '初一（七年级）';
  } else if (kpId.startsWith('MATH_08') || kpId.includes('TRIANGLE') || kpId.includes('FRACTION')) {
    return '初二（八年级）';
  } else if (kpId.startsWith('MATH_09') || kpId.includes('CIRCLE') || kpId.includes('QUADRATIC')) {
    return '初三（九年级）';
  } else if (kpId.startsWith('MATH_01')) {
    return '小学一年级';
  }
  return '数学基础';
}

// 获取章节名称
function getChapterName(chapterId: string): string {
  return chapterNames[chapterId] || '数学基础';
}

// 切换章节展开/收起
function toggleChapter(chapterId: string) {
  if (expandedChapters.value.has(chapterId)) {
    expandedChapters.value.delete(chapterId);
  } else {
    expandedChapters.value.add(chapterId);
  }
  selectedChapter.value = chapterId;
}

// 选择知识点
async function selectKnowledgePoint(kp: KnowledgePoint) {
  selectedKP.value = kp;
  loadingSegments.value = true;

  try {
    currentSegments.value = await getVideoSegments({
      knowledgePoint: kp.id,
      limit: 50
    });
  } catch (error) {
    console.error('加载片段失败:', error);
    currentSegments.value = [];
  } finally {
    loadingSegments.value = false;
  }
}

// 格式化时间
function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

// 格式化时长
function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}秒`;
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return secs > 0 ? `${mins}分${secs}秒` : `${mins}分`;
}

// 播放片段
function playSegment(segment: VideoSegment) {
  const url = `https://www.bilibili.com/video/${segment.video.bvid}?p=${segment.video.page}&t=${segment.startTime}`;
  void openExternal(url).catch(() => tell('暂时无法打开视频，请稍后再试'));
}

// 查看详情
function viewDetails(segment: VideoSegment) {
  alert(`片段 ID: ${segment.id}\n\n${JSON.stringify(segment, null, 2)}`);
}

onMounted(() => {
  loadTaxonomy();
});
</script>

<style scoped>
.admin-dashboard {
  min-height: 0;
  display: flex;
  flex-direction: column;
  background: #f5f7fa;
}

.dashboard-header {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  padding: 2rem;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.dashboard-header h1 {
  margin: 0 0 1rem 0;
  font-size: 1.75rem;
}

.stats-summary {
  display: flex;
  gap: 2rem;
}

.stat-card {
  background: rgba(255, 255, 255, 0.2);
  padding: 1rem 1.5rem;
  border-radius: 8px;
  backdrop-filter: blur(10px);
}

.stat-value {
  font-size: 2rem;
  font-weight: 700;
  margin-bottom: 0.25rem;
}

.stat-label {
  font-size: 0.9rem;
  opacity: 0.9;
}

.dashboard-content {
  display: flex;
  flex: 1;
  overflow: hidden;
}

.knowledge-tree-panel,
.segments-panel {
  background: white;
  display: flex;
  flex-direction: column;
}

.knowledge-tree-panel {
  width: 400px;
  border-right: 1px solid #e0e0e0;
  overflow: hidden;
}

.segments-panel {
  flex: 1;
  overflow: hidden;
}

.panel-header {
  padding: 1.5rem;
  border-bottom: 1px solid #e0e0e0;
}

.panel-header h2 {
  margin: 0 0 1rem 0;
  font-size: 1.25rem;
  color: #333;
}

.search-input {
  width: 100%;
  padding: 0.5rem 1rem;
  border: 1px solid #ddd;
  border-radius: 6px;
  font-size: 0.95rem;
}

.search-input:focus {
  outline: none;
  border-color: #667eea;
}

.tree-content,
.segments-list {
  flex: 1;
  overflow-y: auto;
  padding: 1rem;
}

.grade-group {
  margin-bottom: 1.5rem;
}

.grade-title {
  font-size: 1rem;
  font-weight: 600;
  color: #667eea;
  margin: 0 0 0.75rem 0;
  padding: 0.5rem;
  background: #f8f9fa;
  border-radius: 4px;
}

.chapter-node {
  margin-bottom: 0.5rem;
}

.chapter-header {
  display: flex;
  align-items: center;
  padding: 0.75rem;
  background: #f8f9fa;
  border-radius: 6px;
  cursor: pointer;
  transition: background 0.2s;
}

.chapter-header:hover {
  background: #e9ecef;
}

.chapter-header.active {
  background: #667eea;
  color: white;
}

.toggle-icon {
  margin-right: 0.5rem;
  font-size: 0.8rem;
}

.chapter-name {
  flex: 1;
  font-weight: 500;
}

.chapter-count {
  font-size: 0.85rem;
  opacity: 0.7;
}

.knowledge-points {
  margin-top: 0.5rem;
  margin-left: 1.5rem;
}

.kp-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.75rem;
  margin-bottom: 0.25rem;
  background: white;
  border: 1px solid #e0e0e0;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.2s;
}

.kp-item:hover {
  border-color: #667eea;
  transform: translateX(4px);
}

.kp-item.selected {
  background: #667eea;
  color: white;
  border-color: #667eea;
}

.kp-info {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.kp-name {
  font-weight: 500;
}

.kp-id {
  font-size: 0.75rem;
  opacity: 0.7;
  font-family: monospace;
}

.kp-segment-count {
  font-size: 0.85rem;
  opacity: 0.8;
}

.kp-detail {
  margin-top: 0.5rem;
  padding: 0.75rem;
  background: #f8f9fa;
  border-radius: 6px;
}

.kp-detail strong {
  color: #667eea;
}

.kp-detail p {
  margin: 0.5rem 0 0 0;
  font-size: 0.9rem;
  color: #666;
}

.segment-item {
  display: flex;
  gap: 1rem;
  padding: 1rem;
  background: white;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  margin-bottom: 1rem;
  transition: box-shadow 0.2s;
}

.segment-item:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.segment-thumbnail {
  position: relative;
  width: 160px;
  height: 90px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.play-icon {
  font-size: 2rem;
  opacity: 0.9;
}

.duration {
  position: absolute;
  bottom: 6px;
  right: 6px;
  background: rgba(0, 0, 0, 0.8);
  color: white;
  padding: 2px 6px;
  border-radius: 3px;
  font-size: 0.75rem;
}

.segment-info {
  flex: 1;
  min-width: 0;
}

.segment-title {
  margin: 0 0 0.5rem 0;
  font-size: 1rem;
  color: #333;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.segment-summary {
  margin: 0 0 0.75rem 0;
  font-size: 0.9rem;
  color: #666;
  line-height: 1.5;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.segment-meta {
  display: flex;
  gap: 1rem;
  margin-bottom: 0.5rem;
  font-size: 0.85rem;
  color: #888;
}

.segment-tags {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.tag {
  padding: 0.25rem 0.5rem;
  background: #e9ecef;
  color: #495057;
  border-radius: 3px;
  font-size: 0.75rem;
}

.segment-actions {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.btn-play,
.btn-detail {
  padding: 0.5rem 1rem;
  border: none;
  border-radius: 6px;
  font-size: 0.9rem;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-play {
  background: #667eea;
  color: white;
}

.btn-play:hover {
  background: #5568d3;
}

.btn-detail {
  background: white;
  color: #667eea;
  border: 1px solid #667eea;
}

.btn-detail:hover {
  background: #f8f9fa;
}

.loading,
.placeholder,
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: #999;
}

.spinner {
  width: 40px;
  height: 40px;
  border: 4px solid #f3f3f3;
  border-top-color: #667eea;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.icon {
  font-size: 3rem;
  margin-bottom: 1rem;
  opacity: 0.5;
}

@media (max-width: 1024px) {
  .dashboard-content {
    flex-direction: column;
  }

  .knowledge-tree-panel {
    width: 100%;
    height: 40%;
    border-right: none;
    border-bottom: 1px solid #e0e0e0;
  }

  .segments-panel {
    height: 60%;
  }
}
</style>
