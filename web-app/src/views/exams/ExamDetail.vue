<script setup lang="ts">
/**
 * 考试详情页
 * - 通过 route query 接收 examId / classId（同时兼容 defineProps 传入）
 * - 展示统计卡片、各科统计表、分数分布、各科均分对比、排名等
 */
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import request from '@/api/request'
import { useClasses } from '@/composables/useClasses'
import {
  ArrowLeft, Users, GraduationCap, CheckCircle, Award,
  TrendingUp, AlertTriangle, BarChart3, Trophy, Loader2,
} from 'lucide-vue-next'

const props = defineProps<{ examId?: string; classId?: string }>()
const route = useRoute()
const router = useRouter()
const { classes, loadClasses } = useClasses()

const examId = computed(() => props.examId || String(route.query.examId || ''))
const classId = computed(() => props.classId || String(route.query.classId || ''))

const loading = ref(false)
const exam = ref<any | null>(null)
const analysis = ref<any | null>(null)
const students = ref<any[]>([])

const subjects = computed<any[]>(() => analysis.value?.subjects || [])
const subjectNames = computed<string[]>(() => subjects.value.map((s: any) => s.subject))
const strongSubjects = computed<string[]>(() => analysis.value?.strongSubjects || [])
const weakSubjects = computed<string[]>(() => analysis.value?.weakSubjects || [])

const className = computed(
  () => classes.value.find(c => c.id === classId.value)?.name || classId.value || '-',
)

/* ============ 格式化 ============ */
function fmt1(n: any): string {
  if (n == null || n === '' || isNaN(Number(n))) return '-'
  return Number(n).toFixed(1)
}
/** 小数（0.9）或百分数（90）→ 百分比字符串，兼容两种形式 */
function pct(n: any): string {
  if (n == null || n === '' || isNaN(Number(n))) return '-'
  const v = Number(n)
  const p = v > 1 ? v : v * 100
  return p.toFixed(1) + '%'
}
/** 已是百分数数值（如 97.5）→ 加 % 后缀 */
function pctNum(n: any): string {
  if (n == null || n === '' || isNaN(Number(n))) return '-'
  return Number(n).toFixed(1) + '%'
}

const avgPassRate = computed(() => {
  const s = subjects.value
  if (!s.length) return 0
  return s.reduce((a: number, b: any) => a + (Number(b.passRate) || 0), 0) / s.length
})
const avgExcellentRate = computed(() => {
  const s = subjects.value
  if (!s.length) return 0
  return s.reduce((a: number, b: any) => a + (Number(b.excellentRate) || 0), 0) / s.length
})

const cards = computed(() => [
  { key: 'avg', label: '班级均分', value: fmt1(analysis.value?.classAvg), icon: GraduationCap, bg: 'bg-butter-100', text: 'text-butter-600', type: 'number' },
  { key: 'total', label: '总人数', value: String(analysis.value?.totalStudents ?? 0), icon: Users, bg: 'bg-mint-100', text: 'text-mint-500', type: 'number' },
  { key: 'pass', label: '及格率', value: pct(avgPassRate.value), icon: CheckCircle, bg: 'bg-butter-100', text: 'text-butter-600', type: 'number' },
  { key: 'excellent', label: '优秀率', value: pct(avgExcellentRate.value), icon: Award, bg: 'bg-mint-100', text: 'text-mint-500', type: 'number' },
  { key: 'strong', label: '优势学科', value: strongSubjects.value, icon: TrendingUp, bg: 'bg-mint-100', text: 'text-mint-500', type: 'subjects' },
  { key: 'weak', label: '薄弱学科', value: weakSubjects.value, icon: AlertTriangle, bg: 'bg-butter-100', text: 'text-red-500', type: 'subjects' },
])

/* ============ 数据加载 ============ */
async function loadExam() {
  if (!examId.value) return
  try {
    exam.value = await request.get(`/exams/${examId.value}`)
  } catch {
    exam.value = null
  }
}

async function loadAnalysis() {
  if (!examId.value || !classId.value) return
  try {
    analysis.value = await request.get('/grades/analysis/exam', {
      params: { classId: classId.value, examId: examId.value },
    })
  } catch {
    analysis.value = null
  }
}

async function loadStudents() {
  if (!classId.value) { students.value = []; return }
  try {
    const res = await request.get('/students', { params: { classId: classId.value, take: 500 } })
    students.value = Array.isArray(res) ? res : (res?.items || [])
  } catch {
    students.value = []
  }
}

