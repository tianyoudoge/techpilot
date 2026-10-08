<script setup lang="ts">
import { computed } from "vue";
import MarkdownIt from "markdown-it";
import katex from "katex";
import { formatMathText, mathToTex } from '../lib/rich-text';
const props = defineProps<{ text?: string; lesson?: boolean; references?: { id: string; name: string }[] }>();
const emit = defineEmits<{ selectKnowledge: [id: string] }>();
const md = new MarkdownIt({ html: false, breaks: true, linkify: false });
const renderMath = (content: string, display: boolean) => {
  try { return katex.renderToString(mathToTex(content), { throwOnError: true, strict: 'ignore', trust: false, displayMode: display }); }
  catch { return `<span class="math-fallback">${md.utils.escapeHtml(content)}</span>`; }
};
// Display math is a Markdown block, so multi-line derivations never enter a paragraph.
md.block.ruler.before('fence', 'display_math', (state, startLine, endLine, silent) => {
  const first = state.src.slice(state.bMarks[startLine] + state.tShift[startLine], state.eMarks[startLine]).trim();
  const opening = first.startsWith('$$') ? '$$' : first.startsWith('\\[') ? '\\[' : '';
  if (!opening) return false;
  const closing = opening === '$$' ? '$$' : '\\]';
  let value = first.slice(opening.length), last = startLine;
  const single = value.endsWith(closing);
  if (single) value = value.slice(0, -closing.length);
  else {
    let found = false;
    for (last = startLine + 1; last < endLine; last++) {
      const line = state.src.slice(state.bMarks[last] + state.tShift[last], state.eMarks[last]).trim();
      if (line.endsWith(closing)) { value += '\n' + line.slice(0, -closing.length); found = true; break; }
      value += '\n' + line;
    }
    if (!found) return false;
  }
  if (silent) return true;
  const token = state.push('math_block', '', 0); token.block = true; token.content = value.trim(); token.map = [startLine, last + 1];
  state.line = last + 1; return true;
});
md.renderer.rules.math_block = (tokens, index) => `<div class="math-block">${renderMath(tokens[index].content, true)}</div>\n`;
md.inline.ruler.before("escape", "math", (state, silent) => {
  const start = state.pos, s = state.src;
  const marker = s.startsWith('\\(', start) ? '\\(' : s[start] === '$' && s[start + 1] !== '$' ? '$' : '';
  if (!marker) return false;
  const close = marker === '$' ? '$' : '\\)';
  const end = s.indexOf(close, start + marker.length);
  if (end < 0) return false;
  if (!silent) { const t = state.push("math_inline", "", 0); t.content = s.slice(start + marker.length, end); }
  state.pos = end + close.length; return true;
});
md.renderer.rules.math_inline = (tokens, index) => `<span class="math-inline">${renderMath(tokens[index].content, false)}</span>`;
// Transform text tokens only; leave math, code and existing links intact.
md.core.ruler.after('inline', 'knowledge_references', state => {
  const references = [...(props.references || [])].filter(r => r.name).sort((a,b) => b.name.length - a.name.length);
  if (!references.length) return;
  for (const block of state.tokens) {
    if (block.type !== 'inline' || !block.children) continue;
    const output = []; let linkDepth = 0;
    for (const token of block.children) {
      if (token.type === 'link_open') linkDepth++;
      if (token.type !== 'text' || linkDepth) output.push(token);
      else {
        let remaining = token.content;
        while (remaining) {
          const matches = references.map(r => ({ r, index: remaining.indexOf(r.name) })).filter(m => m.index >= 0).sort((a,b) => a.index - b.index);
          if (!matches.length) { const t = new state.Token('text', '', 0); t.content = remaining; output.push(t); break; }
          const match = matches[0];
          if (match.index) { const t = new state.Token('text', '', 0); t.content = remaining.slice(0, match.index); output.push(t); }
          const t = new state.Token('knowledge_ref', '', 0); t.content = match.r.name; t.meta = { id: match.r.id }; output.push(t);
          remaining = remaining.slice(match.index + match.r.name.length);
        }
      }
      if (token.type === 'link_close') linkDepth--;
    }
    block.children = output;
  }
});
md.renderer.rules.knowledge_ref = (tokens, index) => `<button type="button" class="knowledge-inline" data-knowledge-id="${md.utils.escapeHtml(tokens[index].meta.id)}">${md.utils.escapeHtml(tokens[index].content)}</button>`;
function navigate(event: MouseEvent) {
  const target = event.target instanceof Element ? event.target.closest<HTMLButtonElement>('button[data-knowledge-id]') : null;
  const id = target?.dataset.knowledgeId;
  if (id && props.references?.some(r => r.id === id)) emit('selectKnowledge', id);
}
const html = computed(() => md.render(formatMathText(props.text || '', props.lesson)));
</script>
<template><div class="rich-text" :class="{ 'lesson-prose': lesson }" @click="navigate" v-html="html"></div></template>
