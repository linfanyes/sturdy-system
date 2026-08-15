<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useClasses } from '@/composables/useClasses'
import { getReports, getLatestReport, generateReport } from '@/api/report'

const { classes, loadClasses } = useClasses()
const classId = ref('')
const type = ref<'weekly' | 'monthly'>('weekly')
const latest = ref<any>(null)
const list = ref<any[]>([])
const loading = ref(false)
const genLoading = ref(false)

const metrics = computed(() => {
  if (!latest.value?.metrics) return null
  try {
    return JSON.parse(latest.value.metrics)
  } catch {
    return null
  }
})

async function load() {
  if (!classId.value) return
  loading.value = true
  try {
    const [l, arr] = await Promise.all([
      getLatestReport(classId.value, type.value),
      getReports(classId.value, type.value),
    ])
    latest.value = l
    list.value = arr || []
  } finally {
    loading.value = false
  }
}
async function gen() {
  genLoading.value = true
  try {
    await generateReport({ classId: classId.value, type: type.value })
    await load()
  } finally {
    genLoading.value = false
  }
}

onMounted(async () => {
  await loadClasses()
  if (classes.value.length) {
    classId.value = classes.value[0].id
    load()
  }
})
watch([classId, type], load)
</script>

<template>
  <div class="mx-auto max-w-4xl p-4">
    <div class="mb-4 flex flex-wrap items-center gap-3">
      <h2 class="text-xl font-semibold text-gray-800">班级周/月报</h2>
      <select v-model="classId" class="rounded border border-gray-300 px-3 py-1.5 text-sm">
        <option v-for="c in classes" :key="c.id" :value="c.id">{{ c.name }}</option>
      </select>
      <div class="flex overflow-hidden rounded border border-gray-300 text-sm">
        <button class="px-3 py-1.5" :class="type === 'weekly' ? 'bg-sky-500 text-white' : 'bg-white text-gray-600'" @click="type = 'weekly'">周报</button>
        <button class="px-3 py-1.5" :class="type === 'monthly' ? 'bg-sky-500 text-white' : 'bg-white text-gray-600'" @click="type = 'monthly'">月报</button>
      </div>
      <button class="rounded bg-sky-500 px-3 py-1.5 text-sm text-white hover:bg-sky-600 disabled:opacity-50" :disabled="genLoading" @click="gen">
        {{ genLoading ? '生成中…' : '立即生成' }}
      </button>
    </div>

    <div v-if="loading" class="rounded-lg border border-gray-200 bg-white p-6 text-center text-gray-400">加载中…</div>

    <template v-else>
      <div v-if="latest" class="rounded-lg border border-gray-200 bg-white p-5">
        <div class="mb-3 flex items-center justify-between">
          <h3 class="font-semibold text-gray-800">{{ latest.title }}</h3>
          <span class="text-xs text-gray-400">{{ latest.fromDate }} ~ {{ latest.toDate }}</span>
        </div>
        <div v-if="metrics" class="mb-4 grid grid-cols-3 gap-2 text-center sm:grid-cols-6">
          <div class="rounded bg-gray-50 py-2">
            <div class="text-lg font-semibold text-gray-800">{{ metrics.studentCount }}</div>
            <div class="text-xs text-gray-500">学生</div>
          </div>
          <div class="rounded bg-gray-50 py-2">
            <div class="text-lg font-semibold text-gray-800">{{ metrics.gradeCount }}</div>
            <div class="text-xs text-gray-500">成绩记录</div>
          </div>
          <div class="rounded bg-gray-50 py-2">
            <div class="text-lg font-semibold text-gray-800">{{ metrics.subjects }}</div>
            <div class="text-xs text-gray-500">学科</div>
          </div>
          <div class="rounded bg-gray-50 py-2">
            <div class="text-lg font-semibold text-rose-500">{{ metrics.moodAlert }}</div>
            <div class="text-xs text-gray-500">情绪关注</div>
          </div>
          <div class="rounded bg-gray-50 py-2">
            <div class="text-lg font-semibold text-emerald-500">{{ metrics.habitCheckins }}</div>
            <div class="text-xs text-gray-500">习惯打卡</div>
          </div>
          <div class="rounded bg-gray-50 py-2">
            <div class="text-lg font-semibold text-amber-500">{{ metrics.safetyOpen }}</div>
            <div class="text-xs text-gray-500">安全事项</div>
          </div>
        </div>
        <div class="whitespace-pre-wrap text-sm leading-relaxed text-gray-700">{{ latest.content }}</div>
      </div>
      <div v-else class="rounded-lg border border-dashed border-gray-200 bg-white p-6 text-center text-gray-400">
        暂无{{ type === 'weekly' ? '周报' : '月报' }}，点击「立即生成」（或每周一 / 每月 1 号将自动生成并推送）。
      </div>

      <div v-if="list.length" class="mt-4">
        <h4 class="mb-2 text-sm font-medium text-gray-500">历史报告</h4>
        <div class="space-y-2">
          <button
            v-for="r in list"
            :key="r.id"
            class="flex w-full items-center justify-between rounded border border-gray-200 bg-white px-3 py-2 text-left text-sm hover:bg-sky-50"
            @click="latest = r"
          >
            <span class="text-gray-700">{{ r.title }}</span>
            <span class="text-xs text-gray-400">{{ r.periodLabel }}</span>
          </button>
        </div>
      </div>
    </template>
  </div>
</template>
