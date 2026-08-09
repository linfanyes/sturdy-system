<script setup lang="ts">
import { ref, onMounted, computed, watch } from 'vue'
import { toast } from '@/utils/feedback'
import { useRouter } from 'vue-router'
import request from '@/api/request'
import { loadClasses, useClasses } from '@/composables/useClasses'
import { listExams, getExamAnalysis, getClassRank, getExamTrend, aiAnalyzeExam } from '@/api/teacher'
import { BarChart3, TrendingUp, Sparkles, FileText, ArrowLeft, Target, Users, Award, AlertTriangle } from 'lucide-vue-next'
import ScoreDistribution from './components/ScoreDistribution.vue'
import StudentScoreMatrix from './components/StudentScoreMatrix.vue'
import ClassComparison from './components/ClassComparison.vue'
import { fmt1, pct } from '@gardener/shared/utils/format'

const router = useRouter()
const { classes } = useClasses()
onMounted(() => loadClasses())

const activeTab = ref<'exam' | 'trend' | 'ai'>('exam')

/* ============ 公共：班级和考试选择 ============ */
const classId = ref('')
const exams = ref<any[]>([])
const selectedExamId = ref('')

async function loadExams() {
  if (!classId.value) { exams.value = []; return }
  try {
    const res = await listExams({ classId: classId.value, take: 100 })
    exams.value = Array.isArray(res) ? res : (res?.items || [])
    selectedExamId.value = ''
  } catch { exams.value = [] }
}

watch(classId, () => { loadExams(); loadTrend() })

/* ============ Tab 1: 本次考试分析 ============ */
const examLoading = ref(false)
const examStats = ref<any>(null)
const rankData = ref<any[]>([])
const rankSubject = ref('')
const distSubject = ref('')

const selectedExam = computed(() => exams.value.find(e => e.id === selectedExamId.value))

async function loadExamStats() {
  if (!classId.value || !selectedExamId.value) return
  examLoading.value = true; examStats.value = null
  try {
    const fullScoreMap = selectedExam.value?.subjectFullScores
      ? Object.fromEntries(Object.entries(selectedExam.value.subjectFullScores).map(([k, v]) => [k, Number(v)]))
      : undefined
    examStats.value = await getExamAnalysis(classId.value, selectedExamId.value, fullScoreMap)
  } catch (e: any) { } finally { examLoading.value = false }
}

async function loadRank() {
  if (!classId.value || !selectedExamId.value) { rankData.value = []; return }
  try {
    rankData.value = (await getClassRank(classId.value, selectedExamId.value, rankSubject.value || undefined))?.ranks || []
  } catch { rankData.value = [] }
}

watch(selectedExamId, () => { loadExamStats(); loadRank() })
watch(rankSubject, loadRank)

/* ============ 班级对比 ============ */
const compareClassId = ref('')
const analysisB = ref<any>(null)
const compareLoading = ref(false)

const compareClasses = computed(() => {
  if (!classId.value || !classes.value.length) return []
  const current = classes.value.find(c => c.id === classId.value)
  const grade = current?.grade || ''
  return classes.value.filter(c => c.id !== classId.value && c.grade === grade)
})

watch([classId, selectedExamId, compareClassId], () => {
  if (classId.value && selectedExamId.value && compareClassId.value) { loadCompare() }
  else { analysisB.value = null }
})

async function loadCompare() {
  if (!classId.value || !selectedExamId.value || !compareClassId.value) return
  compareLoading.value = true; analysisB.value = null
  try {
    const fullScoreMap = selectedExam.value?.subjectFullScores
      ? Object.fromEntries(Object.entries(selectedExam.value.subjectFullScores).map(([k, v]) => [k, Number(v)]))
      : undefined
    analysisB.value = await getExamAnalysis(compareClassId.value, selectedExamId.value, fullScoreMap)
  } catch { analysisB.value = null } finally { compareLoading.value = false }
}

