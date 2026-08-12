<script setup lang="ts">
import { computed } from 'vue'
import { BarChart3, TrendingUp, Sparkles, Users, Target, Award, AlertTriangle } from 'lucide-vue-next'
import SvgLineChart from '@/components/SvgLineChart.vue'
import SvgBarChart from '@/components/SvgBarChart.vue'

interface ExamSubject {
  subject: string
  score: number | null
  fullScore: number
  classRank?: number | null
  classAvg?: number | null
  classPassRate?: number | null
  classExcellentRate?: number | null
}

interface ClassStats {
  classAvg?: number | null
  classFullAvg?: number | null
  classPassRate?: number | null
  classExcellentRate?: number | null
  classStudentCount?: number
  subjectAvgs?: Record<string, { avg: number; passRate: number; excellentRate: number; count: number }>
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
  classStats?: ClassStats
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

/* 与上一次考试的对比：总分变化 / 班级排名变化 */
const deltaInfo = computed(() => {
  const sel = props.selectedExam
  if (!sel) return null
  const sorted = [...props.exams].sort((a, b) => (a.date || '').localeCompare(b.date || ''))
  const idx = sorted.findIndex((e) =>
    (sel.examId && e.examId === sel.examId) || (e.examName === sel.examName && e.date === sel.date),
  )
  if (idx <= 0) return null
  const prev = sorted[idx - 1]
  const dScore = sel.totalScore != null && prev.totalScore != null ? Number(sel.totalScore) - Number(prev.totalScore) : null
  const dRank = sel.classRank != null && prev.classRank != null ? Number(prev.classRank) - Number(sel.classRank) : null
  return { prev, dScore, dRank }
})

/* 单科得分率与配色：≥80% 优势绿 / 60%~80% 中等黄 / <60% 偏弱红 */
function subjectPct(s: ExamSubject): number | null {
  if (s.score == null || !s.fullScore) return null
  return Math.round((s.score / s.fullScore) * 1000) / 10
}
function subjectBarColor(s: ExamSubject): string {
  const p = subjectPct(s)
  if (p == null) return '#e7e0d6'
  if (p >= EXCELLENT_RATIO) return '#2e8b57'
  if (p >= 0.6) return '#f5b342'
  return '#c9436d'
}

const histogram = computed(() => props.selectedExam?.distribution || [])

/* 班级对比：学生 vs 班级均分 */
const classCompare = computed(() => {
  const exam = props.selectedExam
  if (!exam) return null
  const cs = exam.classStats || {}
  const subjects = (exam.subjects || []).map(s => {
    const pct = subjectPct(s)
    const classAvg = s.classAvg ?? cs.subjectAvgs?.[s.subject]?.avg ?? null
    const diff = (s.score != null && classAvg != null) ? Number(s.score) - Number(classAvg) : null
    return {
      ...s,
      pct,
      classAvg,
      diff,
      classPassRate: s.classPassRate ?? cs.subjectAvgs?.[s.subject]?.passRate ?? null,
      classExcellentRate: s.classExcellentRate ?? cs.subjectAvgs?.[s.subject]?.excellentRate ?? null,
    }
  })
  const totalPct = exam.totalScore != null && exam.totalFullScore ? exam.totalScore / exam.totalFullScore : null
  const classPct = cs.classAvg != null && cs.classFullAvg ? cs.classAvg / cs.classFullAvg : null
  return {
    classAvg: cs.classAvg ?? null,
    classFullAvg: cs.classFullAvg ?? null,
    classPassRate: cs.classPassRate ?? null,
    classExcellentRate: cs.classExcellentRate ?? null,
    classStudentCount: cs.classStudentCount ?? 0,
    totalPct: totalPct ? Math.round(totalPct * 1000) / 10 : null,
    classPct: classPct ? Math.round(classPct * 1000) / 10 : null,
    pctDiff: totalPct != null && classPct != null ? Math.round((totalPct - classPct) * 1000) / 10 : null,
    subjects,
  }
})

/* 学情智能诊断（AI 风格） */
const aiInsight = computed(() => {
  const exam = props.selectedExam
  if (!exam) return { summary: '', tips: [], level: 'info' as 'info' | 'warn' | 'good' }
  const tips: string[] = []
  const subjects = exam.subjects || []
  const classStats = exam.classStats || {}
  let lowCount = 0
  let highCount = 0
  for (const s of subjects) {
    if (s.score == null || !s.fullScore) continue
    const pct = s.score / s.fullScore
    const classAvg = s.classAvg ?? classStats.subjectAvgs?.[s.subject]?.avg
    if (classAvg != null && s.score < classAvg) lowCount++
    else if (classAvg != null && s.score > classAvg) highCount++
    if (pct < 0.6) tips.push(`📕 ${s.subject} 成绩偏弱（${s.score}/${s.fullScore}），建议加强基础概念训练`)
    else if (pct < 0.75) tips.push(`📘 ${s.subject} 成绩中等（${s.score}/${s.fullScore}），有提升空间`)
    else if (pct >= 0.85) tips.push(`📗 ${s.subject} 表现优秀（${s.score}/${s.fullScore}），继续保持`)
  }
  let level: 'info' | 'warn' | 'good' = 'info'
  let summary = ''
  if (lowCount >= 2) {
    level = 'warn'
    summary = `本次考试有 ${lowCount} 科低于班级均分，需要重点关注薄弱环节`
  } else if (highCount >= Math.ceil(subjects.length / 2) && subjects.length > 0) {
    level = 'good'
    summary = `本次考试发挥出色，${highCount} 科高于班级均分，整体水平领先`
  } else {
    summary = '本次考试整体表现平稳，建议重点突破薄弱学科'
  }
  // 加入班级排名变化
  if (deltaInfo.value?.dRank != null) {
    const d = deltaInfo.value.dRank
    if (d > 0) tips.push(`📈 班级排名上升 ${d} 名，继续保持良好学习势头`)
    else if (d < 0) tips.push(`📉 班级排名下降 ${Math.abs(d)} 名，需要调整学习策略`)
  }
  // 与班级均分对比
  if (classCompare.value?.pctDiff != null) {
    const diff = classCompare.value.pctDiff
    if (diff < -5) tips.push(`⚠️ 总分得分率比班级平均低 ${Math.abs(diff)}%，需要加把劲`)
    else if (diff > 5) tips.push(`🏆 总分得分率比班级平均高 ${diff}%，表现突出`)
  }
  return { summary, tips, level }
})

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
      <div class="flex items-center justify-between mb-3 gap-3 flex-wrap">
        <div>
          <div class="font-semibold text-cocoa-900 text-lg">{{ selectedExam.examName }}</div>
          <div class="text-xs text-cocoa-500 mt-1">{{ selectedExam.date }} · 总分 {{ selectedExam.totalScore ?? '--' }} / {{ selectedExam.totalFullScore ?? '--' }}</div>
          <!-- 较上次考试变化 -->
          <div v-if="deltaInfo" class="flex flex-wrap items-center gap-2 mt-2">
            <span
              v-if="deltaInfo.dScore != null"
              class="text-xs px-2 py-0.5 rounded-full font-medium"
              :class="deltaInfo.dScore > 0 ? 'bg-mint-50 text-mint-700' : deltaInfo.dScore < 0 ? 'bg-sakura-50 text-sakura-700' : 'bg-cream-100 text-cocoa-500'"
            >
              总分较上次 {{ deltaInfo.dScore > 0 ? '+' : '' }}{{ deltaInfo.dScore }} 分
            </span>
            <span
              v-if="deltaInfo.dRank != null && deltaInfo.dRank !== 0"
              class="text-xs px-2 py-0.5 rounded-full font-medium"
              :class="deltaInfo.dRank > 0 ? 'bg-mint-50 text-mint-700' : 'bg-sakura-50 text-sakura-700'"
            >
              班级排名{{ deltaInfo.dRank > 0 ? '上升' : '下降' }} {{ Math.abs(deltaInfo.dRank) }} 名
            </span>
            <span v-if="deltaInfo.prev" class="text-xs text-cocoa-400">上次：{{ deltaInfo.prev.examName }}（{{ deltaInfo.prev.date }}）</span>
          </div>
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
        <div
          v-for="s in displayedSubjects"
          :key="s.subject"
          class="bg-cocoa-50 rounded-lg p-3 border"
          :class="{ 'border-butter-300': classCompare && s.score != null && s.classAvg != null && s.score < s.classAvg }"
        >
          <div class="flex items-center justify-between">
            <div class="text-xs text-cocoa-500 flex items-center gap-1">
              {{ s.subject }}
              <span
                v-if="classCompare && s.score != null && s.classAvg != null"
                class="text-[10px] px-1 rounded"
                :class="s.score >= s.classAvg ? 'bg-mint-100 text-mint-700' : 'bg-sakura-100 text-sakura-700'"
              >
                {{ s.score >= s.classAvg ? '超' : '低' }}班{{ Math.abs((s.score - s.classAvg)).toFixed(1) }}
              </span>
            </div>
            <div v-if="subjectPct(s) != null" class="text-xs font-semibold" :style="{ color: subjectBarColor(s) }">{{ subjectPct(s) }}%</div>
          </div>
          <div class="text-lg font-bold text-cocoa-900 mt-1">{{ s.score ?? '--' }} <span class="text-xs font-normal text-cocoa-400">/ {{ s.fullScore }}</span></div>
          <!-- 班级均分对比条 -->
          <div v-if="classCompare && s.classAvg != null" class="text-[10px] text-cocoa-500 mt-0.5">
            班级均 {{ s.classAvg }}
            <span v-if="s.classPassRate != null">· 班级及{{ s.classPassRate }}%</span>
          </div>
          <!-- 得分率进度条 -->
          <div class="mt-1.5 h-1.5 rounded-full bg-cream-200 overflow-hidden relative">
            <div class="h-full rounded-full transition-all absolute left-0" :style="{ width: Math.max(0, Math.min(100, subjectPct(s) ?? 0)) + '%', background: subjectBarColor(s) }"></div>
            <div
              v-if="classCompare && s.classAvg != null && s.fullScore"
              class="absolute top-0 bottom-0 w-0.5 bg-butter-500"
              :style="{ left: Math.min(100, (s.classAvg / s.fullScore) * 100) + '%' }"
              title="班级均分位置"
            ></div>
          </div>
          <div class="flex items-center justify-between mt-1">
            <div v-if="s.classRank" class="text-xs text-mint-600">班级第 {{ s.classRank }} 名</div>
            <div v-else class="text-xs text-cocoa-300">暂无排名</div>
            <div
              v-if="classCompare && s.diff != null"
              class="text-xs font-medium"
              :class="s.diff >= 0 ? 'text-mint-600' : 'text-sakura-500'"
            >
              {{ s.diff >= 0 ? '↑' : '↓' }} {{ Math.abs(s.diff).toFixed(1) }}
            </div>
          </div>
        </div>
      </div>

