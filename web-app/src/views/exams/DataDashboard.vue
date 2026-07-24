<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import request from '@/api/request'
import { loadClasses, useClasses } from '@/composables/useClasses'
import { BarChart3 } from 'lucide-vue-next'

const { classes } = useClasses()
onMounted(() => loadClasses())

const classId = ref('')
const exams = ref<any[]>([])
const grades = ref<any[]>([])
const loading = ref(false)

async function loadData() {
  if (!classId.value) return
  loading.value = true
  try {
    const [ex, gr] = await Promise.all([
      request.get('/exams', { params: { classId: classId.value } }),
      request.get('/grades', { params: { classId: classId.value } }),
    ])
    exams.value = (Array.isArray(ex) ? ex : (ex?.items || [])).sort((a: any, b: any) => (a.date || '').localeCompare(b.date || ''))
    grades.value = Array.isArray(gr) ? gr : (gr?.items || [])
  } catch { exams.value = []; grades.value = [] } finally { loading.value = false }
}

/** 各科目历次考试均分趋势 */
const trendData = computed(() => {
  if (!exams.value.length || !grades.value.length) return []
  const subjectSet = new Set<string>()
  for (const g of grades.value) subjectSet.add(g.subject)
  const subjects = Array.from(subjectSet)
  return subjects.map(subject => {
    const points: { examName: string; avg: number }[] = []
    for (const exam of exams.value) {
      const grade = grades.value.find(g => (g.examId === exam.id || g.examName === exam.name) && g.subject === subject)
      if (!grade) continue
      const scores = (grade.scores || []).filter((s: any) => s.score != null).map((s: any) => Number(s.score))
      if (!scores.length) continue
      const avg = scores.reduce((a: number, b: number) => a + b, 0) / scores.length
      points.push({ examName: exam.name, avg: Math.round(avg * 10) / 10 })
    }
    return { subject, points }
  }).filter(d => d.points.length > 0)
})

/** 柱状图：最近一次考试各科均分 */
const latestBar = computed(() => {
  if (!exams.value.length) return null
  const latest = exams.value[exams.value.length - 1]
  const bars: { subject: string; avg: number; full: number }[] = []
  for (const subject of latest.subjects || []) {
    const grade = grades.value.find(g => (g.examId === latest.id || g.examName === latest.name) && g.subject === subject)
    if (!grade) continue
    const scores = (grade.scores || []).filter((s: any) => s.score != null).map((s: any) => Number(s.score))
    if (!scores.length) continue
    const avg = scores.reduce((a: number, b: number) => a + b, 0) / scores.length
    bars.push({ subject, avg: Math.round(avg * 10) / 10, full: latest.subjectFullScores?.[subject] || 100 })
  }
  return { examName: latest.name, bars }
})

const barMax = computed(() => {
  if (!latestBar.value) return 100
  return Math.max(...latestBar.value.bars.map(b => b.full), 100)
})
</script>

<template>
  <div class="space-y-4">
    <h1 class="text-2xl font-bold text-cocoa-900 flex items-center gap-2">
      <BarChart3 class="w-6 h-6 text-butter-500" /> 数据看板
    </h1>

    <div class="bg-white rounded-2xl p-6 shadow-softer">
      <label class="text-sm text-cocoa-500">班级</label>
      <select v-model="classId" @change="loadData" class="w-full mt-1 px-3 py-2 rounded-xl border border-cream-200 focus:outline-none focus:border-butter-400 max-w-xs">
        <option value="">请选择</option>
        <option v-for="c in classes" :key="c.id" :value="c.id">{{ c.name }}</option>
      </select>
    </div>

    <div v-if="loading" class="text-cocoa-400 text-sm py-4 text-center">加载中…</div>

    <!-- 最近考试柱状图 -->
    <div v-else-if="latestBar" class="bg-white rounded-2xl p-6 shadow-softer">
      <div class="text-cocoa-700 font-medium mb-4">{{ latestBar.examName }} · 各科均分</div>
      <div class="space-y-3">
        <div v-for="b in latestBar.bars" :key="b.subject" class="flex items-center gap-3">
          <div class="w-16 text-sm text-cocoa-500 text-right">{{ b.subject }}</div>
          <div class="flex-1 bg-cream-50 rounded-full h-7 relative overflow-hidden">
            <div class="h-full bg-butter-400 rounded-full flex items-center justify-end px-2" :style="{ width: (b.avg / barMax * 100) + '%' }">
              <span class="text-xs text-white font-semibold">{{ b.avg }}</span>
            </div>
          </div>
          <div class="w-12 text-xs text-cocoa-400">/ {{ b.full }}</div>
        </div>
      </div>
    </div>

    <!-- 趋势表 -->
    <div v-if="trendData.length" class="bg-white rounded-2xl shadow-softer overflow-hidden">
      <div class="px-4 py-3 text-cocoa-700 font-medium">各科目历次考试均分趋势</div>
      <table class="w-full text-sm">
        <thead class="bg-cream-100 text-cocoa-500 text-left">
          <tr>
            <th class="px-4 py-3 font-medium">科目</th>
            <th v-for="ex in exams" :key="ex.id" class="px-4 py-3 font-medium">{{ ex.name }}</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-cream-100">
          <tr v-for="d in trendData" :key="d.subject" class="hover:bg-cream-50">
            <td class="px-4 py-3 font-medium text-cocoa-900">{{ d.subject }}</td>
            <td v-for="ex in exams" :key="ex.id" class="px-4 py-3 text-cocoa-700">
              {{ d.points.find(p => p.examName === ex.name)?.avg ?? '-' }}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>