/* ============ 分数分布（内联 SVG，10 分一段） ============ */
const distSubject = ref('')
const distribution = computed(() => {
  const subj = subjects.value.find((s: any) => s.subject === distSubject.value)
  const dist = subj?.distribution
  if (!dist) return []
  return Object.entries(dist)
    .map(([k, v]) => {
      const lo = parseInt(k.split('-')[0], 10)
      return { label: k, lo: isNaN(lo) ? 0 : lo, value: Number(v) || 0 }
    })
    .sort((a, b) => a.lo - b.lo)
})

const distChart = computed(() => {
  const data = distribution.value
  if (!data.length) return null
  const width = 640
  const height = 280
  const padding = { top: 24, right: 16, bottom: 56, left: 44 }
  const innerW = width - padding.left - padding.right
  const innerH = height - padding.top - padding.bottom
  const max = Math.max(1, ...data.map(d => d.value))
  const slotW = innerW / data.length
  const barW = Math.min(42, slotW * 0.62)
  const bars = data.map((d, i) => {
    const h = (d.value / max) * innerH
    const x = padding.left + slotW * i + (slotW - barW) / 2
    const y = padding.top + innerH - h
    return { ...d, x, y, h, w: barW }
  })
  const ticks = Array.from({ length: 5 }, (_, i) => Math.round((max / 4) * i))
  return { width, height, padding, innerW, innerH, max, bars, ticks }
})

/* ============ 各科均分对比（横向 SVG） ============ */
const avgChart = computed(() => {
  const data = subjects.value
  if (!data.length) return null
  const width = 600
  const labelW = 56
  const valueW = 56
  const barH = 26
  const gap = 14
  const paddingTop = 16
  const paddingBottom = 16
  const paddingLeft = labelW + 8
  const paddingRight = 16
  const max = Math.max(1, ...data.map((d: any) => Number(d.avg) || 0))
  const innerW = width - paddingLeft - paddingRight - valueW
  const height = paddingTop + paddingBottom + data.length * (barH + gap)
  const classAvg = Number(analysis.value?.classAvg) || 0
  const rows = data.map((d: any, i) => {
    const w = ((Number(d.avg) || 0) / max) * innerW
    const y = paddingTop + i * (barH + gap)
    const above = classAvg > 0 && (Number(d.avg) || 0) >= classAvg
    return { subject: d.subject, avg: d.avg, y, w, h: barH, above }
  })
  return { width, height, paddingLeft, paddingTop, innerW, max, rows, barH }
})

/* ============ 排名 ============ */
const rankSubject = ref('')
const ranks = ref<any[]>([])
const rankLoading = ref(false)

async function loadRanks() {
  if (!examId.value || !classId.value) { ranks.value = []; return }
  rankLoading.value = true
  try {
    const params: Record<string, any> = { classId: classId.value, examId: examId.value }
    if (rankSubject.value) params.subject = rankSubject.value
    const res: any = await request.get('/grades/analysis/rank', { params })
    ranks.value = res?.ranks || []
  } catch {
    ranks.value = []
  } finally {
    rankLoading.value = false
  }
}

watch(rankSubject, loadRanks)

function studentName(r: any): string {
  if (r.studentName) return r.studentName
  const s = students.value.find(x => x.id === r.studentId)
  return s?.name || r.studentId || '-'
}

const top10 = computed(() =>
  ranks.value
    .filter(r => r.rank != null)
    .slice()
    .sort((a, b) => a.rank - b.rank)
    .slice(0, 10),
)

const bottom10 = computed(() =>
  ranks.value
    .filter(r => r.rank != null)
    .slice()
    .sort((a, b) => b.rank - a.rank)
    .slice(0, 10),
)

function rankClass(rank: number): string {
  if (rank === 1) return 'text-butter-600 font-bold'
  if (rank === 2) return 'text-cocoa-500 font-bold'
  if (rank === 3) return 'text-mint-600 font-semibold'
  return 'text-cocoa-700'
}

/* ============ 初始化 ============ */
async function loadAll() {
  if (!examId.value) { loading.value = false; return }
  loading.value = true
  try {
    await Promise.all([loadExam(), loadAnalysis(), loadStudents()])
    if (!distSubject.value && subjectNames.value.length) {
      distSubject.value = subjectNames.value[0]
    }
    await loadRanks()
  } finally {
    loading.value = false
  }
}

onMounted(async () => {
  await loadClasses()
  await loadAll()
})

// 路由参数变化时重新加载（同组件间切换考试）
watch([examId, classId], () => {
  if (examId.value && classId.value) loadAll()
})

function goBack() {
  router.push('/teacher/exams')
}
</script>