      <!-- 班级总分对比卡 -->
      <div v-if="classCompare && classCompare.classAvg != null" class="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div class="bg-mint-50 rounded-lg p-3">
          <div class="text-xs text-mint-700">我的得分率</div>
          <div class="text-xl font-bold text-mint-700 mt-0.5">{{ classCompare.totalPct ?? '--' }}%</div>
        </div>
        <div class="bg-cream-50 rounded-lg p-3">
          <div class="text-xs text-cocoa-500">班级平均得分率</div>
          <div class="text-xl font-bold text-cocoa-900 mt-0.5">{{ classCompare.classPct ?? '--' }}%</div>
        </div>
        <div class="bg-butter-50 rounded-lg p-3">
          <div class="text-xs text-butter-700">班级及格率</div>
          <div class="text-xl font-bold text-butter-700 mt-0.5">{{ classCompare.classPassRate ?? '--' }}%</div>
        </div>
        <div class="bg-sky2-50 rounded-lg p-3">
          <div class="text-xs text-sky2-700">班级优秀率</div>
          <div class="text-xl font-bold text-sky2-700 mt-0.5">{{ classCompare.classExcellentRate ?? '--' }}%</div>
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
              :style="{ height: Math.max(4, seg.pct) + '%', background: seg.isStudent ? '#2e8b57' : '#c8e6c9' }"
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
          <path :d="gradeTrend.path" fill="none" stroke="#2e8b57" stroke-width="2" stroke-linejoin="round" stroke-linecap="round" />
          <circle
            v-for="(p, i) in gradeTrend.points"
            :key="i"
            :cx="p.x"
            :cy="p.y"
            :r="i === gradeTrend.points.length - 1 ? 3.5 : 2.5"
            :fill="i === gradeTrend.points.length - 1 ? '#2e8b57' : '#a5d6a7'"
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

