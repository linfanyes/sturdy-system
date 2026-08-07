<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { toast } from '@/utils/feedback'
import {
  getStudent, listAwards, listGrades, getStudentHistory, type TeacherStudent,
} from '@/api/teacher'
import request from '@/api/request'
import {
  ArrowLeft, User, Phone, Users, BookOpen, Trophy, Calendar,
  Mail, MapPin, IdCard, TrendingUp,
} from 'lucide-vue-next'

const route = useRoute()
const router = useRouter()

const studentId = computed(() => route.params.id as string)
const loading = ref(false)
const student = ref<TeacherStudent | null>(null)
const awards = ref<any[]>([])
const recentGrades = ref<any[]>([])
const history = ref<any[]>([])
const trendLoading = ref(false)

const className = computed(() => {
  // Reuse class name lookup from classes store
  const clsList = JSON.parse(localStorage.getItem('g_classes') || '[]')
  const found = clsList.find((c: any) => c.id === student.value?.classId)
  return found?.name || student.value?.classId || '-'
})

/* ============ 成绩趋势图 ============ */
const examTrend = computed(() => {
  const map = new Map<string, { examName: string; date: string; scores: number[]; classAvgs: number[] }>()
  for (const h of history.value) {
    if (!h.examId) continue
    const key = h.examId
    if (!map.has(key)) {
      map.set(key, { examName: h.examName || '', date: h.date || '', scores: [], classAvgs: [] })
    }
    const entry = map.get(key)!
    if (h.score != null) entry.scores.push(Number(h.score))
    if (h.classAvg != null) entry.classAvgs.push(Number(h.classAvg))
  }
  return Array.from(map.values())
    .map(e => ({
      ...e,
      avg: e.scores.length ? Math.round(e.scores.reduce((a, b) => a + b, 0) / e.scores.length * 10) / 10 : null,
      classAvg: e.classAvgs.length ? Math.round(e.classAvgs.reduce((a, b) => a + b, 0) / e.classAvgs.length * 10) / 10 : null,
    }))
    .sort((a, b) => (a.date || '').localeCompare(b.date || ''))
})

const CHART_W = 700
const CHART_H = 200
const CHART_PAD = { top: 20, right: 20, bottom: 30, left: 40 }

const trendChart = computed(() => {
  const data = examTrend.value
  if (!data.length) return null
  const n = data.length
  const plotW = CHART_W - CHART_PAD.left - CHART_PAD.right
  const plotH = CHART_H - CHART_PAD.top - CHART_PAD.bottom
  const scores = data.flatMap(d => [d.avg, d.classAvg].filter((s): s is number => s != null))
  const maxY = Math.max(100, ...scores)
  const minY = Math.min(0, ...scores)
  const yRange = maxY - minY || 100

  const studentPoints = data.map((d, i) => {
    const x = n <= 1 ? CHART_PAD.left + plotW / 2 : CHART_PAD.left + (i / (n - 1)) * plotW
    const y = d.avg != null ? CHART_PAD.top + plotH - ((d.avg - minY) / yRange) * plotH : null
    return { x, y, label: d.examName, avg: d.avg }
  }).filter((p): p is { x: number; y: number; label: string; avg: number } => p.y != null)

  const classPoints = data.map((d, i) => {
    const x = n <= 1 ? CHART_PAD.left + plotW / 2 : CHART_PAD.left + (i / (n - 1)) * plotW
    const y = d.classAvg != null ? CHART_PAD.top + plotH - ((d.classAvg - minY) / yRange) * plotH : null
    return { x, y }
  }).filter((p): p is { x: number; y: number } => p.y != null)

  const studentPath = studentPoints.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ')
  const classPath = classPoints.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ')

  const ticks = [0, 25, 50, 75, 100].map(v => ({ v, y: CHART_PAD.top + plotH - ((v - minY) / yRange) * plotH }))

  return { CHART_W, CHART_H, CHART_PAD, plotW, plotH, studentPoints, classPoints, studentPath, classPath, ticks, maxY, minY, data }
})

async function load() {
  loading.value = true
  try {
    const [stu, aw, grd, hist] = await Promise.allSettled([
      getStudent(studentId.value),
      listAwards(student.value?.classId || ''),
      listGrades({ studentId: studentId.value, take: 10 }),
      loadHistory(),
    ])
    if (stu.status === 'fulfilled') student.value = stu.value
    else toast.error('加载学生信息失败')

    if (aw.status === 'fulfilled') awards.value = (aw.value as any)?.items || aw.value || []
    if (grd.status === 'fulfilled') recentGrades.value = (grd.value as any)?.items || grd.value || []
  } catch (e: any) {
    toast.error(e?.message || '加载失败')
  } finally {
    loading.value = false
  }
}

async function loadHistory() {
  trendLoading.value = true
  try {
    const data = await getStudentHistory(studentId.value)
    history.value = data?.history || []
  } catch {
    history.value = []
  } finally {
    trendLoading.value = false
  }
}

onMounted(() => {
  if (!studentId.value) { router.back(); return }
  load()
})

