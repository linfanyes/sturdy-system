<script setup lang="ts">
import { useRouter } from 'vue-router'
import { ArrowLeft } from 'lucide-vue-next'

const router = useRouter()
</script>

<template>
  <button
    class="btn-ghost text-sm mb-3 self-start"
    @click="router.push({ name: 'toolbox' })"
  >
    <ArrowLeft :size="14" /> 返回工具箱
  </button>
</template>
