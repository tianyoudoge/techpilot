<script setup lang="ts">
import { ref, computed, watch, onUnmounted, nextTick } from "vue";
import { RotateCw, Crop, X, ArrowRight, Undo2 } from "lucide-vue-next";
const props = defineProps<{ file: File; busy?: boolean }>();
const emit = defineEmits<{ confirm: [file: File]; cancel: [] }>();
const canvas = ref<HTMLCanvasElement>(),
  area = ref<HTMLDivElement>(),
  error = ref(""),
  rotations = ref(0),
  selection = ref({ x: 0, y: 0, w: 1, h: 1 }),
  drawing = ref(false);
let image: HTMLImageElement | undefined,
  objectUrl = "",
  start = { x: 0, y: 0 };
const selectionStyle = computed(() => ({
  left: `${selection.value.x * 100}%`,
  top: `${selection.value.y * 100}%`,
  width: `${selection.value.w * 100}%`,
  height: `${selection.value.h * 100}%`,
}));
async function load() {
  error.value = "";
  rotations.value = 0;
  if (objectUrl) URL.revokeObjectURL(objectUrl);
  objectUrl = URL.createObjectURL(props.file);
  image = new Image();
  image.src = objectUrl;
  try {
    await image.decode();
    await nextTick();
    draw();
  } catch {
    error.value = "这张图片暂时打不开，请换成 JPG 或 PNG 格式。";
  }
}
function draw() {
  if (!canvas.value || !image) return;
  const c = canvas.value;
  const quarter = rotations.value % 2;
  const w = quarter ? image.height : image.width,
    h = quarter ? image.width : image.height;
  const scale = Math.min(1, 1600 / Math.max(w, h));
  c.width = Math.round(w * scale);
  c.height = Math.round(h * scale);
  const ctx = c.getContext("2d")!;
  ctx.translate(c.width / 2, c.height / 2);
  ctx.rotate((rotations.value * Math.PI) / 2);
  ctx.drawImage(
    image,
    (-image.width * scale) / 2,
    (-image.height * scale) / 2,
    image.width * scale,
    image.height * scale,
  );
  selection.value = { x: 0, y: 0, w: 1, h: 1 };
}
function point(event: PointerEvent) {
  const rect = area.value!.getBoundingClientRect();
  return {
    x: Math.min(1, Math.max(0, (event.clientX - rect.left) / rect.width)),
    y: Math.min(1, Math.max(0, (event.clientY - rect.top) / rect.height)),
  };
}
function begin(event: PointerEvent) {
  if (props.busy || !image) return;
  start = point(event);
  drawing.value = true;
  area.value!.setPointerCapture(event.pointerId);
  selection.value = { x: start.x, y: start.y, w: 0, h: 0 };
}
function move(event: PointerEvent) {
  if (!drawing.value) return;
  const p = point(event);
  selection.value = {
    x: Math.min(start.x, p.x),
    y: Math.min(start.y, p.y),
    w: Math.abs(p.x - start.x),
    h: Math.abs(p.y - start.y),
  };
}
function finish() {
  drawing.value = false;
  if (selection.value.w < 0.04 || selection.value.h < 0.04)
    selection.value = { x: 0, y: 0, w: 1, h: 1 };
}
function confirm() {
  if (!canvas.value || error.value || props.busy) return;
  const src = canvas.value,
    s = selection.value;
  const out = document.createElement("canvas");
  out.width = Math.max(1, Math.round(src.width * s.w));
  out.height = Math.max(1, Math.round(src.height * s.h));
  out
    .getContext("2d")!
    .drawImage(
      src,
      src.width * s.x,
      src.height * s.y,
      src.width * s.w,
      src.height * s.h,
      0,
      0,
      out.width,
      out.height,
    );
  out.toBlob(
    (blob) => {
      if (blob)
        emit(
          "confirm",
          new File([blob], "question.jpg", { type: "image/jpeg" }),
        );
      else error.value = "图片处理失败，请重新选择";
    },
    "image/jpeg",
    0.9,
  );
}
watch(() => props.file, load, { immediate: true });
onUnmounted(() => {
  if (objectUrl) URL.revokeObjectURL(objectUrl);
});
</script>
<template>
  <section class="crop-card">
    <div class="section-heading">
      <div>
        <span class="eyebrow">只看孩子不会的这一题</span>
        <h2>把题目框出来</h2>
      </div>
      <button
        class="icon-button"
        aria-label="取消选择照片"
        :disabled="busy"
        @click="emit('cancel')"
      >
        <X />
      </button>
    </div>
    <p class="muted">在照片上拖动选框，保留完整题干和图形。</p>
    <div
      ref="area"
      class="crop-area"
      @pointerdown="begin"
      @pointermove="move"
      @pointerup="finish"
      @pointercancel="finish"
    >
      <canvas ref="canvas"></canvas>
      <div class="crop-selection" :style="selectionStyle">
        <Crop :size="20" />
      </div>
    </div>
    <p v-if="error" class="error-message" role="alert">{{ error }}</p>
    <div class="crop-actions">
      <button
        class="button subtle"
        :disabled="busy"
        @click="
          rotations++;
          draw();
        "
      >
        <RotateCw :size="18" />旋转</button
      ><button
        class="button subtle"
        :disabled="busy"
        @click="selection = { x: 0, y: 0, w: 1, h: 1 }"
      >
        <Undo2 :size="18" />保留整张
      </button>
    </div>
    <button
      class="button primary full"
      :disabled="busy || !!error"
      @click="confirm"
    >
      {{ busy ? "正在看题…" : "就看这一题" }}<ArrowRight :size="18" />
    </button>
  </section>
</template>
