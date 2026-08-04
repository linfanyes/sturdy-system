<script setup lang="ts">
import { ref, onErrorCaptured } from 'vue'

const error = ref<Error | null>(null)

onErrorCaptured((err: unknown) => {
  error.value = err instanceof Error ? err : new Error(String(err))
  // eslint-disable-next-line no-console
  console.error('[ErrorBoundary]', err)
  return false
})

function retry() {
  error.value = null
}
</script>

<template>
  <div v-if="error" class="p-8 text-center">
    <p class="text-rose-600 font-semibold">页面出错了</p>
    <p class="mt-2 text-sm text-slate-500 break-words">{{ error.message }}</p>
    <button
      class="mt-4 px-4 py-2 rounded-lg bg-indigo-500 text-white hover:bg-indigo-600"
      @click="retry"
    >
      重试
    </button>
  </div>
  <slot v-else />
</template>
