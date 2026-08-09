<script setup lang="ts">
import { computed } from 'vue'
import { BarChart3, TrendingUp } from 'lucide-vue-next'
import SvgLineChart from '@/components/SvgLineChart.vue'
import SvgBarChart from '@/components/SvgBarChart.vue'

interface ExamSubject {
  subject: string
  score: number | null
  fullScore: number
  classRank?: number | null
}

interface Exam {
  examId?: string
  examName: string
  date: string
  totalScore?: number | null
  totalFullScore?: number | null
  classRank?: number | null
  gradeRank?: number | null
  subjects?: ExamSubject[]
  distribution?: Array<{ label: string; count: number; pct: number; isStudent?: boolean }>
  analysisNote?: string
}

const props = defineProps<{
  loading: boolean
  exams: Exam[]
  selectedExam: Exam | null
  filterTerm: string
  filterExamName: string
  filterSubject: string
  termOptions: string[]
  examNameOptions: string[]
  subjectOptions: string[]
  scoreTrend: Array<{ label: string; value: number }>
  monthTrend: Array<{ label: string; value: number }>
}>()

const emit = defineEmits<{
  (e: 'update:filterTerm', v: string): void
  (e: 'update:filterExamName', v: string): void
  (e: 'update:filterSubject', v: string): void
}>()

const EXCELLENT_RATIO = 0.8

const displayedSubjects = computed(() => {
  const subs = (props.selectedExam?.subjects || []) as ExamSubject[]
  if (!props.filterSubject) return subs
  return subs.filter(s => s.subject === props.filterSubject)
})

const rankedSubjects = computed(() => {
  const subs = (props.selectedExam?.subjects || []) as ExamSubject[]
  return subs
    .filter((s) => s.score != null && s.fullScore)
    .filter((s) => !props.filterSubject || s.subject === props.filterSubject)
    .map((s) => ({ subject: s.subject, score: s.score as number, fullScore: s.fullScore, pct: (s.score as number) / s.fullScore }))
    .sort((a, b) => b.pct - a.pct)
})

const strengths = computed(() => rankedSubjects.value.filter((s) => s.pct >= EXCELLENT_RATIO).map((s) => s.subject))
const weaknesses = computed(() => {
  const below = rankedSubjects.value.filter((s) => s.pct < EXCELLENT_RATIO).sort((a, b) => a.pct - b.pct)
  return below.slice(0, 3).map((s) => s.subject)
})

const histogram = computed(() => props.selectedExam?.distribution || [])

const gradeTrend = computed(() => {
  const list = props.exams
    .filter(e => e.totalScore != null)
    .slice()
    .sort((a, b) => (a.date || '').localeCompare(b.date || ''))
  if (list.length < 2) return { points: [], max: 0, min: 0, range: 1, W: 240, H: 56, padX: 6, padY: 8, lastRank: null as any }
  const scores = list.map(e => Number(e.totalScore))
  const max = Math.max(...scores)
  const min = Math.min(...scores)
  const range = max - min || 1
  const W = 240, H = 56, padX = 6, padY = 8
  const innerW = W - padX * 2
  const innerH = H - padY * 2
  const points = list.map((e, i) => {
    const x = padX + (list.length === 1 ? innerW / 2 : (i / (list.length - 1)) * innerW)
    const y = padY + innerH - ((Number(e.totalScore) - min) / range) * innerH
    return { x, y, score: Number(e.totalScore), label: e.examName, date: e.date, classRank: e.classRank, gradeRank: e.gradeRank }
  })
  const path = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ')
  const lastRank = list[list.length - 1]?.classRank ?? null
  return { points, path, max, min, range, W, H, padX, padY, lastRank }
})
</script>