function goGrades() {
  router.push({ path: '/teacher/student-grades', query: { studentId: studentId.value, classId: student.value?.classId } })
}
function goAttendance() {
  router.push({ path: '/teacher/attendance', query: { studentId: studentId.value } })
}
function goAwards() {
  router.push({ path: '/teacher/awards', query: { studentId: studentId.value } })
}
function goBack() {
  router.back()
}
</script>

<template>
  <div class="space-y-4">
    <!-- 顶栏 -->
    <div class="flex items-center gap-3">
      <button class="p-2 rounded-xl hover:bg-cream-100 text-cocoa-500" @click="goBack">
        <ArrowLeft class="w-5 h-5" />
      </button>
      <h1 class="text-2xl font-bold text-cocoa-900">学生详情</h1>
    </div>

    <div v-if="loading" class="flex items-center justify-center py-12 text-cocoa-400">
      <Loader2 class="w-6 h-6 animate-spin mr-2" /> 加载中…
    </div>

    <div v-else-if="!student" class="text-center text-cocoa-400 py-12">未找到该学生信息</div>

    <div v-else class="grid grid-cols-1 md:grid-cols-3 gap-4">
      <!-- 左侧：基本信息 -->
      <div class="md:col-span-2 space-y-4">
        <!-- 基本信息卡 -->
        <div class="bg-surface rounded-2xl p-6 shadow-softer border border-cream-200">
          <div class="flex items-center gap-3 mb-4">
            <div class="w-12 h-12 rounded-full bg-butter-100 flex items-center justify-center text-butter-600 text-lg font-bold">
              {{ student.name?.[0] || '?' }}
            </div>
            <div>
              <div class="text-xl font-bold text-cocoa-900">{{ student.name }}</div>
              <div class="text-sm text-cocoa-500">{{ student.gender || '未知性别' }} · {{ student.studentNo || '无学号' }}</div>
            </div>
          </div>
          <div class="grid grid-cols-2 gap-3 text-sm">
            <div class="flex items-center gap-2 text-cocoa-600">
              <IdCard class="w-4 h-4 text-cocoa-400" /> 学号：{{ student.studentNo || '-' }}
            </div>
            <div class="flex items-center gap-2 text-cocoa-600">
              <Users class="w-4 h-4 text-cocoa-400" /> 班级：{{ className }}
            </div>
            <div class="flex items-center gap-2 text-cocoa-600">
              <Mail class="w-4 h-4 text-cocoa-400" /> 学生电话：{{ student.studentPhone || '-' }}
            </div>
            <div class="flex items-center gap-2 text-cocoa-600">
              <MapPin class="w-4 h-4 text-cocoa-400" /> 地址：{{ student.address || '-' }}
            </div>
          </div>
        </div>

        <!-- 家长信息卡 -->
        <div class="bg-surface rounded-2xl p-6 shadow-softer border border-cream-200">
          <div class="flex items-center gap-2 mb-3 text-cocoa-900">
            <User class="w-5 h-5 text-butter-500" /> 家长信息
          </div>
          <div class="grid grid-cols-2 gap-3 text-sm">
            <div class="flex items-center gap-2 text-cocoa-600">
              <User class="w-4 h-4 text-cocoa-400" /> 姓名：{{ student.parentName || '-' }}
            </div>
            <div class="flex items-center gap-2 text-cocoa-600">
              <Phone class="w-4 h-4 text-cocoa-400" /> 电话：{{ student.parentPhone || '-' }}
            </div>
          </div>
        </div>

        <!-- 近期成绩 -->
        <div class="bg-surface rounded-2xl p-6 shadow-softer border border-cream-200">
          <div class="flex items-center justify-between mb-3">
            <div class="flex items-center gap-2 text-cocoa-900">
              <BookOpen class="w-5 h-5 text-butter-500" /> 近期成绩
            </div>
            <button class="text-sm text-butter-600 hover:text-butter-700" @click="goGrades">查看全部 →</button>
          </div>
          <div v-if="!recentGrades.length" class="text-sm text-cocoa-400 py-4 text-center">暂无成绩记录</div>
          <table v-else class="w-full text-sm">
            <thead class="bg-cream-100 text-cocoa-500 text-left">
              <tr>
                <th class="px-3 py-2">考试</th>
                <th class="px-3 py-2">科目</th>
                <th class="px-3 py-2 text-right">成绩</th>
                <th class="px-3 py-2 text-right">班级排名</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-cream-100">
              <tr v-for="g in recentGrades.slice(0, 10)" :key="g.id">
                <td class="px-3 py-2">{{ g.examName || g.examId }}</td>
                <td class="px-3 py-2">{{ g.subject }}</td>
                <td class="px-3 py-2 text-right font-medium">{{ g.score }}</td>
                <td class="px-3 py-2 text-right text-cocoa-500">{{ g.classRank || '-' }}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- 成绩趋势 -->
        <div v-if="trendLoading" class="bg-surface rounded-2xl p-6 shadow-softer border border-cream-200 text-center text-cocoa-400">
          加载趋势中…
        </div>
        <div v-else-if="!trendChart" class="bg-surface rounded-2xl p-6 shadow-softer border border-cream-200 text-center text-cocoa-400 text-sm">
          暂无趋势数据
        </div>
        <div v-else class="bg-surface rounded-2xl p-6 shadow-softer border border-cream-200">
          <div class="flex items-center gap-2 text-cocoa-900 mb-3">
            <TrendingUp class="w-5 h-5 text-butter-500" /> 成绩趋势
          </div>
          <svg :viewBox="`0 0 ${trendChart.CHART_W} ${trendChart.CHART_H}`" class="w-full h-auto">
            <g v-for="t in trendChart.ticks" :key="'y' + t.v">
              <line :x1="trendChart.CHART_PAD.left" :x2="trendChart.CHART_W - trendChart.CHART_PAD.right" :y1="t.y" :y2="t.y" stroke="#f5f0e8" stroke-dasharray="3 3" />
              <text :x="trendChart.CHART_PAD.left - 6" :y="t.y + 4" text-anchor="end" class="fill-cocoa-400" style="font-size: 10px;">{{ t.v }}</text>
            </g>
            <g v-for="(p, i) in trendChart.studentPoints" :key="'x' + i">
              <text :x="p.x" :y="trendChart.CHART_H - 6" text-anchor="middle" class="fill-cocoa-400" style="font-size: 9px;">{{ p.label.length > 5 ? p.label.slice(0, 5) + '…' : p.label }}</text>
            </g>
            <path v-if="trendChart.classPoints.length > 1" :d="trendChart.classPath" stroke="#c0c4cc" stroke-width="1.5" fill="none" stroke-dasharray="4 2" />
            <path v-if="trendChart.studentPoints.length > 1" :d="trendChart.studentPath" stroke="#e6a23c" stroke-width="2" fill="none" />
            <g v-for="(p, i) in trendChart.studentPoints" :key="'p' + i">
              <circle :cx="p.x" :cy="p.y" r="3" fill="#e6a23c" />
              <text v-if="p.avg != null" :x="p.x" :y="p.y - 6" text-anchor="middle" class="fill-cocoa-700" style="font-size: 9px; font-weight: 600;">{{ p.avg.toFixed(1) }}</text>
            </g>
          </svg>
          <div class="flex items-center justify-center gap-4 mt-2 text-xs text-cocoa-500">
            <span class="flex items-center gap-1"><span class="inline-block w-3 h-0.5 bg-butter-500 rounded"></span> 本人均分</span>
            <span class="flex items-center gap-1"><span class="inline-block w-3 h-0.5 bg-gray-300 rounded" style="border-bottom: 1px dashed #c0c4cc;"></span> 班级均分</span>
          </div>
        </div>
      </div>

      <!-- 右侧：快捷操作 + 奖励 -->
      <div class="space-y-4">
        <!-- 快捷操作 -->
        <div class="bg-surface rounded-2xl p-5 shadow-softer border border-cream-200">
          <div class="text-sm font-semibold text-cocoa-900 mb-3">快捷操作</div>
          <div class="space-y-2">
            <button class="w-full flex items-center gap-2 px-4 py-2.5 rounded-xl border border-cream-200 text-sm hover:bg-cream-50 transition-colors" @click="goGrades">
              <BookOpen class="w-4 h-4 text-butter-500" /> 成绩管理
            </button>
            <button class="w-full flex items-center gap-2 px-4 py-2.5 rounded-xl border border-cream-200 text-sm hover:bg-cream-50 transition-colors" @click="goAttendance">
              <Calendar class="w-4 h-4 text-butter-500" /> 考勤记录
            </button>
            <button class="w-full flex items-center gap-2 px-4 py-2.5 rounded-xl border border-cream-200 text-sm hover:bg-cream-50 transition-colors" @click="goAwards">
              <Trophy class="w-4 h-4 text-butter-500" /> 奖励记录
            </button>
          </div>
        </div>

        <!-- 奖励记录 -->
        <div class="bg-surface rounded-2xl p-5 shadow-softer border border-cream-200">
          <div class="flex items-center justify-between mb-3">
            <div class="flex items-center gap-2 text-cocoa-900">
              <Trophy class="w-5 h-5 text-butter-500" /> 近期奖励
            </div>
            <span class="text-xs text-cocoa-400">共 {{ awards.length }} 条</span>
          </div>
          <div v-if="!awards.length" class="text-sm text-cocoa-400 py-4 text-center">暂无奖励记录</div>
          <div v-else class="space-y-2">
            <div v-for="a in awards.slice(0, 8)" :key="a.id" class="flex items-center justify-between text-sm py-2 border-b border-cream-100 last:border-0">
              <div>
                <div class="font-medium text-cocoa-800">{{ a.type || a.category || '奖励' }}</div>
                <div class="text-xs text-cocoa-400">{{ a.reason || a.note || '-' }}</div>
              </div>
              <div class="text-xs text-cocoa-500">{{ a.createdAt ? new Date(a.createdAt).toLocaleDateString() : '-' }}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
