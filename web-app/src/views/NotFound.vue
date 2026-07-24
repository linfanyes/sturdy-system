<script setup lang="ts">
import { useRouter } from 'vue-router'
const router = useRouter()
</script>

<template>
  <div class="min-h-full flex flex-col items-center justify-center gap-4 p-4">
    <div class="text-6xl font-bold text-cocoa-300">404</div>
    <div class="text-lg text-cocoa-700">页面不存在</div>
    <button
      class="px-5 py-2.5 rounded-xl bg-butter-500 text-white font-medium hover:bg-butter-600"
      @click="router.push({ name: 'home' })"
    >
      返回首页
    </button>
  </div>
</template>
