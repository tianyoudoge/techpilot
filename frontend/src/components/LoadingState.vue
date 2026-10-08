<script setup lang="ts">
import BrandMark from "./BrandMark.vue";
defineProps<{ title: string; description?: string }>();
</script>
<template>
  <section class="loading-card" role="status" aria-live="polite">
    <div class="loading-symbol">
      <BrandMark /><span class="loading-orbit" />
    </div>
    <h2>{{ title }}</h2>
    <p>{{ description || "稍等一下，我们会把这件事讲清楚。" }}</p>
    <div class="skeleton"></div>
    <div class="skeleton short"></div>
    <div class="skeleton"></div>
  </section>
</template>
