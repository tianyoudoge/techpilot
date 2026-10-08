<template>
  <div class="debug-page">
    <h1>数据库连接测试</h1>

    <div class="test-section">
      <h2>1. 数据库加载状态</h2>
      <div v-if="dbStatus.loading">⏳ 正在加载数据库...</div>
      <div v-else-if="dbStatus.error" class="error">❌ {{ dbStatus.error }}</div>
      <div v-else class="success">✅ 数据库加载成功</div>
    </div>

    <div class="test-section">
      <h2>2. 测试查询</h2>
      <button @click="testQuery" :disabled="testing">运行测试查询</button>

      <div v-if="testResult.loading">⏳ 查询中...</div>
      <div v-else-if="testResult.error" class="error">
        ❌ 查询失败: {{ testResult.error }}
      </div>
      <div v-else-if="testResult.data" class="success">
        ✅ 查询成功！找到 {{ testResult.data.length }} 个片段
        <pre>{{ JSON.stringify(testResult.data[0], null, 2) }}</pre>
      </div>
    </div>

    <div class="test-section">
      <h2>3. 统计信息</h2>
      <button @click="testStats" :disabled="testing">获取统计</button>

      <div v-if="statsResult.loading">⏳ 加载中...</div>
      <div v-else-if="statsResult.error" class="error">
        ❌ 失败: {{ statsResult.error }}
      </div>
      <div v-else-if="statsResult.data">
        <div class="success">
          ✅ 总片段数: {{ statsResult.data.totalSegments }}<br>
          ✅ 总视频数: {{ statsResult.data.totalVideos }}
        </div>
      </div>
    </div>

    <div class="test-section">
      <h2>4. 控制台日志</h2>
      <div class="logs">
        <div v-for="(log, i) in logs" :key="i" :class="log.type">
          [{{ log.time }}] {{ log.message }}
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { getVideoSegments, getSegmentStats, preloadDatabase } from '../lib/api-client';

const dbStatus = ref({ loading: true, error: '' });
const testResult = ref({ loading: false, data: null as any, error: '' });
const statsResult = ref({ loading: false, data: null as any, error: '' });
const testing = ref(false);
const logs = ref<Array<{ time: string; message: string; type: string }>>([]);

function log(message: string, type = 'info') {
  const time = new Date().toLocaleTimeString();
  logs.value.push({ time, message, type });
  console.log(`[${type}] ${message}`);
}

async function testQuery() {
  testing.value = true;
  testResult.value = { loading: true, data: null, error: '' };

  try {
    log('开始查询视频片段...');
    const segments = await getVideoSegments({
      chapter: 'circle',
      limit: 5
    });

    log(`查询成功！找到 ${segments.length} 个片段`, 'success');
    testResult.value = { loading: false, data: segments, error: '' };
  } catch (error: any) {
    log(`查询失败: ${error.message}`, 'error');
    testResult.value = { loading: false, data: null, error: error.message };
  } finally {
    testing.value = false;
  }
}

async function testStats() {
  testing.value = true;
  statsResult.value = { loading: true, data: null, error: '' };

  try {
    log('获取统计信息...');
    const stats = await getSegmentStats();

    log(`统计成功！片段: ${stats.totalSegments}, 视频: ${stats.totalVideos}`, 'success');
    statsResult.value = { loading: false, data: stats, error: '' };
  } catch (error: any) {
    log(`统计失败: ${error.message}`, 'error');
    statsResult.value = { loading: false, data: null, error: error.message };
  } finally {
    testing.value = false;
  }
}

onMounted(async () => {
  log('页面加载，开始初始化数据库...');

  try {
    await preloadDatabase();
    log('数据库初始化成功！', 'success');
    dbStatus.value = { loading: false, error: '' };
  } catch (error: any) {
    log(`数据库初始化失败: ${error.message}`, 'error');
    dbStatus.value = { loading: false, error: error.message };
  }
});
</script>

<style scoped>
.debug-page {
  max-width: 1000px;
  margin: 2rem auto;
  padding: 2rem;
  font-family: monospace;
}

h1 {
  color: #333;
  margin-bottom: 2rem;
}

h2 {
  color: #666;
  font-size: 1.2rem;
  margin-bottom: 1rem;
}

.test-section {
  background: white;
  border: 1px solid #ddd;
  border-radius: 8px;
  padding: 1.5rem;
  margin-bottom: 1.5rem;
}

button {
  padding: 0.5rem 1rem;
  background: #667eea;
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 1rem;
}

button:hover {
  background: #5568d3;
}

button:disabled {
  background: #ccc;
  cursor: not-allowed;
}

.success {
  color: #28a745;
  padding: 1rem;
  background: #d4edda;
  border-radius: 4px;
  margin-top: 1rem;
}

.error {
  color: #dc3545;
  padding: 1rem;
  background: #f8d7da;
  border-radius: 4px;
  margin-top: 1rem;
}

pre {
  background: #f5f5f5;
  padding: 1rem;
  border-radius: 4px;
  overflow-x: auto;
  margin-top: 0.5rem;
}

.logs {
  max-height: 300px;
  overflow-y: auto;
  background: #f5f5f5;
  padding: 1rem;
  border-radius: 4px;
  font-size: 0.9rem;
}

.logs .info {
  color: #333;
}

.logs .success {
  color: #28a745;
  background: transparent;
  padding: 0;
}

.logs .error {
  color: #dc3545;
  background: transparent;
  padding: 0;
}
</style>
