<script setup lang="ts">
import { ref, onErrorCaptured, onMounted, onUnmounted } from 'vue'
import { reportMonitor } from '@/utils/monitor'

const error = ref<Error | null>(null)
const retryKey = ref(0)

// P1修复：防止同一错误被 onErrorCaptured 和 window.onerror 重复上报
const reportedErrors = new Set<string>()
function reportOnce(type: string, message: string, stack: string | undefined, source: string) {
  const key = `${type}:${message}:${stack?.slice(0, 200) || ''}`
  if (reportedErrors.has(key)) return
  reportedErrors.add(key)
  // 防止 Set 无限增长
  if (reportedErrors.size > 100) {
    const first = reportedErrors.values().next().value
    if (first) reportedErrors.delete(first)
  }
  reportMonitor({ type, message, stack, meta: { source } })
}

onErrorCaptured((err: unknown) => {
  error.value = err instanceof Error ? err : new Error(String(err))
  console.error('[ErrorBoundary]', err)
  reportOnce('error', error.value.message, error.value.stack, 'component')
  return false
})

// P0修复：兜底捕获异步错误（onMounted/setTimeout/事件处理器中的异常）
function onWindowError(event: ErrorEvent) {
  error.value = event.error || new Error(event.message)
  reportOnce('error', error.value.message, error.value.stack, 'window')
}
function onUnhandledRejection(event: PromiseRejectionEvent) {
  error.value = event.reason instanceof Error ? event.reason : new Error(String(event.reason))
  reportOnce('unhandledrejection', error.value.message, error.value.stack, 'promise')
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
