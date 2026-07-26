<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import request from '@/api/request'
import { loadClasses, useClasses } from '@/composables/useClasses'
import { BarChart3, TrendingUp } from 'lucide-vue-next'

const { classes } = useClasses()
onMounted(() => loadClasses())

const classId = ref('')
const exams = ref<any[]>([])
const grades = ref<any[]>([])
const selectedExamId = ref('')
const loading = ref(false)

interface SubjectStat {
  subject: string
  count: number
  avg: number
  max: number
  min: number
  passRate: number
  excellentRate: number
}

const stats = computed<SubjectStat[]>(() => {
  if (!selectedExamId.value) return []
  const exam = exams.value.find(e => e.id === selectedExamId.value)
  if (!exam) return []
  const result: SubjectStat[] = []
  for (const subject of exam.subjects || []) {
    const grade = grades.value.find(g => (g.examId === exam.id || g.examName === exam.name) && g.subject === subject)
    if (!grade) continue
    const scores = (grade.scores || []).filter((s: any) => s.score != null).map((s: any) => Number(s.score))
    if (!scores.length) continue
    const total = scores.reduce((a: number, b: number) => a + b, 0)
    const avg = total / scores.length
    const max = Math.max(...scores)
    const min = Math.min(...scores)
    const fullScore = exam.subjectFullScores?.[subject] || 100
    const passCount = scores.filter((s: number) => s >= fullScore * 0.6).length
    const excellentCount = scores.filter((s: number) => s >= fullScore * 0.85).length
    result.push({
      subject,
      count: scores.length,
      avg: Math.round(avg * 10) / 10,
      max,
      min,
      passRate: Math.round((passCount / scores.length) * 100),
      excellentRate: Math.round((excellentCount / scores.length) * 100),
    })
  }
  return result
})

async function loadData() {
  if (!classId.value) { exams.value = []; grades.value = []; return }
  loading.value = true
  try {
    const [ex, gr] = await Promise.all([
      request.get('/exams', { params: { classId: classId.value } }),
      request.get('/grades', { params: { classId: classId.value } }),
    ])
    exams.value = Array.isArray(ex) ? ex : (ex?.items || [])
    grades.value = Array.isArray(gr) ? gr : (gr?.items || [])
  } catch { exams.value = []; grades.value = [] } finally { loading.value = false }
}

async function onClassChange() {
  selectedExamId.value = ''
  await loadData()
}
</script>

<template>
  <div class="space-y-4">
    <h1 class="text-2xl font-bold text-cocoa-900 flex items-center gap-2">
      <BarChart3 class="w-6 h-6 text-butter-500" /> 数据统计
    </h1>

    <div class="bg-white rounded-2xl p-6 shadow-softer">
      <div class="grid grid-cols-2 gap-4">
        <div>
          <label class="text-sm text-cocoa-500">班级</label>
          <select v-model="classId" @change="onClassChange" class="w-full mt-1 px-3 py-2 rounded-xl border border-cream-200 focus:outline-none focus:border-butter-400">
            <option value="">请选择</option>
            <option v-for="c in classes" :key="c.id" :value="c.id">{{ c.name }}</option>
          </select>
        </div>
        <div>
          <label class="text-sm text-cocoa-500">考试</label>
          <select v-model="selectedExamId" class="w-full mt-1 px-3 py-2 rounded-xl border border-cream-200 focus:outline-none focus:border-butter-400">
            <option value="">请选择</option>
            <option v-for="e in exams" :key="e.id" :value="e.id">{{ e.name }}（{{ e.date }}）</option>
          </select>
        </div>
      </div>
    </div>

    <div v-if="loading" class="text-cocoa-400 text-sm py-4 text-center">加载中…</div>

    <div v-else-if="stats.length" class="table-wrap">
      <table class="w-full text-sm">
        <thead class="bg-cream-100 text-cocoa-500 text-left">
          <tr>
            <th class="px-4 py-3 font-medium">科目</th>
            <th class="px-4 py-3 font-medium">参考人数</th>
            <th class="px-4 py-3 font-medium">平均分</th>
            <th class="px-4 py-3 font-medium">最高分</th>
            <th class="px-4 py-3 font-medium">最低分</th>
            <th class="px-4 py-3 font-medium">及格率</th>
            <th class="px-4 py-3 font-medium">优秀率</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-cream-100">
          <tr v-for="s in stats" :key="s.subject" class="hover:bg-cream-50">
            <td class="px-4 py-3 font-medium text-cocoa-900">{{ s.subject }}</td>
            <td class="px-4 py-3 text-cocoa-700">{{ s.count }}</td>
            <td class="px-4 py-3 text-butter-600 font-semibold">{{ s.avg }}</td>
            <td class="px-4 py-3 text-mint-500">{{ s.max }}</td>
            <td class="px-4 py-3 text-red-500">{{ s.min }}</td>
            <td class="px-4 py-3 text-cocoa-700">{{ s.passRate }}%</td>
            <td class="px-4 py-3 text-cocoa-700">{{ s.excellentRate }}%</td>
          </tr>
        </tbody>
      </table>
    </div>

    <div v-else-if="selectedExamId" class="text-cocoa-400 text-sm py-8 text-center">
      <TrendingUp class="w-8 h-8 mx-auto mb-2 text-cocoa-300" />
      该考试暂无成绩数据
    </div>
  </div>
</template>