/* 统计计算 */
const avgPassRate = computed(() => {
  if (!examStats.value?.subjects?.length) return 0
  const rates = examStats.value.subjects.map((s: any) => s.passRate || 0)
  return rates.reduce((a: number, b: number) => a + b, 0) / rates.length
})
const avgExcellentRate = computed(() => {
  if (!examStats.value?.subjects?.length) return 0
  const rates = examStats.value.subjects.map((s: any) => s.excellentRate || 0)
  return rates.reduce((a: number, b: number) => a + b, 0) / rates.length
})

/* ============ 格式化（复用 shared） ============ */

/* ============ Tab 2: 历来考试趋势 ============ */
const trendLoading = ref(false)
const trendData = ref<any>(null)
const trendSubject = ref('')

async function loadTrend() {
  if (!classId.value) { trendData.value = null; return }
  trendLoading.value = true
  try { trendData.value = await getExamTrend(classId.value, trendSubject.value || undefined) }
  catch { trendData.value = null } finally { trendLoading.value = false }
}

watch(trendSubject, loadTrend)

const trendChartPoints = computed(() => {
  if (!trendData.value?.trend) return []
  const allPoints: { label: string; date: string; [subject: string]: any }[] = []
  for (const [subject, points] of Object.entries(trendData.value.trend)) {
    for (const p of points as any[]) {
      let existing = allPoints.find(x => x.date === p.date && x.label === p.examName)
      if (!existing) { existing = { label: p.examName, date: p.date }; allPoints.push(existing) }
      existing[subject] = p.avg
    }
  }
  allPoints.sort((a, b) => a.date.localeCompare(b.date))
  return allPoints
})

const trendSubjects = computed(() => {
  if (!trendData.value?.trend) return []
  return Object.keys(trendData.value.trend)
})

const CHART_W = 800; const CHART_H = 300
const PAD = { top: 20, right: 20, bottom: 40, left: 40 }

