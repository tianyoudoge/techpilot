<script setup lang="ts">
import { computed, ref, useId, watch } from 'vue';
import type { DiagramKind } from '../lib/math-diagrams';
import RichText from './RichText.vue';
const props = defineProps<{ kind: DiagramKind; knowledgeId?: string }>();
const mode = ref('range'), clip = `plot-${useId().replace(/:/g, '')}`;
watch(() => props.knowledgeId, id => { mode.value = id?.endsWith('_AXIS') ? 'axis' : id?.endsWith('_VERTEX') ? 'vertex' : 'range'; }, { immediate:true });
const graph = computed(() => ['quadratic','linear','inverse','square','coordinates'].includes(props.kind));
const xmin = computed(() => props.kind === 'square' ? -3 : 0);
const xmax = computed(() => props.kind === 'linear' ? 4 : props.kind === 'coordinates' ? 4 : props.kind === 'square' ? 3 : 6);
const ymax = computed(() => props.kind === 'inverse' ? 13 : 10);
const px = (x:number) => 42 + (x-xmin.value)/(xmax.value-xmin.value)*290;
const py = (y:number) => 216 - (y+2)/(ymax.value+2)*196;
const value = (x:number) => props.kind === 'linear' ? 2*x+1 : props.kind === 'inverse' ? 6/x : props.kind === 'square' ? x*x : (x-2)**2-1;
const curve = computed(() => Array.from({length:121},(_,i) => { const x = props.kind === 'inverse' ? .5+i*5.5/120 : xmin.value+i*(xmax.value-xmin.value)/120; return `${i?'L':'M'}${px(x).toFixed(2)},${py(value(x)).toFixed(2)}`; }).join(' '));
const title = computed(() => ({quadratic:'看一段曲线的高低', linear:'放进一个数，算出一个结果', inverse:'一个变大，另一个变小', square:'为什么平方不会小于零', coordinates:'坐标就是点的位置', similar:'形状一样，大小可以不同', circle:'圆心、半径和直径', area:'先找底和高，再算面积'}[props.kind]));
const formula = computed(() => ({quadratic:'通用例子：$y=(x-2)^2-1$，只看 $1≤x≤5$。',linear:'通用例子：$y=2x+1$，也就是“乘2，再加1”。',inverse:'通用例子：$y=6/x$，图里只展示 $x>0$ 的部分。',square:'通用例子：$y=x^2$，任何点都不会跑到横轴下面。',coordinates:'通用例子：点 $(2,3)$，向右2格，再向上3格。',similar:'通用例子：三条边都放大到原来的2倍，对应的角不变。',circle:'通用例子：半径从圆心到圆边，直径穿过圆心，$d=2r$。',area:'通用例子：底4，高3，面积 $4×3÷2=6$。高要与底垂直。'}[props.kind]));
const caption = computed(() => props.kind === 'quadratic' ? ({range:'蓝色区域只看指定范围。左端是0，最低处是−1，右端是8；比较这三个数就够了。',axis:'虚线是对称轴。左右离它一样远的两个位置，曲线一样高。',vertex:'橙色点是拐头的位置。这条曲线开口向上，所以这里最低。'}[mode.value] || '') : props.kind === 'inverse' ? '横坐标从1变成2，结果从6变成3。这里每一对数的乘积都是6。' : props.kind === 'linear' ? '沿横轴找到3，再向上找到曲线，就能读到结果7。' : props.kind === 'square' ? '离0一样远的两个数，平方一样大；0的平方是0，是这里最低的结果。' : '这张图用来解释基础关系，不代表当前题目的构图。');
</script>
<template>
 <figure class="math-illustration" :aria-label="title">
  <figcaption><strong>{{ title }}</strong><RichText :text="formula" /></figcaption>
  <div v-if="kind === 'quadratic'" class="diagram-controls" aria-label="看图重点"><button v-for="item in [{key:'range',label:'看指定范围'},{key:'vertex',label:'看最低点'},{key:'axis',label:'看对称轴'}]" :key="item.key" :aria-pressed="mode===item.key" @click="mode=item.key">{{ item.label }}</button></div>
  <svg viewBox="0 0 360 270" role="img" :aria-label="`${title}。${caption}`">
   <template v-if="graph">
    <defs><clipPath :id="clip"><rect x="42" y="20" width="290" height="196" /></clipPath></defs>
    <rect v-if="kind==='quadratic' && mode==='range'" :x="px(1)" y="20" :width="px(5)-px(1)" height="196" fill="#e7efff" />
    <g class="diagram-grid"><line v-for="y in [0,2,4,6,8]" :key="y" x1="42" x2="332" :y1="py(y)" :y2="py(y)"/><line v-for="x in [1,2,3,4]" :key="`x${x}`" :x1="px(x)" :x2="px(x)" y1="20" y2="216" v-show="x<=xmax" /></g>
    <g class="diagram-axis"><line x1="36" x2="340" :y1="py(0)" :y2="py(0)"/><line :x1="px(0)" :x2="px(0)" y1="14" y2="221"/></g>
    <text x="341" :y="py(0)+5">x</text><text :x="px(0)-14" y="18">y</text>
    <text v-for="x in kind==='square' ? [-2,0,2] : [0,1,2,3,4,5]" :key="`tick${x}`" v-show="x<=xmax" :x="px(x)-4" :y="py(0)+18">{{ x }}</text>
    <path v-if="kind!=='coordinates'" :d="curve" :clip-path="`url(#${clip})`" fill="none" stroke="#365ae8" stroke-width="3" />
    <template v-if="kind==='quadratic'">
     <line :x1="px(2)" :x2="px(2)" y1="20" y2="216" stroke="#8a6bc8" stroke-dasharray="5 5"/><text v-if="mode==='axis'" :x="px(2)+8" y="35" fill="#7657b8">对称轴 x=2</text>
     <circle :cx="px(2)" :cy="py(-1)" r="5" fill="#ed923b"/><text :x="px(2)-25" y="244" fill="#985511">最低点 (2,−1)</text>
     <template v-if="mode==='range'"><circle :cx="px(1)" :cy="py(0)" r="4" fill="#365ae8"/><circle :cx="px(5)" :cy="py(8)" r="4" fill="#365ae8"/><text :x="px(1)-30" :y="py(0)-12">左端：0</text><text :x="px(5)-55" :y="py(8)-12">右端：8</text></template>
     <template v-if="mode==='axis'"><circle :cx="px(1)" :cy="py(0)" r="4" fill="#7657b8"/><circle :cx="px(3)" :cy="py(0)" r="4" fill="#7657b8"/><line :x1="px(1)" :x2="px(3)" :y1="py(0)-8" :y2="py(0)-8" stroke="#7657b8"/></template>
    </template>
    <template v-else-if="kind==='linear' || kind==='coordinates'"><line :x1="px(kind==='linear'?3:2)" :x2="px(kind==='linear'?3:2)" :y1="py(0)" :y2="py(kind==='linear'?7:3)" stroke="#ed923b" stroke-dasharray="4 4"/><circle :cx="px(kind==='linear'?3:2)" :cy="py(kind==='linear'?7:3)" r="5" fill="#ed923b"/><text :x="px(kind==='linear'?3:2)+8" :y="py(kind==='linear'?7:3)-8">{{ kind==='linear'?'(3,7)':'(2,3)' }}</text></template>
    <template v-else-if="kind==='inverse'"><circle :cx="px(1)" :cy="py(6)" r="5" fill="#ed923b"/><text :x="px(1)+8" :y="py(6)-8">(1,6)</text><circle :cx="px(2)" :cy="py(3)" r="5" fill="#ed923b"/><text :x="px(2)+8" :y="py(3)+18">(2,3)</text></template>
   </template>
   <template v-else-if="kind==='similar'">
    <path d="M30 200 L110 200 L30 140 Z M170 200 L330 200 L170 80 Z" fill="#e7efff" stroke="#365ae8" stroke-width="2"/>
    <path d="M30 190 H40 V200 M170 190 H180 V200" fill="none" stroke="#ed923b" stroke-width="2"/>
    <text x="16" y="174">3</text><text x="64" y="221">4</text><text x="78" y="166">5</text><text x="152" y="144">6</text><text x="246" y="221">8</text><text x="256" y="129">10</text><text x="105" y="44">每条对应边 ×2</text>
   </template>
   <template v-else-if="kind==='circle'">
    <circle cx="180" cy="132" r="85" fill="#f0f5ff" stroke="#365ae8" stroke-width="3"/>
    <line x1="95" x2="265" y1="132" y2="132" stroke="#365ae8" stroke-width="2"/><line x1="180" x2="180" y1="132" y2="47" stroke="#ed923b" stroke-width="3"/><circle cx="180" cy="132" r="4" fill="#365ae8"/><text x="187" y="151">圆心 O</text><text x="191" y="85" fill="#985511">半径 r</text><text x="128" y="122">直径 d</text><text x="127" y="249">直径 = 2 × 半径</text>
   </template>
   <template v-else>
    <path d="M65 205 H265 L65 55 Z" fill="#e7efff" stroke="#365ae8" stroke-width="3"/>
    <path d="M65 191 H79 V205" fill="none" stroke="#ed923b" stroke-width="2"/><line x1="65" x2="65" y1="205" y2="55" stroke="#ed923b" stroke-width="3"/><text x="140" y="232">底：4</text><text x="17" y="137">高：3</text><text x="100" y="39">面积 = 底 × 高 ÷ 2</text>
   </template>
  </svg>
  <p class="diagram-caption" aria-live="polite">{{ caption }}</p>
 </figure>
</template>
