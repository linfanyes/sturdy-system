<script setup lang="ts">
/**
 * 学生成绩详情页
 * 路由 query：studentId、classId
 * - GET /students/{studentId}          学生信息
 * - GET /grades/analysis/student/{id}  历次成绩 + 各科均分/趋势
 * - GET /grades/analysis/rank          每次考试该生班级排名（按 examId 遍历）
 */
import { ref, onMounted, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { getStudent, getStudentHistory, getClassRank } from '@/api/teacher'
import { loadClasses, classNameById } from '@/composables/useClasses'
import {
  ArrowLeft, GraduationCap, TrendingUp, Award, AlertCircle,
  BookOpen, BarChart3, ListChecks,
} from 'lucide-vue-next'

const route = useRoute()
const router = useRouter()

const studentId = String(route.query.studentId || '')
const classId = String(route.query.classId || '')

const loading = ref(false)
const student = ref<any>(null)
const analysis = ref<any>(null)
const rankMap = ref<Record<string, string | number>>({}) // `${examId}|${subject}` -> rank

const selectedSubject = ref('') // '' = 全部（多科折线）
const filterSubject = ref('')   // 明细表按科目筛选

const palette = ['#e6b450', '#7ac8b4', '#a78bfa', '#f87171', '#60a5fa', '#fb923c', '#34d399', '#f472b6']

const history = computed<any[]>(() => analysis.value?.history || [])
const subjectsMap = computed<Record<string, { avg: number; trend: string }>>(() => analysis.value?.subjects || {})
const subjectNames = computed(() => Object.keys(subjectsMap.value))

/* ---- 考试列表（按日期升序，用于折线图 X 轴） ---- */
const examsAsc = computed(() => {
  const map = new Map<string, { examId: string; examName: string; date: string }>()
  for (const h of history.value) {
    if (h.examId && !map.has(h.examId)) {
      map.set(h.examId, { examId: h.examId, examName: h.examName, date: h.date })
    }
  }
  return Array.from(map.values()).sort((a, b) => (a.date || '').localeCompare(b.date || ''))
})

const examCount = computed(() => examsAsc.value.length)

const overallAvg = computed(() => {
  const scores = history.value.map(h => Number(h.score)).filter(s => !Number.isNaN(s))
  if (!scores.length) return 0
  return scores.reduce((a, b) => a + b, 0) / scores.length
})

const subjectList = computed(() =>
  subjectNames.value
    .map(name => ({ name, ...subjectsMap.value[name] }))
    .sort((a, b) => (b.avg || 0) - (a.avg || 0)),
)
const bestSubject = computed(() => subjectList.value[0] || null)
const weakSubject = computed(() => {
  const list = subjectList.value
  return list.length ? list[list.length - 1] : null
})

function trendMeta(t?: string) {
  switch (t) {
    case 'up': return { icon: '↑', cls: 'text-mint-500' }
    case 'down': return { icon: '↓', cls: 'text-red-500' }
    default: return { icon: '→', cls: 'text-cocoa-400' }
  }
}

/* ============ 折线图（内联 SVG） ============ */
const chartW = 800
const chartH = 380
const pad = { top: 30, right: 40, bottom: 60, left: 50 }
const plotW = chartW - pad.left - pad.right
const plotH = chartH - pad.top - pad.bottom

const allScores = computed(() => history.value.map(h => Number(h.score)).filter(s => !Number.isNaN(s)))
const yMax = computed(() => {
  const m = Math.max(100, ...(allScores.value.length ? allScores.value : [100]))
  return Math.ceil(m / 10) * 10
})
const yTicks = computed(() => {
  const ticks: number[] = []
  const step = yMax.value / 5
  for (let i = 0; i <= 5; i++) ticks.push(Math.round(step * i * 10) / 10)
  return ticks
})

interface ChartPoint { x: number; y: number; score: number }
interface ChartSeries { subject: string; color: string; points: ChartPoint[] }

const chartSeries = computed<ChartSeries[]>(() => {
  const examList = examsAsc.value
  const n = examList.length
  if (!n) return []
  const xAt = (i: number) => (n > 1 ? pad.left + (i / (n - 1)) * plotW : pad.left + plotW / 2)
  const yAt = (score: number) => pad.top + plotH - (score / yMax.value) * plotH

  const targets = selectedSubject.value ? [selectedSubject.value] : subjectNames.value
  return targets.map((subject, idx) => {
    const color = palette[idx % palette.length]
    const points: ChartPoint[] = []
    examList.forEach((ex, i) => {
      const h = history.value.find(item => item.examId === ex.examId && item.subject === subject)
      if (h && h.score != null && !Number.isNaN(Number(h.score))) {
        const score = Number(h.score)
        points.push({ x: xAt(i), y: yAt(score), score })
      }
    })
    return { subject, color, points }
  }).filter(s => s.points.length > 0)
})

function xLabelX(i: number) {
  const n = examsAsc.value.length
  return n > 1 ? pad.left + (i / (n - 1)) * plotW : pad.left + plotW / 2
}
function truncate(s: string, n = 6) {
  if (!s) return ''
  return s.length > n ? s.slice(0, n) + '…' : s
}

/* ============ 明细表 ============ */
const detailRows = computed(() => {
  let list = history.value.map(h => ({ ...h }))
  if (filterSubject.value) list = list.filter(r => r.subject === filterSubject.value)
  return list.sort((a, b) => (b.date || '').localeCompare(a.date || ''))
})

function rankOf(examId?: string, subject?: string) {
  if (!examId || !subject) return '-'
  const v = rankMap.value[`${examId}|${subject}`]
  return v == null ? '-' : v
}

/* ============ 数据加载 ============ */
async function loadStudent() {
  if (!studentId) return
  try {
    student.value = await getStudent(studentId)
  } catch { student.value = null }
}

async function loadAnalysis() {
  if (!studentId) return
  try {
    analysis.value = await getStudentHistory(studentId)
  } catch { analysis.value = null }
}

async function loadRanks() {
  rankMap.value = {}
  if (!classId) return
  const examIds = examsAsc.value.map(e => e.examId).filter(Boolean)
  if (!examIds.length) return
  const results = await Promise.allSettled(
    examIds.map(id => getClassRank(classId, id)),
  )
  results.forEach((r, i) => {
    if (r.status !== 'fulfilled') return
    const examId = examIds[i]
    const data: any = r.value
    // 形态1：条目数组（含 studentId/subject/rank）
    const entries: any[] = Array.isArray(data) ? data
      : Array.isArray(data?.items) ? data.items
      : Array.isArray(data?.rankings) ? data.rankings
      : Array.isArray(data?.list) ? data.list
      : Array.isArray(data?.rows) ? data.rows
      : []
    if (entries.length) {
      for (const e of entries) {
        const sid = e.studentId || e.student_id || e.id
        if (sid !== studentId) continue
        const subject = e.subject
        const rank = e.rank ?? e.ranking ?? e.r
        if (subject && rank != null) rankMap.value[`${examId}|${subject}`] = rank
      }
    } else if (data && typeof data === 'object') {
      // 形态2：科目->排名 的映射对象
      const ranks = data.ranks || data.subjectRanks || null
      if (ranks && typeof ranks === 'object') {
        for (const [subject, rank] of Object.entries(ranks)) {
          if (typeof rank === 'number' || typeof rank === 'string') {
            rankMap.value[`${examId}|${subject}`] = rank as any
          }
        }
      }
    }
  })
}

async function init() {
  loading.value = true
  await Promise.all([loadClasses(), loadStudent(), loadAnalysis()])
  await loadRanks()
  loading.value = false
}

onMounted(init)

function goBack() {
  if (window.history.length > 1) router.back()
  else router.push('/teacher/students')
}

function fmt(n: number) {
  return (Math.round(Number(n || 0) * 10) / 10).toFixed(1)
}
</script>

<template>
  <div class="space-y-4">
    <!-- 顶部标题栏 -->
    <div class="flex items-center justify-between gap-4 flex-wrap">
      <div class="flex items-center gap-3">
        <button class="p-2 rounded-xl bg-surface border border-cream-200 hover:bg-cream-50 text-cocoa-600" @click="goBack">
          <ArrowLeft class="w-5 h-5" />
        </button>
        <div>
          <h1 class="text-2xl font-bold text-cocoa-900 flex items-center gap-2">
            <GraduationCap class="w-6 h-6 text-butter-500" />
            {{ student?.name || analysis?.studentName || '学生' }}
          </h1>
          <div class="text-sm text-cocoa-500 mt-0.5">
            学号：{{ student?.studentNo || '-' }}
            <span class="mx-2 text-cocoa-300">·</span>
            班级：{{ classNameById(classId || student?.classId) }}
          </div>
        </div>
      </div>
    </div>

    <div v-if="loading" class="bg-surface rounded-2xl p-10 shadow-softer text-center text-cocoa-400">
      加载中…
    </div>

    <template v-else>
      <div v-if="!history.length" class="bg-surface rounded-2xl p-10 shadow-softer text-center text-cocoa-400">
        暂无数据
      </div>

      <template v-else>
        <!-- 统计卡片行 -->
        <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div class="stat-card">
            <div class="flex items-center justify-between">
              <div>
                <div class="text-xs text-cocoa-400">参加考试次数</div>
                <div class="text-2xl font-bold text-cocoa-900 mt-1">{{ examCount }}</div>
              </div>
              <div class="w-10 h-10 rounded-xl bg-butter-100 text-butter-600 flex items-center justify-center">
                <ListChecks class="w-5 h-5" />
              </div>
            </div>
          </div>
          <div class="stat-card">
            <div class="flex items-center justify-between">
              <div>
                <div class="text-xs text-cocoa-400">平均分</div>
                <div class="text-2xl font-bold text-cocoa-900 mt-1">{{ fmt(overallAvg) }}</div>
              </div>
              <div class="w-10 h-10 rounded-xl bg-mint-100 text-mint-500 flex items-center justify-center">
                <BarChart3 class="w-5 h-5" />
              </div>
            </div>
          </div>
          <div class="stat-card">
            <div class="flex items-center justify-between">
              <div>
                <div class="text-xs text-cocoa-400">最佳科目</div>
                <div class="text-2xl font-bold text-cocoa-900 mt-1">{{ bestSubject?.name || '-' }}</div>
                <div v-if="bestSubject" class="text-xs text-mint-500 mt-0.5">均 {{ fmt(bestSubject.avg) }}</div>
              </div>
              <div class="w-10 h-10 rounded-xl bg-mint-100 text-mint-500 flex items-center justify-center">
                <Award class="w-5 h-5" />
              </div>
            </div>
          </div>
          <div class="stat-card">
            <div class="flex items-center justify-between">
              <div>
                <div class="text-xs text-cocoa-400">待提升科目</div>
                <div class="text-2xl font-bold text-cocoa-900 mt-1">{{ weakSubject?.name || '-' }}</div>
                <div v-if="weakSubject" class="text-xs text-red-500 mt-0.5">均 {{ fmt(weakSubject.avg) }}</div>
              </div>
              <div class="w-10 h-10 rounded-xl bg-red-50 text-red-500 flex items-center justify-center">
                <AlertCircle class="w-5 h-5" />
              </div>
            </div>
          </div>
        </div>

        <!-- 各科成绩概览 -->
        <div class="bg-surface rounded-2xl p-6 shadow-softer">
          <h2 class="text-base font-semibold text-cocoa-900 mb-3 flex items-center gap-2">
            <BookOpen class="w-5 h-5 text-butter-500" /> 各科成绩概览
          </h2>
          <div v-if="subjectList.length" class="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div
              v-for="s in subjectList"
              :key="s.name"
              class="rounded-xl border border-cream-200 p-3 hover:border-butter-300 transition-colors"
            >
              <div class="text-sm font-medium text-cocoa-900">{{ s.name }}</div>
              <div class="flex items-baseline justify-between mt-1">
                <span class="text-xl font-bold text-cocoa-900">{{ fmt(s.avg) }}</span>
                <span class="text-sm font-semibold" :class="trendMeta(s.trend).cls">
                  {{ trendMeta(s.trend).icon }}
                </span>
              </div>
              <div class="text-xs text-cocoa-400 mt-0.5">平均分</div>
            </div>
          </div>
          <div v-else class="text-center text-cocoa-400 py-6 text-sm">暂无数据</div>
        </div>

        <!-- 成绩趋势折线图 -->
        <div class="bg-surface rounded-2xl p-6 shadow-softer">
          <div class="flex items-center justify-between mb-3 flex-wrap gap-2">
            <h2 class="text-base font-semibold text-cocoa-900 flex items-center gap-2">
              <TrendingUp class="w-5 h-5 text-butter-500" /> 成绩趋势
            </h2>
            <select
              v-model="selectedSubject"
              class="px-3 py-1.5 rounded-xl border border-cream-200 bg-surface text-sm focus:outline-none focus:border-butter-400"
            >
              <option value="">全部科目</option>
              <option v-for="s in subjectNames" :key="s" :value="s">{{ s }}</option>
            </select>
          </div>

          <div v-if="chartSeries.length" class="overflow-x-auto">
            <svg
              :viewBox="`0 0 ${chartW} ${chartH}`"
              class="w-full"
              style="min-width: 480px;"
              preserveAspectRatio="xMidYMid meet"
            >
              <!-- Y 轴网格线 + 刻度 -->
              <g>
                <line
                  v-for="(t, i) in yTicks"
                  :key="'yt' + i"
                  :x1="pad.left"
                  :y1="pad.top + plotH - (t / yMax) * plotH"
                  :x2="pad.left + plotW"
                  :y2="pad.top + plotH - (t / yMax) * plotH"
                  stroke="#f0e6d2"
                  stroke-width="1"
                />
                <text
                  v-for="(t, i) in yTicks"
                  :key="'yl' + i"
                  :x="pad.left - 8"
                  :y="pad.top + plotH - (t / yMax) * plotH + 4"
                  text-anchor="end"
                  font-size="11"
                  fill="#a89878"
                >{{ t }}</text>
              </g>
              <!-- X 轴标签 -->
              <g>
                <text
                  v-for="(ex, i) in examsAsc"
                  :key="'xl' + i"
                  :x="xLabelX(i)"
                  :y="pad.top + plotH + 18"
                  text-anchor="middle"
                  font-size="11"
                  fill="#a89878"
                >{{ truncate(ex.examName) }}</text>
                <text
                  v-for="(ex, i) in examsAsc"
                  :key="'xd' + i"
                  :x="xLabelX(i)"
                  :y="pad.top + plotH + 32"
                  text-anchor="middle"
                  font-size="10"
                  fill="#c9b896"
                >{{ ex.date }}</text>
              </g>
              <!-- 折线 + 数据点 + 分数标注 -->
              <g v-for="(s, si) in chartSeries" :key="'series' + si">
                <polyline
                  :points="s.points.map(p => `${p.x},${p.y}`).join(' ')"
                  fill="none"
                  :stroke="s.color"
                  stroke-width="2.5"
                  stroke-linejoin="round"
                  stroke-linecap="round"
                />
                <circle
                  v-for="(p, pi) in s.points"
                  :key="'pt' + si + pi"
                  :cx="p.x"
                  :cy="p.y"
                  r="3.5"
                  :fill="s.color"
                />
                <text
                  v-for="(p, pi) in s.points"
                  :key="'tx' + si + pi"
                  :x="p.x"
                  :y="p.y - 8"
                  text-anchor="middle"
                  font-size="10"
                  :fill="s.color"
                  font-weight="600"
                >{{ p.score }}</text>
              </g>
            </svg>
            <!-- 图例 -->
            <div class="flex flex-wrap gap-3 justify-center mt-2 text-xs">
              <span
                v-for="(s, si) in chartSeries"
                :key="'lg' + si"
                class="flex items-center gap-1.5 text-cocoa-600"
              >
                <span class="w-3 h-3 rounded-full inline-block" :style="{ background: s.color }"></span>
                {{ s.subject }}
              </span>
            </div>
          </div>
          <div v-else class="text-center text-cocoa-400 py-10 text-sm">暂无数据</div>
        </div>

        <!-- 历次成绩明细表 -->
        <div class="bg-surface rounded-2xl p-6 shadow-softer">
          <div class="flex items-center justify-between mb-3 flex-wrap gap-2">
            <h2 class="text-base font-semibold text-cocoa-900 flex items-center gap-2">
              <ListChecks class="w-5 h-5 text-butter-500" /> 历次成绩明细
            </h2>
            <select
              v-model="filterSubject"
              class="px-3 py-1.5 rounded-xl border border-cream-200 bg-surface text-sm focus:outline-none focus:border-butter-400"
            >
              <option value="">全部科目</option>
              <option v-for="s in subjectNames" :key="s" :value="s">{{ s }}</option>
            </select>
          </div>
          <div v-if="detailRows.length" class="table-wrap">
            <table class="w-full text-sm">
              <thead class="bg-cream-100 text-cocoa-500 text-left">
                <tr>
                  <th class="px-4 py-3 font-medium">考试名称</th>
                  <th class="px-4 py-3 font-medium">日期</th>
                  <th class="px-4 py-3 font-medium">科目</th>
                  <th class="px-4 py-3 font-medium text-right">分数</th>
                  <th class="px-4 py-3 font-medium text-right">班级排名</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-cream-100">
                <tr
                  v-for="(r, i) in detailRows"
                  :key="i"
                  class="hover:bg-cream-50 transition-colors"
                >
                  <td class="px-4 py-3 font-medium text-cocoa-900">{{ r.examName || '-' }}</td>
                  <td class="px-4 py-3 text-cocoa-700">{{ r.date || '-' }}</td>
                  <td class="px-4 py-3 text-cocoa-700">{{ r.subject }}</td>
                  <td class="px-4 py-3 text-right font-semibold text-butter-600">
                    {{ r.score != null ? r.score : '-' }}
                  </td>
                  <td class="px-4 py-3 text-right text-cocoa-700">{{ rankOf(r.examId, r.subject) }}</td>
                </tr>
              </tbody>
            </table>
          </div>
          <div v-else class="text-center text-cocoa-400 py-6 text-sm">暂无数据</div>
        </div>
      </template>
    </template>
  </div>
</template>
