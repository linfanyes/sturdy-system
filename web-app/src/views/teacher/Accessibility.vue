<script setup lang="ts">
import { ref, onMounted } from 'vue'

/** 适老化 · 大字号模式：调节根字号，全站文字同步放大 */
const SCALES = [
  { px: 16, label: '标准', desc: '默认大小' },
  { px: 18, label: '大', desc: '适合多数长辈' },
  { px: 20, label: '特大', desc: '看得更清楚' },
  { px: 22, label: '超大', desc: '最大字号' },
]
const current = ref(16)

function apply(px: number) {
  current.value = px
  document.documentElement.style.fontSize = px + 'px'
  localStorage.setItem('fontScale', String(px))
}

onMounted(() => {
  const s = localStorage.getItem('fontScale')
  if (s) current.value = Number(s) || 16
})
</script>

<template>
  <div class="mx-auto max-w-3xl p-4">
    <div class="mb-4">
      <h1 class="text-xl font-semibold text-gray-800">适老化 · 大字号模式</h1>
      <p class="text-sm text-gray-500">一键放大全站文字，让长辈、视力较弱的用户也能轻松阅读。</p>
    </div>

    <div class="grid gap-3 sm:grid-cols-2">
      <button v-for="s in SCALES" :key="s.px" class="rounded-xl border p-4 text-left transition"
        :class="current === s.px ? 'border-sky-400 bg-sky-50' : 'border-gray-200 bg-white hover:border-sky-200'"
        @click="apply(s.px)">
        <div class="flex items-center justify-between">
          <span class="font-medium text-gray-800" :style="{ fontSize: s.px + 'px' }">{{ s.label }}</span>
          <span v-if="current === s.px" class="rounded-full bg-sky-600 px-2 py-0.5 text-xs text-white">使用中</span>
        </div>
        <div class="mt-1 text-sm text-gray-500">{{ s.desc }}</div>
        <div class="mt-2 text-gray-700" :style="{ fontSize: s.px + 'px' }">示例：今天也要加油呀</div>
      </button>
    </div>

    <div class="mt-4 rounded-xl bg-gray-50 p-4 text-sm text-gray-600">
      提示：设置会自动保存。刷新页面或下次进入后仍生效；若想恢复，选择「标准」即可。
    </div>
  </div>
</template>
