<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { toast } from '@/utils/feedback'
import {
  getStudent, listAwards, listGrades, getStudentHistory, listAttendances, listBehaviors, type TeacherStudent,
} from '@/api/teacher'
import request from '@/api/request'
import {
  ArrowLeft, User, Phone, Users, BookOpen, Trophy, Calendar,
  Mail, MapPin, IdCard, TrendingUp, Activity, BarChart3,
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
const attendances = ref<any[]>([])
const behaviors = ref<any[]>([])
const subjectStats = ref<Record<string, { studentAvg: number; classAvg: number; count: number }>>({})
const classRankInfo = ref<{ total: number; rank: number; pct: number } | null>(null)

const className = computed(() => {
  // Reuse class name lookup from classes store
  const clsList = JSON.parse(localStorage.getItem('g_classes') || '[]')
  const found = clsList.find((c: any) => c.id === student.value?.classId)
  return found?.name || student.value?.classId || '-'
})

/* ============ 雷达图常量 ============ */
const RADAR_R = 140
const RADAR_CX = 200
const RADAR_CY = 180

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

/* ============ 学科统计（雷达图数据） ============ */
const subjects = computed(() => {
  const map = new Map<string, { studentTotal: number; classTotal: number; count: number }>()
  for (const h of history.value) {
    if (!h.subject || h.score == null) continue
    const old = map.get(h.subject) || { studentTotal: 0, classTotal: 0, count: 0 }
    old.studentTotal += Number(h.score)
    old.classTotal += Number(h.classAvg || 0)
    old.count += 1
    map.set(h.subject, old)
  }
  return Array.from(map.entries())
    .map(([name, v]) => ({
      name,
      studentAvg: v.count ? Math.round(v.studentTotal / v.count * 10) / 10 : 0,
      classAvg: v.count ? Math.round(v.classTotal / v.count * 10) / 10 : 0,
    }))
    .sort((a, b) => a.name.localeCompare(b.name))
})

/* ============ 班级排名 ============ */
const classRankText = computed(() => {
  if (!classRankInfo.value) return '暂无排名数据'
  const { rank, total, pct } = classRankInfo.value
  const label = pct >= 0.8 ? '优秀' : pct >= 0.6 ? '良好' : pct >= 0.4 ? '中等' : '待提升'
  return `第 ${rank} 名 / 共 ${total} 人（前 ${(pct * 100).toFixed(0)}%，${label}）`
})

/* ============ 考勤摘要 ============ */
const attendanceSummary = computed(() => {
  if (!attendances.value.length) return null
  // attendances: [{ classId, date, records: [{ studentId, status }] }]
  const records: Array<{ date: string; status: string }> = []
  for (const a of attendances.value) {
    if (!a.records || !Array.isArray(a.records)) continue
    for (const r of a.records) {
      if (r.studentId === student.value?.id) records.push({ date: a.date, status: r.status })
    }
  }
  records.sort((a, b) => b.date.localeCompare(a.date))
  const present = records.filter(r => r.status === 'present' || r.status === '出勤').length
  const absent = records.filter(r => r.status === 'absent' || r.status === '缺勤').length
  const late = records.filter(r => r.status === 'late' || r.status === '迟到').length
  const leave = records.filter(r => r.status === 'leave' || r.status === '请假').length
  const total = records.length || 1
  return { records: records.slice(0, 10), present, absent, late, leave, total, rate: Math.round(present / total * 100) }
})

/* ============ 行为记录摘要 ============ */
const behaviorSummary = computed(() => {
  return behaviors.value
    .filter(b => b.studentId === student.value?.id)
    .sort((a, b) => (b.date || '').localeCompare(a.date || ''))
    .slice(0, 10)
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

    // 考勤 + 行为 + 排名
    await loadStudentDetails()
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

async function loadStudentDetails() {
  if (!student.value?.classId) return
  try {
    const [att, beh] = await Promise.allSettled([
      listAttendances(student.value.classId),
      listBehaviors(student.value.classId),
    ])
    if (att.status === 'fulfilled') attendances.value = (att.value as any)?.items || att.value || []
    if (beh.status === 'fulfilled') behaviors.value = (beh.value as any)?.items || beh.value || []

    // 从近期成绩计算班级排名
    const grades = recentGrades.value
    if (grades.length) {
      // 尝试从成绩中提取排名信息
      const ranks = grades.map(g => Number(g.classRank)).filter(r => !isNaN(r))
      if (ranks.length) {
        const avgRank = Math.round(ranks.reduce((a, b) => a + b, 0) / ranks.length)
        const totalStudents = await estimateClassSize()
        classRankInfo.value = {
          rank: avgRank,
          total: totalStudents || 50,
          pct: totalStudents ? 1 - avgRank / totalStudents : 0.5,
        }
      }
    }
  } catch {
    // 非关键路径，静默失败
  }
}

async function estimateClassSize() {
  try {
    const res = await request.get('/students', { params: { classId: student.value?.classId, take: 1 } })
    return res?.total || res?.items?.length || 0
  } catch {
    return 0
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

/* ============ 雷达图辅助 ============ */
function radarGrid(level: number) {
  const n = subjects.value.length || 1
  const r = RADAR_R * level
  return Array.from({ length: n }, (_, i) => {
    const angle = (Math.PI * 2 * i) / n - Math.PI / 2
    return `${RADAR_CX + r * Math.cos(angle)},${RADAR_CY + r * Math.sin(angle)}`
  }).join(' ')
}

function getRadarPoint(index: number) {
  const n = subjects.value.length || 1
  const angle = (Math.PI * 2 * index) / n - Math.PI / 2
  const subj = subjects.value[index]
  const maxScore = 100
  const r = RADAR_R * ((subj.studentAvg || 0) / maxScore)
  return { x: RADAR_CX + r * Math.cos(angle), y: RADAR_CY + r * Math.sin(angle) }
}

function getLabelPoint(index: number) {
  const n = subjects.value.length || 1
  const angle = (Math.PI * 2 * index) / n - Math.PI / 2
  const r = RADAR_R + 24
  return { x: RADAR_CX + r * Math.cos(angle), y: RADAR_CY + r * Math.sin(angle) + 4 }
}

function radarPolygon(values: number[]) {
  const n = subjects.value.length || values.length || 1
  const maxScore = 100
  return values.map((v, i) => {
    const angle = (Math.PI * 2 * i) / n - Math.PI / 2
    const r = RADAR_R * (Math.min(v, maxScore) / maxScore)
    return `${RADAR_CX + r * Math.cos(angle)},${RADAR_CY + r * Math.sin(angle)}`
  }).join(' ')
}

function attStatusClass(status: string) {
  const s = (status || '').toLowerCase()
  if (s === 'present' || s === '出勤') return 'text-mint-600 font-medium'
  if (s === 'absent' || s === '缺勤') return 'text-red-500 font-medium'
  if (s === 'late' || s === '迟到') return 'text-butter-600 font-medium'
  if (s === 'leave' || s === '请假') return 'text-cocoa-500'
  return 'text-cocoa-600'
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

        <!-- 班级排名定位 -->
        <div v-if="classRankInfo" class="bg-surface rounded-2xl p-6 shadow-softer border border-cream-200">
          <div class="flex items-center gap-2 text-cocoa-900 mb-2">
            <BarChart3 class="w-5 h-5 text-butter-500" /> 班级排名定位
          </div>
          <div class="text-2xl font-bold text-butter-600">{{ classRankText.split('（')[0] }}</div>
          <div class="text-sm text-cocoa-500 mt-1">{{ classRankText.match(/（.*）/)?.[0]?.replace(/[（）]/g, '') || '' }}</div>
        </div>

        <!-- 学科雷达图 -->
        <div v-if="subjects.length" class="bg-surface rounded-2xl p-6 shadow-softer border border-cream-200">
          <div class="flex items-center gap-2 text-cocoa-900 mb-3">
            <Activity class="w-5 h-5 text-butter-500" /> 学科均衡雷达图
          </div>
          <svg :viewBox="`0 0 400 400`" class="w-full max-w-sm mx-auto h-auto">
            <g v-for="(subj, i) in subjects" :key="subj.name">
              <line v-if="i" :x1="RADAR_CX" :y1="RADAR_CY" :x2="getRadarPoint(i - 1).x" :y2="getRadarPoint(i - 1).y" stroke="#f5f0e8" stroke-width="1" />
              <text :x="getLabelPoint(i).x" :y="getLabelPoint(i).y" text-anchor="middle" class="fill-cocoa-700" style="font-size: 12px; font-weight: 600;">{{ subj.name }}</text>
            </g>
            <!-- 网格 -->
            <polygon v-for="level in [0.25, 0.5, 0.75, 1]" :key="level"
              :points="radarGrid(level)" fill="none" stroke="#e8e4dc" stroke-width="1" />
            <!-- 班级均分区域 -->
            <polygon :points="radarPolygon(subjects.map(s => s.classAvg))" fill="rgba(192,196,204,0.2)" stroke="#c0c4cc" stroke-width="1.5" />
            <!-- 学生成绩区域 -->
            <polygon :points="radarPolygon(subjects.map(s => s.studentAvg))" fill="rgba(230,162,60,0.25)" stroke="#e6a23c" stroke-width="2" />
            <!-- 学生成绩点 -->
            <g v-for="(subj, i) in subjects" :key="'p' + i">
              <circle :cx="getRadarPoint(i).x" :cy="getRadarPoint(i).y" r="4" fill="#e6a23c" />
              <text :x="getRadarPoint(i).x" :y="getRadarPoint(i).y - 8" text-anchor="middle" class="fill-cocoa-800" style="font-size: 10px;">{{ subj.studentAvg }}</text>
            </g>
          </svg>
          <div class="flex items-center justify-center gap-4 mt-2 text-xs text-cocoa-500">
            <span class="flex items-center gap-1"><span class="inline-block w-3 h-3 rounded-sm" style="background:rgba(230,162,60,0.4)"></span> 本人均分</span>
            <span class="flex items-center gap-1"><span class="inline-block w-3 h-3 rounded-sm" style="background:rgba(192,196,204,0.3)"></span> 班级均分</span>
          </div>
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

        <!-- 考勤摘要 -->
        <div v-if="attendanceSummary" class="bg-surface rounded-2xl p-5 shadow-softer border border-cream-200">
          <div class="flex items-center gap-2 text-cocoa-900 mb-3">
            <Calendar class="w-5 h-5 text-butter-500" /> 近期考勤
          </div>
          <div class="grid grid-cols-4 gap-2 mb-3">
            <div class="text-center p-2 rounded-lg bg-mint-50">
              <div class="text-lg font-bold text-mint-600">{{ attendanceSummary.rate }}%</div>
              <div class="text-xs text-cocoa-500">出勤率</div>
            </div>
            <div class="text-center p-2 rounded-lg bg-cream-50">
              <div class="text-lg font-bold text-cocoa-700">{{ attendanceSummary.present }}</div>
              <div class="text-xs text-cocoa-500">出勤</div>
            </div>
            <div class="text-center p-2 rounded-lg bg-red-50">
              <div class="text-lg font-bold text-red-500">{{ attendanceSummary.absent }}</div>
              <div class="text-xs text-cocoa-500">缺勤</div>
            </div>
            <div class="text-center p-2 rounded-lg bg-butter-50">
              <div class="text-lg font-bold text-butter-600">{{ attendanceSummary.late }}</div>
              <div class="text-xs text-cocoa-500">迟到</div>
            </div>
          </div>
          <div v-if="attendanceSummary.records.length" class="space-y-1">
            <div v-for="r in attendanceSummary.records" :key="r.date" class="flex items-center justify-between text-xs py-1 border-b border-cream-100 last:border-0">
              <span class="text-cocoa-600">{{ r.date }}</span>
              <span :class="attStatusClass(r.status)">{{ r.status }}</span>
            </div>
          </div>
        </div>

        <!-- 行为记录 -->
        <div class="bg-surface rounded-2xl p-5 shadow-softer border border-cream-200">
          <div class="flex items-center gap-2 text-cocoa-900 mb-3">
            <Activity class="w-5 h-5 text-butter-500" /> 近期行为记录
          </div>
          <div v-if="!behaviorSummary.length" class="text-sm text-cocoa-400 py-4 text-center">暂无行为记录</div>
          <div v-else class="space-y-2">
            <div v-for="b in behaviorSummary" :key="b.id" class="text-sm py-2 border-b border-cream-100 last:border-0">
              <div class="flex items-center justify-between">
                <span class="font-medium text-cocoa-800">{{ b.behavior || '行为记录' }}</span>
                <span class="text-xs text-cocoa-400">{{ b.date }}</span>
              </div>
              <div v-if="b.note" class="text-xs text-cocoa-500 mt-1">{{ b.note }}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
