<script setup lang="ts">
/**
 * 考试进退步对比
 * 选择同班级两次考试，对比每位学生的总分变化和排名变化
 */
import { ref, computed, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { toast } from '@/utils/feedback'
import { loadClasses, useClasses } from '@/composables/useClasses'
import { listExams, getClassRank } from '@/api/teacher'
import {
  ArrowLeft, TrendingUp, TrendingDown, Minus, Trophy, AlertTriangle,
} from 'lucide-vue-next'

const router = useRouter()
const { classes } = useClasses()
onMounted(() => loadClasses())

const classId = ref('')
const examA = ref('')
const examB = ref('')

const exams = ref<any[]>([])
const filteredExams = computed(() => {
  if (!classId.value) return []
  return exams.value.filter(e => e.classId === classId.value)
})

const loading = ref(false)
const comparison = ref<any[]>([])

watch(classId, () => {
  examA.value = ''
  examB.value = ''
  comparison.value = []
})

watch([classId, examA, examB], () => {
  if (classId.value && examA.value && examB.value) {
    loadComparison()
  } else {
    comparison.value = []
  }
})

async function loadExams() {
  if (!classId.value) { exams.value = []; return }
  try {
    const res = await listExams({ classId: classId.value, take: 100 })
    exams.value = Array.isArray(res) ? res : (res?.items || [])
  } catch { exams.value = [] }
}

watch(classId, loadExams)

async function loadComparison() {
  if (!classId.value || !examA.value || !examB.value) return
  loading.value = true
  comparison.value = []
  try {
    const [rankA, rankB] = await Promise.all([
      getClassRank(classId.value, examA.value),
      getClassRank(classId.value, examB.value),
    ])
    const mapA = new Map((rankA?.ranks || []).map((r: any) => [r.studentId, r]))
    const mapB = new Map((rankB?.ranks || []).map((r: any) => [r.studentId, r]))

    const studentIds = new Set([...mapA.keys(), ...mapB.keys()])
    const rows: any[] = []
    for (const sid of studentIds) {
      const a = mapA.get(sid)
      const b = mapB.get(sid)
      if (!a || !b) continue
      const delta = (b.score || 0) - (a.score || 0)
      const rankDelta = (a.rank || 0) - (b.rank || 0) // 正数=进步
      rows.push({
        studentId: sid,
        name: a.studentName || b.studentName || '—',
        scoreA: a.score,
        rankA: a.rank,
        scoreB: b.score,
        rankB: b.rank,
        delta,
        rankDelta,
      })
    }
    rows.sort((a, b) => b.delta - a.delta)
    comparison.value = rows
  } catch (e: any) {
    toast.error(e?.message || '加载对比数据失败')
  } finally {
    loading.value = false
  }
}

function trendIcon(delta: number) {
  if (delta > 0) return 'up'
  if (delta < 0) return 'down'
  return 'same'
}

function goStudentGrades(studentId: string) {
  router.push({ path: '/teacher/student-grades', query: { studentId, classId: classId.value } })
}
</script>

<template>
  <div class="space-y-4">
    <div class="flex items-center gap-3">
      <button class="p-2 rounded-xl hover:bg-cream-100 text-cocoa-500" @click="router.back()">
        <ArrowLeft class="w-5 h-5" />
      </button>
      <h1 class="text-2xl font-bold text-cocoa-900 flex items-center gap-2">
        <TrendingUp class="w-6 h-6 text-butter-500" /> 考试进退步对比
      </h1>
    </div>

    <div class="bg-surface rounded-2xl p-4 shadow-softer">
      <div class="flex items-center gap-3 flex-wrap">
        <select v-model="classId" class="px-3 py-2 rounded-xl border border-cream-200 text-sm focus:outline-none focus:border-butter-400">
          <option value="">选择班级</option>
          <option v-for="c in classes" :key="c.id" :value="c.id">{{ c.name }}</option>
        </select>
        <select v-model="examA" class="px-3 py-2 rounded-xl border border-cream-200 text-sm focus:outline-none focus:border-butter-400" :disabled="!classId">
          <option value="">考试 A（基准）</option>
          <option v-for="e in filteredExams" :key="e.id" :value="e.id">{{ e.name }}（{{ e.date }}）</option>
        </select>
        <select v-model="examB" class="px-3 py-2 rounded-xl border border-cream-200 text-sm focus:outline-none focus:border-butter-400" :disabled="!classId">
          <option value="">考试 B（对比）</option>
          <option v-for="e in filteredExams" :key="e.id" :value="e.id">{{ e.name }}（{{ e.date }}）</option>
        </select>
      </div>
    </div>

    <div v-if="loading" class="text-center py-12 text-cocoa-400 flex items-center justify-center gap-2">
      <Trophy class="w-5 h-5 animate-spin" /> 加载中…
    </div>

    <div v-else-if="!comparison.length && examA && examB" class="bg-surface rounded-2xl p-10 shadow-softer text-center text-cocoa-400">
      暂无对比数据
    </div>

    <div v-else-if="comparison.length" class="bg-surface rounded-2xl p-4 shadow-softer overflow-x-auto">
      <table class="w-full text-sm">
        <thead class="bg-cream-100 text-cocoa-500 text-left sticky top-0">
          <tr>
            <th class="px-3 py-2 font-medium">姓名</th>
            <th class="px-3 py-2 font-medium text-right">考试 A 分数</th>
            <th class="px-3 py-2 font-medium text-right">考试 A 排名</th>
            <th class="px-3 py-2 font-medium text-right">考试 B 分数</th>
            <th class="px-3 py-2 font-medium text-right">考试 B 排名</th>
            <th class="px-3 py-2 font-medium text-right">分数变化</th>
            <th class="px-3 py-2 font-medium text-right">排名变化</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-cream-100">
          <tr v-for="r in comparison" :key="r.studentId" class="hover:bg-cream-50">
            <td class="px-3 py-2 font-medium text-butter-600 cursor-pointer hover:underline" @click="goStudentGrades(r.studentId)">
              {{ r.name }}
            </td>
            <td class="px-3 py-2 text-right">{{ r.scoreA }}</td>
            <td class="px-3 py-2 text-right text-cocoa-500">{{ r.rankA }}</td>
            <td class="px-3 py-2 text-right">{{ r.scoreB }}</td>
            <td class="px-3 py-2 text-right text-cocoa-500">{{ r.rankB }}</td>
            <td class="px-3 py-2 text-right font-semibold" :class="r.delta > 0 ? 'text-mint-500' : r.delta < 0 ? 'text-red-500' : 'text-cocoa-500'">
              <span v-if="r.delta > 0">+</span>{{ r.delta.toFixed(1) }}
            </td>
            <td class="px-3 py-2 text-right font-semibold" :class="r.rankDelta > 0 ? 'text-mint-500' : r.rankDelta < 0 ? 'text-red-500' : 'text-cocoa-500'">
              <span v-if="r.rankDelta > 0">+</span>{{ r.rankDelta }}
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <div v-else class="bg-surface rounded-2xl p-10 shadow-softer text-center text-cocoa-400">
      请先选择班级和两次考试
    </div>
  </div>
</template>