<template>
  <div class="space-y-4">
    <!-- 顶部标题栏 -->
    <div class="flex items-center justify-between gap-4 flex-wrap">
      <div class="flex items-center gap-3 min-w-0">
        <button
          class="p-2 rounded-xl bg-cream-100 hover:bg-cream-200 text-cocoa-700 transition-colors shrink-0"
          title="返回"
          @click="goBack"
        >
          <ArrowLeft class="w-5 h-5" />
        </button>
        <div class="min-w-0">
          <h1 class="text-2xl font-bold text-cocoa-900 truncate">{{ exam?.name || '考试详情' }}</h1>
          <div class="text-sm text-cocoa-500 mt-0.5">
            {{ className }} · {{ exam?.date || '-' }}
            <span v-if="exam?.term">· {{ exam.term }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- 加载中 -->
    <div
      v-if="loading"
      class="text-cocoa-400 text-sm py-16 text-center flex items-center justify-center gap-2"
    >
      <Loader2 class="w-5 h-5 animate-spin" /> 加载中…
    </div>

    <template v-else>
      <!-- 统计卡片 -->
      <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <div
          v-for="card in cards"
          :key="card.key"
          class="bg-white rounded-2xl p-4 shadow-softer flex items-center gap-3"
        >
          <div :class="['w-11 h-11 rounded-xl flex items-center justify-center shrink-0', card.bg]">
            <component :is="card.icon" :class="['w-5 h-5', card.text]" />
          </div>
          <div class="min-w-0">
            <div class="text-xs text-cocoa-500">{{ card.label }}</div>
            <div v-if="card.type === 'number'" class="text-xl font-bold text-cocoa-900 mt-0.5 truncate">
              {{ card.value }}
            </div>
            <div v-else class="mt-1 flex flex-wrap gap-1">
              <span v-if="!card.value.length" class="text-sm text-cocoa-400">-</span>
              <span
                v-for="s in card.value"
                :key="s"
                :class="[
                  'text-xs px-1.5 py-0.5 rounded',
                  card.key === 'strong' ? 'bg-mint-100 text-mint-600' : 'bg-red-50 text-red-500',
                ]"
              >{{ s }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- 各科统计表 -->
      <div class="bg-white rounded-2xl p-6 shadow-softer">
        <div class="font-medium text-cocoa-700 mb-4 flex items-center gap-2">
          <BarChart3 class="w-4 h-4 text-butter-500" /> 各科统计
        </div>
        <div v-if="!subjects.length" class="text-cocoa-400 text-sm py-8 text-center">暂无数据</div>
        <div v-else class="overflow-x-auto">
          <table class="w-full text-sm">
            <thead class="bg-cream-100 text-cocoa-500 text-left">
              <tr>
                <th class="px-4 py-3 font-medium">科目</th>
                <th class="px-4 py-3 font-medium">均分</th>
                <th class="px-4 py-3 font-medium">最高分</th>
                <th class="px-4 py-3 font-medium">最低分</th>
                <th class="px-4 py-3 font-medium">及格率</th>
                <th class="px-4 py-3 font-medium">优秀率</th>
                <th class="px-4 py-3 font-medium">标准差</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-cream-100">
              <tr v-for="s in subjects" :key="s.subject" class="hover:bg-cream-50">
                <td class="px-4 py-3 font-medium text-cocoa-900">{{ s.subject }}</td>
                <td class="px-4 py-3 text-butter-600 font-semibold">{{ fmt1(s.avg) }}</td>
                <td class="px-4 py-3 text-mint-500">{{ fmt1(s.max) }}</td>
                <td class="px-4 py-3 text-red-500">{{ fmt1(s.min) }}</td>
                <td class="px-4 py-3 text-cocoa-700">{{ pct(s.passRate) }}</td>
                <td class="px-4 py-3 text-cocoa-700">{{ pct(s.excellentRate) }}</td>
                <td class="px-4 py-3 text-cocoa-700">{{ fmt1(s.stdDev) }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- 分数分布 + 各科均分对比 -->
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <!-- 分数分布柱状图 -->
        <div class="bg-white rounded-2xl p-6 shadow-softer">
          <div class="flex items-center justify-between gap-4 mb-4 flex-wrap">
            <div class="font-medium text-cocoa-700 flex items-center gap-2">
              <BarChart3 class="w-4 h-4 text-butter-500" /> 分数分布
            </div>
            <select
              v-if="subjectNames.length"
              v-model="distSubject"
              class="px-3 py-1.5 rounded-xl border border-cream-200 bg-white text-sm focus:outline-none focus:border-butter-400"
            >
              <option v-for="s in subjectNames" :key="s" :value="s">{{ s }}</option>
            </select>
          </div>
          <div v-if="!distChart" class="text-cocoa-400 text-sm py-8 text-center">暂无数据</div>
          <div v-else class="w-full overflow-x-auto">
            <svg
              :viewBox="`0 0 ${distChart.width} ${distChart.height}`"
              class="w-full h-auto"
              preserveAspectRatio="xMidYMid meet"
            >
              <!-- Y 轴参考线 + 刻度 -->
              <template v-for="(t, i) in distChart.ticks" :key="'g' + i">
                <line
                  :x1="distChart.padding.left"
                  :x2="distChart.width - distChart.padding.right"
                  :y1="distChart.padding.top + (distChart.innerH * (4 - i)) / 4"
                  :y2="distChart.padding.top + (distChart.innerH * (4 - i)) / 4"
                  stroke="rgb(var(--cream-200))"
                  stroke-width="1"
                />
                <text
                  :x="distChart.padding.left - 6"
                  :y="distChart.padding.top + (distChart.innerH * (4 - i)) / 4 + 3"
                  text-anchor="end"
                  class="fill-cocoa-400"
                  font-size="10"
                >{{ t }}</text>
              </template>
              <!-- 柱子 -->
              <g v-for="(b, i) in distChart.bars" :key="'b' + i">
                <rect
                  :x="b.x"
                  :y="b.y"
                  :width="b.w"
                  :height="b.h"
                  :fill="b.value > 0 ? 'rgb(var(--butter-400))' : 'rgb(var(--cream-200))'"
                  rx="3"
                />
                <text
                  :x="b.x + b.w / 2"
                  :y="b.y - 5"
                  text-anchor="middle"
                  class="fill-cocoa-700"
                  font-size="11"
                >{{ b.value }}</text>
                <text
                  :x="b.x + b.w / 2"
                  :y="distChart.height - distChart.padding.bottom + 16"
                  text-anchor="middle"
                  class="fill-cocoa-500"
                  font-size="10"
                >{{ b.label }}</text>
                <title>{{ b.label }}：{{ b.value }} 人</title>
              </g>
              <!-- X 轴 -->
              <line
                :x1="distChart.padding.left"
                :x2="distChart.width - distChart.padding.right"
                :y1="distChart.padding.top + distChart.innerH"
                :y2="distChart.padding.top + distChart.innerH"
                stroke="rgb(var(--cocoa-300))"
                stroke-width="1"
              />
            </svg>
          </div>
        </div>

        <!-- 各科均分对比（横向） -->
        <div class="bg-white rounded-2xl p-6 shadow-softer">
          <div class="font-medium text-cocoa-700 mb-4 flex items-center gap-2">
            <BarChart3 class="w-4 h-4 text-butter-500" /> 各科均分对比
          </div>
          <div v-if="!avgChart" class="text-cocoa-400 text-sm py-8 text-center">暂无数据</div>
          <div v-else class="w-full overflow-x-auto">
            <svg
              :viewBox="`0 0 ${avgChart.width} ${avgChart.height}`"
              class="w-full h-auto"
              preserveAspectRatio="xMidYMid meet"
            >
              <g v-for="(r, i) in avgChart.rows" :key="'r' + i">
                <text
                  :x="avgChart.paddingLeft - 8"
                  :y="r.y + avgChart.barH / 2 + 4"
                  text-anchor="end"
                  class="fill-cocoa-700"
                  font-size="12"
                >{{ r.subject }}</text>
                <rect
                  :x="avgChart.paddingLeft"
                  :y="r.y"
                  :width="r.w"
                  :height="r.h"
                  :fill="r.above ? 'rgb(var(--mint-400))' : 'rgb(var(--butter-400))'"
                  rx="4"
                />
                <text
                  :x="avgChart.paddingLeft + r.w + 6"
                  :y="r.y + avgChart.barH / 2 + 4"
                  class="fill-cocoa-700"
                  font-size="12"
                  font-weight="600"
                >{{ fmt1(r.avg) }}</text>
                <title>{{ r.subject }}：均分 {{ fmt1(r.avg) }}</title>
              </g>
            </svg>
          </div>
        </div>
      </div>

      <!-- 排名表 -->
      <div class="bg-white rounded-2xl p-6 shadow-softer">
        <div class="flex items-center justify-between gap-4 mb-4 flex-wrap">
          <div class="font-medium text-cocoa-700 flex items-center gap-2">
            <Trophy class="w-4 h-4 text-butter-500" /> 成绩排名
            <span class="text-xs text-cocoa-400 font-normal">共 {{ ranks.length }} 人</span>
          </div>
          <select
            v-if="subjectNames.length"
            v-model="rankSubject"
            class="px-3 py-1.5 rounded-xl border border-cream-200 bg-white text-sm focus:outline-none focus:border-butter-400"
          >
            <option value="">全部科目</option>
            <option v-for="s in subjectNames" :key="s" :value="s">{{ s }}</option>
          </select>
        </div>

        <div v-if="rankLoading" class="text-cocoa-400 text-sm py-8 text-center flex items-center justify-center gap-2">
          <Loader2 class="w-4 h-4 animate-spin" /> 加载中…
        </div>
        <div v-else-if="!ranks.length" class="text-cocoa-400 text-sm py-8 text-center">暂无数据</div>
        <div v-else class="overflow-y-auto" style="max-height: 480px">
          <table class="w-full text-sm">
            <thead class="bg-cream-100 text-cocoa-500 text-left sticky top-0">
              <tr>
                <th class="px-4 py-3 font-medium">排名</th>
                <th class="px-4 py-3 font-medium">姓名</th>
                <th class="px-4 py-3 font-medium">分数</th>
                <th class="px-4 py-3 font-medium">百分位</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-cream-100">
              <tr
                v-for="r in ranks"
                :key="r.studentId || r.rank"
                class="hover:bg-cream-50"
              >
                <td class="px-4 py-2.5" :class="rankClass(r.rank)">
                  <span v-if="r.rank === 1" class="inline-flex items-center gap-1">
                    <Trophy class="w-3.5 h-3.5 text-butter-500" /> {{ r.rank }}
                  </span>
                  <span v-else>{{ r.rank }}</span>
                </td>
                <td class="px-4 py-2.5 font-medium text-cocoa-900">{{ studentName(r) }}</td>
                <td class="px-4 py-2.5 text-butter-600 font-semibold">{{ fmt1(r.score) }}</td>
                <td class="px-4 py-2.5 text-cocoa-700">{{ pctNum(r.percentile) }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- 前10名 / 后10名 -->
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <!-- 前10名 -->
        <div class="bg-white rounded-2xl p-6 shadow-softer">
          <div class="font-medium text-cocoa-700 mb-3 flex items-center gap-2">
            <Trophy class="w-4 h-4 text-butter-500" /> 前 10 名
          </div>
          <div v-if="!top10.length" class="text-cocoa-400 text-sm py-6 text-center">暂无数据</div>
          <div v-else class="overflow-x-auto">
            <table class="w-full text-sm">
              <thead class="bg-cream-100 text-cocoa-500 text-left">
                <tr>
                  <th class="px-3 py-2 font-medium">名次</th>
                  <th class="px-3 py-2 font-medium">姓名</th>
                  <th class="px-3 py-2 font-medium text-right">分数</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-cream-100">
                <tr v-for="r in top10" :key="'t' + r.rank" class="hover:bg-cream-50">
                  <td class="px-3 py-2" :class="rankClass(r.rank)">{{ r.rank }}</td>
                  <td class="px-3 py-2 font-medium text-cocoa-900">{{ studentName(r) }}</td>
                  <td class="px-3 py-2 text-right text-butter-600 font-semibold">{{ fmt1(r.score) }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <!-- 后10名 -->
        <div class="bg-white rounded-2xl p-6 shadow-softer">
          <div class="font-medium text-cocoa-700 mb-3 flex items-center gap-2">
            <AlertTriangle class="w-4 h-4 text-red-400" /> 后 10 名
          </div>
          <div v-if="!bottom10.length" class="text-cocoa-400 text-sm py-6 text-center">暂无数据</div>
          <div v-else class="overflow-x-auto">
            <table class="w-full text-sm">
              <thead class="bg-cream-100 text-cocoa-500 text-left">
                <tr>
                  <th class="px-3 py-2 font-medium">名次</th>
                  <th class="px-3 py-2 font-medium">姓名</th>
                  <th class="px-3 py-2 font-medium text-right">分数</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-cream-100">
                <tr v-for="r in bottom10" :key="'bt' + r.rank" class="hover:bg-cream-50">
                  <td class="px-3 py-2 text-cocoa-700">{{ r.rank }}</td>
                  <td class="px-3 py-2 font-medium text-cocoa-900">{{ studentName(r) }}</td>
                  <td class="px-3 py-2 text-right text-red-500 font-semibold">{{ fmt1(r.score) }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>
