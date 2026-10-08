<script setup lang="ts">
import { computed } from 'vue';
import { ChevronRight } from 'lucide-vue-next';
import { knowledgeLabel } from '../lib/knowledge-label';
import type { Knowledge } from '../lib/types';
const props = defineProps<{ id: string; assets: Map<string, Knowledge>; selected: string; primary: string; trail?: string[]; depth?: number }>();
const emit = defineEmits<{ select: [id: string] }>();
const node = computed(() => props.assets.get(props.id));
const children = computed(() => (props.trail?.includes(props.id) || (props.depth || 0) >= 12) ? [] : (node.value?.prerequisites || []).filter(id => props.assets.has(id)));
function containsSelected(id: string, seen = new Set<string>()): boolean {
  if (seen.has(id)) return false;
  if (id === props.selected) return true;
  seen.add(id);
  return (props.assets.get(id)?.prerequisites || []).some(child => containsSelected(child, seen));
}
</script>
<template>
  <li class="knowledge-branch">
    <button class="knowledge-node" :class="{ selected: selected === id, primary: primary === id }" :aria-current="selected === id ? 'page' : undefined" @click="emit('select', id)">{{ knowledgeLabel(id, node?.name) }}<span v-if="primary === id">本题</span></button>
    <details v-if="children.length" :open="(depth || 0) < 1 || (selected !== id && containsSelected(id))">
      <summary><ChevronRight :size="14" /><span>{{ children.length }} 项需要先懂的基础</span></summary>
      <ul><KnowledgeTreeNode v-for="child in children" :key="child" :id="child" :assets="assets" :selected="selected" :primary="primary" :depth="(depth || 0) + 1" :trail="[...(trail || []), id]" @select="emit('select', $event)" /></ul>
    </details>
  </li>
</template>
