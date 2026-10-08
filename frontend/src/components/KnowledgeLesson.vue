<script setup lang="ts">
import { computed, ref, nextTick, watch, onMounted, onUnmounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { ArrowLeft, ChevronRight, Network, BookOpen } from 'lucide-vue-next';
import type { Guide, Question, Knowledge } from '../lib/types';
import { chapterNames, safeArray } from '../lib/api';
import RichText from './RichText.vue';
import KnowledgeTreeNode from './KnowledgeTreeNode.vue';
import MathDiagram from './MathDiagram.vue';
import { diagramFor } from '../lib/math-diagrams';
import { knowledgeLabel } from '../lib/knowledge-label';
import { loadAssetBundle } from '../lib/assets/bundle';
import type { KnowledgeAssetRaw } from '../lib/assets/types';
// Knowledge content belongs to the asset service; saved lesson content remains the offline fallback.
const parentAssets = ref<KnowledgeAssetRaw[]>([]);
onMounted(async () => {
  try {
    parentAssets.value = (await loadAssetBundle()).assets;
  } catch {
    // An existing lesson can still be read when no asset snapshot is available.
  }
});
const props = defineProps<{ guide: Guide; question: Question }>();
const route = useRoute(), router = useRouter();
const viewport = window.matchMedia('(min-width: 761px)');
const treeOpen = ref(viewport.matches);
const resizeTree = (event: MediaQueryListEvent) => { treeOpen.value = event.matches; };
onMounted(() => viewport.addEventListener('change', resizeTree));
onUnmounted(() => viewport.removeEventListener('change', resizeTree));
const reader = ref<HTMLElement>(), panel = ref<'concept' | 'problem'>('concept');
const assets = computed(() => new Map<string, Knowledge>([...props.guide.context.prerequisites, ...props.guide.context.knowledge].map(asset => [asset.id, { ...asset, name: knowledgeLabel(asset.id, asset.name) }])));
const primary = computed(() => safeArray<string>(props.question.knowledgePointIds)[0] || props.guide.context.knowledge[0]?.id || '');
const selected = computed(() => assets.value.has(String(route.query.knowledge)) ? String(route.query.knowledge) : primary.value);
const asset = computed(() => assets.value.get(selected.value));
const lesson = computed(() => props.guide.prerequisiteLessons.find(p => p.knowledgePointId === selected.value));
const explanation = computed(() => selected.value === primary.value ? props.guide.parentExplanation : lesson.value?.explanation || asset.value?.explanation || '这项知识的讲解尚未补充。');
// Curated plain-language assets also improve saved lessons without rewriting their evidence snapshot.
const parentAsset = computed(() => asset.value?.definition ? parentAssets.value.find(a => a.id === selected.value) : undefined);
const diagram = computed(() => diagramFor(selected.value));
const dependencies = computed(() => (asset.value?.prerequisites || []).map(id => assets.value.get(id)).filter((x): x is Knowledge => !!x));
const references = computed(() => [...assets.value.values()].filter(a => a.id !== selected.value).map(a => ({ id: a.id, name: a.name })));
const related = computed(() => props.guide.context.knowledge.filter(a => a.id !== primary.value).map(a => ({ ...a, name: knowledgeLabel(a.id, a.name) })));
const chapter = computed(() => chapterNames[asset.value?.chapterId || props.question.chapterId] || '数学基础');
async function select(id: string) {
  panel.value = 'concept';
  await router.push({ query: { ...route.query, knowledge: id === primary.value ? undefined : id } });
  await nextTick(); reader.value?.scrollIntoView({ block: 'start', behavior: 'instant' }); reader.value?.focus({ preventScroll: true });
}
watch(() => selected.value, () => { panel.value = 'concept'; });
</script>
<template>
  <div class="knowledge-workspace">
    <nav class="knowledge-map paper-card" aria-label="知识树">
      <details class="knowledge-map-toggle" :open="treeOpen" @toggle="treeOpen = ($event.target as HTMLDetailsElement).open">
      <summary class="knowledge-map-heading"><Network :size="18" /><h2>知识树</h2><span>看看需要哪些基础</span><ChevronRight :size="15" /></summary>
      <p class="tree-caption">{{ chapterNames[question.chapterId] || '初中数学' }} · 先弄懂基础，再看这道题</p>
      <ul class="knowledge-tree"><KnowledgeTreeNode v-if="primary" :id="primary" :assets="assets" :selected="selected" :primary="primary" @select="select" /></ul>
      <details v-if="related.length" class="related-knowledge"><summary>本题还涉及 {{ related.length }} 个知识点</summary><button v-for="item in related" :key="item.id" class="knowledge-node" @click="select(item.id)">{{ item.name }}<ChevronRight :size="14" /></button></details>
      </details>
    </nav>
    <article ref="reader" class="knowledge-reader paper-card" tabindex="-1" aria-label="知识点讲解">
      <nav class="knowledge-location" aria-label="知识点位置"><span>初中数学</span><ChevronRight :size="12" /><span>{{ chapter }}</span><ChevronRight :size="12" /><strong>{{ knowledgeLabel(selected, asset?.name) }}</strong></nav>
      <div class="knowledge-reader-heading"><h2>{{ knowledgeLabel(selected, asset?.name) }}</h2><span class="pill">{{ selected === primary ? '本题核心' : '需要先懂的基础' }}</span></div>
      <button v-if="selected !== primary" class="text-link knowledge-return" @click="select(primary)"><ArrowLeft :size="15" />返回本题：{{ knowledgeLabel(primary, assets.get(primary)?.name) }}</button>
      <div v-if="selected === primary" class="lesson-tabs" role="group" aria-label="讲解内容"><button :aria-pressed="panel === 'concept'" :class="{ selected: panel === 'concept' }" @click="panel = 'concept'">知识点讲解</button><button :aria-pressed="panel === 'problem'" :class="{ selected: panel === 'problem' }" @click="panel = 'problem'">本题解法</button></div>
      <template v-if="panel === 'concept'">
        <section v-if="dependencies.length" class="prerequisite-links" aria-label="前置知识"><h3>先补这些基础</h3><div><button v-for="item in dependencies" :key="item.id" @click="select(item.id)">{{ item.name }}<ChevronRight :size="13" /></button></div></section>
        <section class="knowledge-explanation"><h3>先这样理解</h3><RichText :text="parentAsset?.explanation || explanation" :references="references" @select-knowledge="select" lesson /></section>
        <MathDiagram v-if="diagram" :kind="diagram" :knowledge-id="selected" />
        <section v-if="parentAsset?.workedExample || asset?.workedExample" class="knowledge-example"><h3><BookOpen :size="16" />用一个例子试一试</h3><RichText :text="parentAsset?.workedExample || asset?.workedExample" :references="references" @select-knowledge="select" lesson /></section>
        <details v-if="asset?.definition" class="formal-knowledge"><summary>公式与正式定义（需要时再看）</summary><RichText :text="asset.definition" :references="references" @select-knowledge="select" lesson /></details>
        <details v-if="parentAsset && explanation !== parentAsset.explanation" class="question-lesson" :open="guide.presentationVersion === 'parent-friendly-v1'"><summary>{{ selected === primary ? '结合这道题的讲解' : '这道题里怎么用' }}</summary><RichText :text="explanation" :references="references" @select-knowledge="select" lesson /></details>
      </template>
      <section v-else class="problem-walkthrough"><h3>解题步骤</h3><RichText :text="guide.problemWalkthrough" :references="references" @select-knowledge="select" lesson /></section>
    </article>
  </div>
</template>
