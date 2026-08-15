<script setup lang="ts">
import { ref } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { pushAllWeeklyReports } from '@/api/kidsCoding'
import { toast } from '@/utils/feedback'
import { Send, Loader2 } from 'lucide-vue-next'

const auth = useAuthStore()
const pushing = ref(false)
const result = ref<{ scanned: number; pushed: number; skipped: number } | null>(null)
const lastRun = ref('')

async function pushAll() {
  if (pushing.value) return
  pushing.value = true
  result.value = null
  try {
    const res = await pushAllWeeklyReports()
    result.value = { scanned: res.scanned, pushed: res.pushed, skipped: res.skipped }
    lastRun.value = new Date().toLocaleString()
    toast.success(`已推送 ${res.pushed} 份周报（扫描 ${res.scanned}，跳过 ${res.skipped}）`)
  } catch {
    toast.error('批量推送失败，请稍后重试')
  } finally {
    pushing.value = false
  }
}
</script>

<template>
  <div class="max-w-3xl mx-auto p-4 sm:p-6 space-y-5">
    <div class="bg-surface rounded-2xl shadow-softer p-5">
      <div class="flex items-center gap-2 mb-2">
        <Send class="w-5 h-5 text-cocoa-500" />
        <h2 class="text-lg font-bold text-cocoa-900">少儿编程 · 学习周报推送</h2>
      </div>
      <p class="text-sm text-cocoa-400 leading-relaxed">
        面向全校启用「少儿编程」功能包的学生，批量生成近 7 天学习周报并推送到家长消息中心。
        推送结果为站内信（type=coding_weekly），家长在消息中心可查看。建议配合外部定时任务（如每周一）调用本功能实现自动周报。
      </p>
    </div>

    <div class="bg-surface rounded-2xl shadow-softer p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
      <div>
        <div class="font-medium text-cocoa-900">全校周报批量推送</div>
        <div class="text-xs text-cocoa-400 mt-1">
          操作人：{{ auth.user?.name || auth.role || '超管' }} · 仅向有编程作品的学生推送
        </div>
      </div>
      <button
        class="inline-flex items-center justify-center gap-2 rounded-xl bg-cocoa-500 text-white px-5 py-2.5 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:bg-cocoa-600 transition-colors"
        :disabled="pushing"
        @click="pushAll"
      >
        <Loader2 v-if="pushing" class="w-4 h-4 animate-spin" />
        <Send v-else class="w-4 h-4" />
        {{ pushing ? '推送中…' : '立即推送全校周报' }}
      </button>
    </div>

    <div v-if="result" class="bg-surface rounded-2xl shadow-softer p-5">
      <div class="text-sm font-medium text-cocoa-900 mb-3">本次推送结果</div>
      <div class="grid grid-cols-3 gap-3 text-center">
        <div class="rounded-xl bg-cocoa-50 p-3">
          <div class="text-2xl font-bold text-cocoa-900">{{ result.scanned }}</div>
          <div class="text-xs text-cocoa-400 mt-1">扫描学生</div>
        </div>
        <div class="rounded-xl bg-green-50 p-3">
          <div class="text-2xl font-bold text-green-600">{{ result.pushed }}</div>
          <div class="text-xs text-cocoa-400 mt-1">已推送</div>
        </div>
        <div class="rounded-xl bg-cocoa-50 p-3">
          <div class="text-2xl font-bold text-cocoa-900">{{ result.skipped }}</div>
          <div class="text-xs text-cocoa-400 mt-1">跳过</div>
        </div>
      </div>
      <div v-if="lastRun" class="text-xs text-cocoa-400 mt-3">执行时间：{{ lastRun }}</div>
    </div>
  </div>
</template>
