<script setup lang="ts">
import { RouterLink } from "vue-router";
import { ArrowLeft } from "lucide-vue-next";
</script>
<template>
  <section class="flow-page">
    <div class="empty-card">
      <h1 class="page-title">这个页面暂时打不开</h1>
      <p class="muted">可以回到拍题，或在讲题记录里找回之前的笔记。</p>
      <RouterLink to="/" class="button primary"
        ><ArrowLeft :size="18" />回到拍题</RouterLink
      >
    </div>
  </section>
</template>
