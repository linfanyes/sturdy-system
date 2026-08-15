<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { getMyInsights, regenerateInsight } from '@/api/insight'

const loading = ref(true)
const list = ref<any[]>([])
const regenerating = ref<string | null>(null)

async function load() {
  loading.value = true
  try {
    list.value = await getMyInsights()
  } finally {
    loading.value = false
  }
}

async function regenerate(c: any) {
  regenerating.value = c.classId
  try {
    const fresh = await regenerateInsight(c.classId)
    const idx = list.value.findIndex((x) => x.classId === c.classId)
    if (idx >= 0) list.value[idx] = fresh
  } catch (e: any) {
    alert('重新生成失败：' + (e?.message || e))
  } finally {
    regenerating.value = null
  }
}

const emotionLabel = (v: number | null) =>
  v == null ? '—' : v >= 4 ? '状态积极' : v >= 3 ? '平稳' : v >= 2 ? '偏低' : '需关注'

onMounted(load)
</script>

<template>
  <div class="mx-auto max-w-5xl p-4">
    <div class="mb-4 flex items-center justify-between">
      <div>
        <h1 class="text-xl font-semibold text-gray-800">班级洞察</h1>
        <p class="text-sm text-gray-500">AI 班级助教每周一自动汇总各班情绪与学业，并推送到你的消息中心。</p>
      </div>
      <button class="rounded-lg bg-blue-600 px-3 py-2 text-sm text-white hover:bg-blue-700" @click="load">刷新</button>
    </div>

    <div v-if="loading" class="text-sm text-gray-400">加载中…</div>
    <div v-else-if="!list.length" class="rounded-xl border border-dashed border-gray-300 p-10 text-center text-gray-400">
      暂无可分析的班级（需先录入成绩或学生心情数据）。
    </div>

    <div v-else class="grid gap-4">
      <div v-for="c in list" :key="c.classId" class="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
        <div class="mb-3 flex items-start justify-between">
          <div>
            <div class="text-lg font-semibold text-gray-800">{{ c.className }}</div>
            <div class="text-xs text-gray-400">{{ c.weekLabel }} · {{ c.weekStart }} ~ {{ c.weekEnd }}</div>
          </div>
          <span class="rounded-full bg-gray-100 px-2 py-1 text-xs text-gray-500">
            {{ c.generatedBy === 'ai' ? 'AI 生成' : '模板生成' }}
          </span>
        </div>

        <div class="mb-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div class="rounded-lg bg-gray-50 p-3">
            <div class="text-xs text-gray-400">情绪均值</div>
            <div class="text-lg font-semibold" :class="(c.emotionAvg ?? 3) >= 3 ? 'text-green-600' : 'text-orange-600'">
              {{ c.emotionAvg != null ? c.emotionAvg.toFixed(1) : '—' }}/5
            </div>
            <div class="text-[11px] text-gray-400">{{ emotionLabel(c.emotionAvg) }}</div>
          </div>
          <div class="rounded-lg bg-gray-50 p-3">
            <div class="text-xs text-gray-400">连续低落</div>
            <div class="text-lg font-semibold" :class="c.lowMoodCount > 0 ? 'text-red-600' : 'text-gray-700'">{{ c.lowMoodCount }} 人</div>
            <div class="text-[11px] text-gray-400">需私聊关怀</div>
          </div>
          <div class="rounded-lg bg-gray-50 p-3">
            <div class="text-xs text-gray-400">学业均分</div>
            <div class="text-lg font-semibold text-gray-700">{{ c.gradeLatestAvg != null ? c.gradeLatestAvg.toFixed(1) : '—' }}</div>
            <div class="text-[11px] text-gray-400">较上次 {{ c.gradeDelta != null ? (c.gradeDelta >= 0 ? '+' : '') + c.gradeDelta : '—' }}</div>
          </div>
          <div class="rounded-lg bg-gray-50 p-3">
            <div class="text-xs text-gray-400">进退步</div>
            <div class="text-lg font-semibold text-gray-700">↑{{ c.gradeImproved?.length || 0 }} ↓{{ c.gradeDeclined?.length || 0 }}</div>
            <div class="text-[11px] text-gray-400">进步 / 下滑</div>
          </div>
        </div>

        <div class="rounded-lg bg-blue-50 p-3 text-sm leading-relaxed text-gray-700">{{ c.summary }}</div>

        <div v-if="c.lowMoodStudents?.length" class="mt-3">
          <div class="mb-1 text-xs font-medium text-gray-500">连续低落学生</div>
          <div class="flex flex-wrap gap-2">
            <span v-for="s in c.lowMoodStudents" :key="s.studentId" class="rounded-full bg-red-50 px-2 py-1 text-xs text-red-600">
              {{ s.studentName || '某同学' }}（连 {{ s.delta }} 天）
            </span>
          </div>
        </div>

        <div class="mt-3 flex justify-end">
          <button
            class="rounded-lg border border-blue-200 px-3 py-1.5 text-sm text-blue-600 hover:bg-blue-50 disabled:opacity-50"
            :disabled="regenerating === c.classId"
            @click="regenerate(c)"
          >
            {{ regenerating === c.classId ? '生成中…' : '重新生成并推送' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
