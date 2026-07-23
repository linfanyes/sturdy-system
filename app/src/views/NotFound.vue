<script setup lang="ts">
import { useRouter } from 'vue-router'
const router = useRouter()
</script>

<template>
  <div class="min-h-screen flex items-center justify-center p-6">
    <div class="card-soft p-10 text-center max-w-md">
      <div class="text-7xl mb-3 animate-floaty">
        🍂
      </div>
      <h1 class="title-display text-3xl mb-2">
        找不到这个页面
      </h1>
      <p class="text-cocoa-500 mb-6">
        可能它正躲在某个角落思考人生呢
      </p>
      <button
        class="btn-primary"
        @click="router.replace({ name: 'dashboard' })"
      >
        回到工作台
      </button>
    </div>
  </div>
</template>
