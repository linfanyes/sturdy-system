<script setup lang="ts">
import { ref, onErrorCaptured, onMounted, onUnmounted } from 'vue'
import { reportMonitor } from '@/utils/monitor'

const error = ref<Error | null>(null)
const retryKey = ref(0)

onErrorCaptured((err: unknown) => {
  error.value = err instanceof Error ? err : new Error(String(err))
  console.error('[ErrorBoundary]', err)
  reportMonitor({ type: 'error', message: error.value.message, stack: error.value.stack, meta: { source: 'component' } })
  return false
})

// P0修复：兜底捕获异步错误（onMounted/setTimeout/事件处理器中的异常）
function onWindowError(event: ErrorEvent) {
  error.value = event.error || new Error(event.message)
  reportMonitor({ type: 'error', message: error.value.message, stack: error.value.stack, meta: { source: 'window' } })
}
function onUnhandledRejection(event: PromiseRejectionEvent) {
  error.value = event.reason instanceof Error ? event.reason : new Error(String(event.reason))
  reportMonitor({ type: 'unhandledrejection', message: error.value.message, stack: error.value.stack, meta: { source: 'promise' } })
}

onMounted(() => {
  window.addEventListener('error', onWindowError)
  window.addEventListener('unhandledrejection', onUnhandledRejection)
})
onUnmounted(() => {
  window.removeEventListener('error', onWindowError)
  window.removeEventListener('unhandledrejection', onUnhandledRejection)
})

// P0修复：使用 key 强制重建子树，确保确定性错误可被恢复
function retry() {
  error.value = null
  retryKey.value++
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
  <slot v-else :key="retryKey" />
</template>