<template>
  <!-- 成长数据图表 -->
  <div v-if="!loading && (scoreTrend.length || monthTrend.length)" class="mt-4 px-4">
    <div class="section-title">
      <TrendingUp class="w-5 h-5 text-butter-400" />
      <h2>成长数据</h2>
    </div>
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <div class="quick-card !p-5">
        <div class="flex items-center gap-2 text-sm font-medium text-cocoa-700 mb-2">
          <BarChart3 class="w-4 h-4 text-butter-500" /> 成绩趋势
          <span class="ml-auto text-xs text-cocoa-400">得分率 %</span>
        </div>
        <SvgLineChart v-if="scoreTrend.length" :data="scoreTrend" :height="180" title="" series1Name="得分率" color="#f5b342" />
        <div v-else class="text-sm text-cocoa-400 py-10 text-center">暂无成绩数据</div>
      </div>
      <div class="quick-card !p-5">
        <div class="flex items-center gap-2 text-sm font-medium text-cocoa-700 mb-2">
          <TrendingUp class="w-4 h-4 text-mint-500" /> 月度成长足迹
          <span class="ml-auto text-xs text-cocoa-400">打卡次数</span>
        </div>
        <SvgBarChart :data="monthTrend" :height="180" title="" />
      </div>
    </div>
  </div>

  <!-- 成绩查询 -->
  <div v-if="!loading && exams.length" id="parent-grades-section">
    <div class="section-title flex-wrap">
      <BarChart3 class="w-5 h-5 text-mint-400" />
      <h2>成绩查询</h2>
      <div class="ml-auto flex flex-wrap items-center gap-2">
        <select
          :value="filterTerm"
          class="text-sm rounded-xl border border-cream-200 bg-surface px-3 py-1.5 text-cocoa-700 focus:outline-none focus:border-butter-400"
          @change="emit('update:filterTerm', ($event.target as HTMLSelectElement).value)"
        >
          <option value="">全部学期</option>
          <option v-for="t in termOptions" :key="t" :value="t">{{ t }}</option>
        </select>
        <select
          :value="filterExamName"
          class="text-sm rounded-xl border border-cream-200 bg-surface px-3 py-1.5 text-cocoa-700 focus:outline-none focus:border-butter-400"
          @change="emit('update:filterExamName', ($event.target as HTMLSelectElement).value)"
        >
          <option value="">全部考试</option>
          <option v-for="n in examNameOptions" :key="n" :value="n">{{ n }}</option>
        </select>
        <select
          :value="filterSubject"
          class="text-sm rounded-xl border border-cream-200 bg-surface px-3 py-1.5 text-cocoa-700 focus:outline-none focus:border-butter-400"
          @change="emit('update:filterSubject', ($event.target as HTMLSelectElement).value)"
        >
          <option value="">全部科目</option>
          <option v-for="s in subjectOptions" :key="s" :value="s">{{ s }}</option>
        </select>
      </div>
    </div>

    <div v-if="selectedExam" class="quick-card">
      <div class="flex items-center justify-between mb-3">
        <div>
          <div class="font-semibold text-cocoa-900 text-lg">{{ selectedExam.examName }}</div>
          <div class="text-xs text-cocoa-500 mt-1">{{ selectedExam.date }} · 总分 {{ selectedExam.totalScore ?? '--' }} / {{ selectedExam.totalFullScore ?? '--' }}</div>
        </div>
        <div v-if="selectedExam.classRank || selectedExam.gradeRank" class="text-right space-y-1">
          <div v-if="selectedExam.classRank" class="text-right">
            <div class="text-2xl font-bold text-mint-600">第 {{ selectedExam.classRank }} 名</div>
            <div class="text-xs text-cocoa-500">班级排名</div>
          </div>
          <div v-if="selectedExam.gradeRank" class="text-right">
            <div class="text-2xl font-bold text-butter-600">第 {{ selectedExam.gradeRank }} 名</div>
            <div class="text-xs text-cocoa-500">年级排名</div>
          </div>
        </div>
      </div>

      <div class="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <div v-for="s in displayedSubjects" :key="s.subject" class="bg-cocoa-50 rounded-lg p-3">
          <div class="text-xs text-cocoa-500">{{ s.subject }}</div>
          <div class="text-lg font-bold text-cocoa-900 mt-1">{{ s.score ?? '--' }} <span class="text-xs font-normal text-cocoa-400">/ {{ s.fullScore }}</span></div>
          <div v-if="s.classRank" class="text-xs text-mint-600 mt-1">班级第 {{ s.classRank }} 名</div>
        </div>
      </div>

      <!-- 优弱势学科 -->
      <div v-if="strengths.length || weaknesses.length" class="flex flex-wrap gap-2 mt-3">
        <span v-for="s in strengths" :key="'s-' + s" class="text-xs px-2 py-1 rounded-full bg-mint-50 text-mint-700">⬆️ {{ s }}</span>
        <span v-for="s in weaknesses" :key="'w-' + s" class="text-xs px-2 py-1 rounded-full bg-sakura-50 text-sakura-700">⬇️ {{ s }}</span>
      </div>

      <!-- 总分分布直方图 -->
      <div v-if="histogram.length" class="mt-4">
        <div class="text-xs text-cocoa-500 mb-2">总分分布（共 {{ histogram.length }} 段）</div>
        <div class="flex items-end gap-1.5 h-32">
          <div v-for="seg in histogram" :key="seg.label" class="flex-1 flex flex-col items-center justify-end h-full">
            <div
              class="w-full rounded-t-md transition-all"
              :style="{ height: Math.max(4, seg.pct) + '%', background: seg.isStudent ? '#07c160' : '#c8e6c9' }"
            ></div>
            <div class="text-xs text-cocoa-400 mt-1 leading-none">{{ seg.label }}</div>
            <div class="text-xs text-cocoa-400 leading-none">{{ seg.count }}人</div>
          </div>
        </div>
      </div>

      <!-- 历次考试总分趋势 mini 折线图 -->
      <div v-if="gradeTrend.points.length >= 2" class="mt-4 bg-mint-50 rounded-lg p-3">
        <div class="flex items-center justify-between mb-1">
          <div class="text-xs font-medium text-mint-700 flex items-center gap-1"><TrendingUp class="w-3.5 h-3.5" /> 历次考试总分趋势</div>
          <div v-if="gradeTrend.lastRank" class="text-xs text-mint-700">最新班级第 {{ gradeTrend.lastRank }} 名</div>
        </div>
        <svg :viewBox="`0 0 ${gradeTrend.W} ${gradeTrend.H}`" class="w-full" style="max-height: 56px;" preserveAspectRatio="xMidYMid meet">
          <path :d="gradeTrend.path" fill="none" stroke="#07c160" stroke-width="2" stroke-linejoin="round" stroke-linecap="round" />
          <circle
            v-for="(p, i) in gradeTrend.points"
            :key="i"
            :cx="p.x"
            :cy="p.y"
            :r="i === gradeTrend.points.length - 1 ? 3.5 : 2.5"
            :fill="i === gradeTrend.points.length - 1 ? '#07c160' : '#a5d6a7'"
          >
            <title>{{ p.label }}（{{ p.date }}）：{{ p.score }} 分<span v-if="p.classRank"> · 班第{{ p.classRank }}名</span></title>
          </circle>
        </svg>
        <div class="flex items-center justify-between mt-1 text-xs text-mint-600">
          <span>{{ gradeTrend.points[0].date }}</span>
          <span class="font-medium">{{ gradeTrend.points[gradeTrend.points.length - 1].score }} 分</span>
          <span>{{ gradeTrend.points[gradeTrend.points.length - 1].date }}</span>
        </div>
      </div>

      <div v-if="selectedExam.analysisNote" class="mt-3 text-sm text-cocoa-600 bg-butter-50 rounded-lg p-3">
        📝 {{ selectedExam.analysisNote }}
      </div>
    </div>
  </div>
</template>