      <!-- AI 学情诊断 -->
      <div v-if="aiInsight.summary" class="mt-4 rounded-xl p-4 border" :class="{
        'bg-mint-50 border-mint-200': aiInsight.level === 'good',
        'bg-sakura-50 border-sakura-200': aiInsight.level === 'warn',
        'bg-butter-50 border-butter-200': aiInsight.level === 'info',
      }">
        <div class="flex items-center gap-2 mb-2">
          <Sparkles class="w-4 h-4" :class="{
            'text-mint-600': aiInsight.level === 'good',
            'text-sakura-600': aiInsight.level === 'warn',
            'text-butter-600': aiInsight.level === 'info',
          }" />
          <h4 class="text-sm font-semibold text-cocoa-900">学情诊断</h4>
          <span class="ml-auto text-xs px-2 py-0.5 rounded-full" :class="{
            'bg-mint-100 text-mint-700': aiInsight.level === 'good',
            'bg-sakura-100 text-sakura-700': aiInsight.level === 'warn',
            'bg-butter-100 text-butter-700': aiInsight.level === 'info',
          }">
            {{ aiInsight.level === 'good' ? '表现优秀' : aiInsight.level === 'warn' ? '需要关注' : '继续努力' }}
          </span>
        </div>
        <p class="text-sm text-cocoa-800 leading-relaxed mb-2">{{ aiInsight.summary }}</p>
        <div v-if="aiInsight.tips.length" class="space-y-1">
          <p v-for="(tip, i) in aiInsight.tips.slice(0, 5)" :key="i" class="text-xs text-cocoa-700 leading-relaxed">
            {{ tip }}
          </p>
        </div>
        <div class="mt-3 pt-3 border-t border-cocoa-100 flex items-center gap-2 text-xs text-cocoa-500">
          <Users class="w-3.5 h-3.5" />
          <span>班级 {{ classCompare?.classStudentCount ?? 0 }} 人 · 学科 {{ classCompare?.subjects.length ?? 0 }} 门</span>
          <Target class="w-3.5 h-3.5 ml-2" />
          <span>目标：及格率 ≥ 90%，优秀率 ≥ 40%</span>
        </div>
      </div>

      <!-- 历次考试排名变化表 -->
      <div v-if="exams.filter(e => e.classRank != null).length >= 2" class="mt-4">
        <div class="flex items-center gap-2 text-sm font-medium text-cocoa-700 mb-2">
          <Award class="w-4 h-4 text-butter-500" />
          历次考试排名变化
        </div>
        <div class="overflow-x-auto">
          <table class="w-full text-sm">
            <thead class="bg-cream-100 text-cocoa-500 text-left text-xs">
              <tr>
                <th class="px-3 py-2 font-medium">考试</th>
                <th class="px-3 py-2 font-medium text-right">日期</th>
                <th class="px-3 py-2 font-medium text-right">总分</th>
                <th class="px-3 py-2 font-medium text-right">班级排名</th>
                <th class="px-3 py-2 font-medium text-right">较上次</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-cream-100">
              <tr
                v-for="(e, i) in [...exams].filter(e => e.classRank != null).sort((a, b) => (b.date || '').localeCompare(a.date || '')).slice(0, 6)"
                :key="e.examId + e.date"
                class="hover:bg-cream-50"
              >
                <td class="px-3 py-2 text-cocoa-900">{{ e.examName }}</td>
                <td class="px-3 py-2 text-right text-cocoa-500">{{ e.date }}</td>
                <td class="px-3 py-2 text-right font-medium text-cocoa-900">{{ e.totalScore ?? '--' }}</td>
                <td class="px-3 py-2 text-right">
                  <span class="font-semibold" :class="e.classRank <= 3 ? 'text-butter-600' : e.classRank <= 10 ? 'text-mint-600' : 'text-cocoa-700'">第 {{ e.classRank }} 名</span>
                </td>
                <td class="px-3 py-2 text-right">
                  <template v-if="i > 0">
                    <span
                      class="text-xs font-medium px-1.5 py-0.5 rounded"
                      :class="(e.classRank! - [...exams].filter(x => x.classRank != null).sort((a, b) => (b.date || '').localeCompare(a.date || ''))[i - 1].classRank!) > 0 ? 'bg-mint-100 text-mint-700' : 'bg-sakura-100 text-sakura-700'"
                    >
                      {{ (e.classRank! - [...exams].filter(x => x.classRank != null).sort((a, b) => (b.date || '').localeCompare(a.date || ''))[i - 1].classRank!) > 0 ? '↑' : '↓' }}
                      {{ Math.abs(e.classRank! - [...exams].filter(x => x.classRank != null).sort((a, b) => (b.date || '').localeCompare(a.date || ''))[i - 1].classRank!) }}
                    </span>
                  </template>
                  <span v-else class="text-cocoa-300">首次</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  </div>
</template>