const trendLines = computed(() => {
  if (!trendChartPoints.value.length || !trendSubjects.value.length) return []
  const n = trendChartPoints.value.length
  const plotW = CHART_W - PAD.left - PAD.right
  const plotH = CHART_H - PAD.top - PAD.bottom
  const colors = ['#e6a23c', '#67c23a', '#1C6FB3', '#f56c6c', '#909399', '#9c27b0']
  return trendSubjects.value.map((subject, idx) => {
    const points = trendChartPoints.value
      .map((p, i) => {
        const score = p[subject]; if (score == null) return null
        const x = PAD.left + (n <= 1 ? plotW / 2 : (i / (n - 1)) * plotW)
        const y = PAD.top + plotH - (score / 100) * plotH
        return { x, y, score }
      }).filter(Boolean) as { x: number; y: number; score: number }[]
    return { subject, color: colors[idx % colors.length], points, path: points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ') }
  })
})

/* 班级整体趋势（从 trendData 聚合） */
const overallTrend = computed(() => {
  if (!trendData.value?.trend) return []
  const examMap = new Map<string, { examName: string; date: string; totalScore: number; totalCount: number }>()
  for (const [, arr] of Object.entries(trendData.value.trend)) {
    for (const item of arr as Array<{ examName: string; date: string; avg: number; count: number }>) {
      if (item.count <= 0) continue
      const key = item.examName + '|' + item.date
      const existing = examMap.get(key) || { examName: item.examName, date: item.date, totalScore: 0, totalCount: 0 }
      existing.totalScore += item.avg * item.count; existing.totalCount += item.count
      examMap.set(key, existing)
    }
  }
  return Array.from(examMap.values()).map(e => ({ examName: e.examName, date: e.date, classAvg: Math.round((e.totalScore / e.totalCount) * 10) / 10 }))
    .sort((a, b) => (a.date || '').localeCompare(b.date || ''))
})

const TREND_PAD = { left: 40, right: 20, top: 20, bottom: 30 }
const trendPoints = computed(() => {
  const data = overallTrend.value; if (!data.length) return []
  const n = data.length; const plotW = 680 - TREND_PAD.left - TREND_PAD.right; const plotH = 140
  const maxY = Math.max(100, ...data.map(d => d.classAvg)); const minY = Math.min(0, ...data.map(d => d.classAvg))
  const yRange = maxY - minY || 100
  return data.map((d, i) => {
    const x = n <= 1 ? TREND_PAD.left + plotW / 2 : TREND_PAD.left + (i / (n - 1)) * plotW
    const y = d.classAvg != null ? TREND_PAD.top + plotH - ((d.classAvg - minY) / yRange) * plotH : null
    return { x, y, label: d.examName, value: d.classAvg }
  }).filter((p): p is { x: number; y: number; label: string; value: number } => p.y != null)
})

const trendPath = computed(() => {
  if (trendPoints.value.length < 2) return ''
  return trendPoints.value.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ')
})

/* ============ Tab 3: AI 分析 ============ */
const aiLoading = ref(false)
const aiResult = ref('')

async function aiAnalyze() {
  if (!selectedExamId.value) { toast.warning('请选择考试'); return }
  aiLoading.value = true; aiResult.value = ''
  try {
    const res = await aiAnalyzeExam(selectedExamId.value)
    aiResult.value = res?.content || '（无分析结果）'
  } catch (e: any) { aiResult.value = `分析失败：${e?.message || '未知错误'}` }
  finally { aiLoading.value = false }
}

function goExamDetail() {
  if (!selectedExamId.value || !classId.value) return
  router.push({ path: '/teacher/exam-detail', query: { examId: selectedExamId.value, classId: classId.value } })
}
function goStudentGrades(studentId: string) {
  if (!classId.value) return
  router.push({ path: '/teacher/student-grades', query: { studentId, classId: classId.value } })
}
</script>

<template>
  <div class="space-y-4">
    <h1 class="text-2xl font-bold text-cocoa-900 flex items-center gap-2">
      <BarChart3 class="w-6 h-6 text-butter-500" /> 成绩分析
    </h1>

    <!-- 班级选择 -->
    <div class="bg-surface rounded-2xl p-4 shadow-softer">
      <div class="flex items-center gap-3 flex-wrap">
        <select v-model="classId" class="px-3 py-2 rounded-xl border border-cream-200 text-sm focus:outline-none focus:border-butter-400">
          <option value="">选择班级</option>
          <option v-for="c in classes" :key="c.id" :value="c.id">{{ c.name }}</option>
        </select>
        <select v-model="selectedExamId" class="px-3 py-2 rounded-xl border border-cream-200 text-sm focus:outline-none focus:border-butter-400" :disabled="!classId">
          <option value="">选择考试</option>
          <option v-for="e in exams" :key="e.id" :value="e.id">{{ e.name }}（{{ e.date }}）</option>
        </select>
        <button v-if="selectedExamId" class="px-3 py-2 rounded-xl bg-butter-100 text-butter-600 text-sm hover:bg-butter-200 flex items-center gap-1" @click="goExamDetail">
          <ArrowLeft class="w-4 h-4 rotate-180" /> 考试详情
        </button>
      </div>
    </div>

    <!-- Tab 切换 -->
    <div class="flex gap-2 bg-surface rounded-2xl p-1 shadow-softer w-fit">
      <button class="px-4 py-2 rounded-xl text-sm font-medium transition-colors" :class="activeTab === 'exam' ? 'bg-butter-500 text-white' : 'text-cocoa-500 hover:bg-cream-50'" @click="activeTab = 'exam'">本次分析</button>
      <button class="px-4 py-2 rounded-xl text-sm font-medium transition-colors" :class="activeTab === 'trend' ? 'bg-butter-500 text-white' : 'text-cocoa-500 hover:bg-cream-50'" @click="activeTab = 'trend'">历来趋势</button>
      <button class="px-4 py-2 rounded-xl text-sm font-medium transition-colors" :class="activeTab === 'ai' ? 'bg-butter-500 text-white' : 'text-cocoa-500 hover:bg-cream-50'" @click="activeTab = 'ai'">AI 分析</button>
    </div>

    <!-- Tab 1: 本次考试分析 -->
    <template v-if="activeTab === 'exam'">
      <div v-if="examLoading" class="text-center py-12 text-cocoa-400">加载中…</div>
      <div v-else-if="!examStats" class="text-center py-12 text-cocoa-400">请选择班级和考试查看分析</div>
      <div v-else class="space-y-4">
        <!-- 统计卡片 -->
        <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          <div class="stat-card">
            <Target class="w-5 h-5 text-butter-500 mb-1" />
            <div class="text-2xl font-bold text-cocoa-900">{{ fmt1(examStats.classAvg) }}</div>
            <div class="text-xs text-cocoa-400">班级均分</div>
          </div>
          <div class="stat-card">
            <Users class="w-5 h-5 text-mint-500 mb-1" />
            <div class="text-2xl font-bold text-cocoa-900">{{ examStats.totalStudents }}</div>
            <div class="text-xs text-cocoa-400">参考人数</div>
          </div>
          <div class="stat-card">
            <div class="text-2xl font-bold text-mint-500">{{ pct(avgPassRate) }}</div>
            <div class="text-xs text-cocoa-400">及格率</div>
          </div>
          <div class="stat-card">
            <div class="text-2xl font-bold text-butter-500">{{ pct(avgExcellentRate) }}</div>
            <div class="text-xs text-cocoa-400">优秀率</div>
          </div>
          <div class="stat-card">
            <Award class="w-5 h-5 text-mint-500 mb-1" />
            <div class="text-sm font-medium text-mint-600">{{ examStats.strongSubjects?.join('、') || '-' }}</div>
            <div class="text-xs text-cocoa-400">优势学科</div>
          </div>
          <div class="stat-card">
            <AlertTriangle class="w-5 h-5 text-red-400 mb-1" />
            <div class="text-sm font-medium text-red-500">{{ examStats.weakSubjects?.join('、') || '-' }}</div>
            <div class="text-xs text-cocoa-400">薄弱学科</div>
          </div>
        </div>

        <!-- 各科统计表 -->
        <div class="bg-surface rounded-2xl p-4 shadow-softer">
          <h3 class="text-sm font-medium text-cocoa-700 mb-3">各科统计</h3>
          <div class="overflow-x-auto">
            <table class="w-full text-sm">
              <thead class="bg-cream-100 text-cocoa-500 text-left">
                <tr>
                  <th class="px-3 py-2 font-medium">科目</th>
                  <th class="px-3 py-2 font-medium">均分</th>
                  <th class="px-3 py-2 font-medium">最高</th>
                  <th class="px-3 py-2 font-medium">最低</th>
                  <th class="px-3 py-2 font-medium">及格率</th>
                  <th class="px-3 py-2 font-medium">优秀率</th>
                  <th class="px-3 py-2 font-medium">标准差</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-cream-100">
                <tr v-for="s in examStats.subjects" :key="s.subject" class="hover:bg-cream-50">
                  <td class="px-3 py-2 font-medium text-cocoa-900">{{ s.subject }}</td>
                  <td class="px-3 py-2 text-cocoa-700">{{ fmt1(s.avg) }}</td>
                  <td class="px-3 py-2 text-mint-500">{{ s.max }}</td>
                  <td class="px-3 py-2 text-red-400">{{ s.min }}</td>
                  <td class="px-3 py-2 text-cocoa-700">{{ pct(s.passRate) }}</td>
                  <td class="px-3 py-2 text-cocoa-700">{{ pct(s.excellentRate) }}</td>
                  <td class="px-3 py-2 text-cocoa-500">{{ fmt1(s.stdDev) }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <!-- 分数分布 & 各科均分子组件 -->
        <ScoreDistribution
          :subjects="examStats.subjects"
          v-model:dist-subject="distSubject"
        />

        <!-- 排名表 & 学生成绩矩阵 -->
        <div class="bg-surface rounded-2xl p-4 shadow-softer">
          <div class="flex items-center justify-between mb-3">
            <h3 class="text-sm font-medium text-cocoa-700">排名筛选</h3>
            <select v-model="rankSubject" class="px-2 py-1 rounded-lg border border-cream-200 text-xs">
              <option value="">全部科目</option>
              <option v-for="s in examStats.subjects" :key="s.subject" :value="s.subject">{{ s.subject }}</option>
            </select>
          </div>
        </div>
        <StudentScoreMatrix :subjects="examStats.subjects" :rank-data="rankData" :total-subjects="examStats.subjects.length" />

        <!-- 历史趋势 -->
        <div v-if="overallTrend.length > 1" class="bg-surface rounded-2xl p-4 shadow-softer">
          <h3 class="text-sm font-medium text-cocoa-700 mb-3 flex items-center gap-1">
            <TrendingUp class="w-4 h-4 text-butter-500" /> 班级均分趋势
          </h3>
          <svg :viewBox="`0 0 680 200`" class="w-full h-auto">
            <g v-for="(t, i) in [0, 25, 50, 75, 100]" :key="'y' + t">
              <line x1="40" :x2="660" :y1="20 + (1 - t / 100) * 140" :y2="20 + (1 - t / 100) * 140" stroke="#f5f0e8" stroke-dasharray="3 3" />
              <text x="34" :y="20 + (1 - t / 100) * 140 + 4" text-anchor="end" class="fill-cocoa-400" style="font-size: 10px;">{{ t }}</text>
            </g>
            <g v-for="(p, i) in trendPoints" :key="'x' + i">
              <text :x="p.x" :y="194" text-anchor="middle" class="fill-cocoa-400" style="font-size: 9px;">{{ p.label.length > 5 ? p.label.slice(0, 5) + '…' : p.label }}</text>
            </g>
            <path v-if="trendPoints.length > 1" :d="trendPath" stroke="#e6a23c" stroke-width="2" fill="none" />
            <g v-for="(p, i) in trendPoints" :key="'p' + i">
              <circle :cx="p.x" :cy="p.y" r="3" fill="#e6a23c" />
              <text v-if="p.value != null" :x="p.x" :y="p.y - 6" text-anchor="middle" class="fill-cocoa-700" style="font-size: 9px; font-weight: 600;">{{ p.value.toFixed(1) }}</text>
            </g>
          </svg>
        </div>

        <!-- 班级对比 -->
        <ClassComparison
          :exam-stats="examStats" :analysis-b="analysisB"
          :compare-classes="compareClasses"
          :compare-loading="compareLoading"
          v-model:compare-class-id="compareClassId"
        />
      </div>
    </template>

    <!-- Tab 2: 历来趋势 -->
    <template v-if="activeTab === 'trend'">
      <div class="bg-surface rounded-2xl p-4 shadow-softer">
        <div class="flex items-center gap-3 mb-3">
          <TrendingUp class="w-4 h-4 text-butter-500" />
          <span class="text-sm font-medium text-cocoa-700">科目筛选</span>
          <select v-model="trendSubject" class="px-2 py-1 rounded-lg border border-cream-200 text-xs">
            <option value="">全部科目</option>
            <option v-for="s in trendSubjects" :key="s" :value="s">{{ s }}</option>
          </select>
        </div>
      </div>
      <div v-if="trendLoading" class="text-center py-12 text-cocoa-400">加载中…</div>
      <div v-else-if="!trendData" class="text-center py-12 text-cocoa-400">请选择班级查看趋势</div>
      <div v-else-if="!trendChartPoints.length" class="text-center py-12 text-cocoa-400">暂无趋势数据</div>
      <div v-else class="space-y-4">
        <!-- 趋势折线图 -->
        <div class="bg-surface rounded-2xl p-4 shadow-softer">
          <h3 class="text-sm font-medium text-cocoa-700 mb-3">均分趋势</h3>
          <svg :viewBox="`0 0 ${CHART_W} ${CHART_H}`" class="w-full">
            <g v-for="y in [0, 25, 50, 75, 100]" :key="y">
              <line :x1="PAD.left" :y1="PAD.top + (1 - y / 100) * (CHART_H - PAD.top - PAD.bottom)" :x2="CHART_W - PAD.right" :y2="PAD.top + (1 - y / 100) * (CHART_H - PAD.top - PAD.bottom)" stroke="#f5f0e8" stroke-dasharray="3 3" />
              <text :x="PAD.left - 8" :y="PAD.top + (1 - y / 100) * (CHART_H - PAD.top - PAD.bottom) + 4" text-anchor="end" class="fill-cocoa-400" style="font-size: 10px;">{{ y }}</text>
            </g>
            <g v-for="(p, i) in trendChartPoints" :key="i">
              <text :x="PAD.left + (trendChartPoints.length <= 1 ? (CHART_W - PAD.left - PAD.right) / 2 : (i / (trendChartPoints.length - 1)) * (CHART_W - PAD.left - PAD.right))" :y="CHART_H - PAD.bottom + 15" text-anchor="middle" class="fill-cocoa-400" style="font-size: 9px;">{{ p.label.length > 6 ? p.label.slice(0, 6) + '…' : p.label }}</text>
            </g>
            <g v-for="line in trendLines" :key="line.subject">
              <path :d="line.path" :stroke="line.color" stroke-width="2" fill="none" />
              <g v-for="(pt, i) in line.points" :key="i">
                <circle :cx="pt.x" :cy="pt.y" r="3" :fill="line.color" />
                <text :x="pt.x" :y="pt.y - 6" text-anchor="middle" class="fill-cocoa-700" style="font-size: 9px; font-weight: 600;">{{ pt.score.toFixed(1) }}</text>
              </g>
            </g>
          </svg>
          <div class="flex flex-wrap gap-3 mt-2 justify-center">
            <div v-for="line in trendLines" :key="line.subject" class="flex items-center gap-1">
              <span class="inline-block w-3 h-3 rounded-full" :style="{ background: line.color }"></span>
              <span class="text-xs text-cocoa-600">{{ line.subject }}</span>
            </div>
          </div>
        </div>
        <!-- 趋势数据表 -->
        <div class="bg-surface rounded-2xl p-4 shadow-softer">
          <h3 class="text-sm font-medium text-cocoa-700 mb-3">详细数据</h3>
          <div class="overflow-x-auto">
            <table class="w-full text-sm">
              <thead class="bg-cream-100 text-cocoa-500 text-left">
                <tr>
                  <th class="px-3 py-2 font-medium">考试</th>
                  <th class="px-3 py-2 font-medium">日期</th>
                  <th v-for="s in trendSubjects" :key="s" class="px-3 py-2 font-medium">{{ s }}</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-cream-100">
                <tr v-for="p in trendChartPoints" :key="p.date + p.label" class="hover:bg-cream-50">
                  <td class="px-3 py-2 font-medium text-cocoa-900">{{ p.label }}</td>
                  <td class="px-3 py-2 text-cocoa-500">{{ p.date }}</td>
                  <td v-for="s in trendSubjects" :key="s" class="px-3 py-2 text-cocoa-700">{{ p[s] != null ? p[s].toFixed(1) : '-' }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </template>

    <!-- Tab 3: AI 分析 -->
    <template v-if="activeTab === 'ai'">
      <div class="bg-surface rounded-2xl p-4 shadow-softer">
        <div class="flex items-center justify-between">
          <div class="text-sm text-cocoa-500">选择考试后点击 AI 分析，生成智能分析报告</div>
          <button class="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-butter-500 text-white text-sm font-medium hover:bg-butter-600 disabled:opacity-60" :disabled="aiLoading || !selectedExamId" @click="aiAnalyze">
            <Sparkles class="w-4 h-4" /> {{ aiLoading ? '分析中…' : 'AI 分析' }}
          </button>
        </div>
      </div>
      <div v-if="aiResult || aiLoading" class="bg-surface rounded-2xl p-6 shadow-softer">
        <div class="flex items-center gap-2 mb-3 text-cocoa-700">
          <FileText class="w-4 h-4" />
          <span class="text-sm font-medium">分析报告</span>
          <span v-if="aiLoading" class="text-xs text-butter-500 animate-pulse">AI 生成中…</span>
        </div>
        <div class="text-sm text-cocoa-900 whitespace-pre-wrap leading-relaxed">{{ aiResult }}</div>
      </div>
    </template>
  </div>
</template>

<style scoped>
.stat-card {
  background: white; border-radius: 1rem; padding: 1rem;
  box-shadow: 0 1px 3px rgba(0,0,0,0.06);
  display: flex; flex-direction: column; align-items: flex-start;
}
</style>
