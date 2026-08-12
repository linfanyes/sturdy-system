<script setup lang="ts">
/**
 * 校管只读：成绩查询与汇总分析
 *
 * 四大视图（Tab 切换）：
 * 1. 汇总分析 — 学科汇总卡片 + 雷达图 + 数据导出
 * 2. 考试对比 — 选择考试，各班横向对比（均分/及格率/优秀率）
 * 3. 成绩趋势 — 各次考试均分折线图，可按班级筛选
 * 4. 成绩明细 — 完整成绩记录列表，支持多条件过滤 + 分页 + 导出
 */
import { ref, onMounted, computed, watch } from 'vue'
import { useAuthStore } from '@/stores/auth'
import {
  listSchoolExams, listSchoolGrades, getSchoolGradeSummary,
  getSchoolClassComparison, getSchoolGradeTrend,
} from '@/api/school-admin'
import { listClasses } from '@/api/school-admin'
import { toast } from '@/utils/feedback'
import {
  BookOpen, BarChart3, Loader2, FileText, RefreshCw, TrendingUp,
  Download, Search, Filter, GraduationCap, Award, Users, ClipboardList,
} from 'lucide-vue-next'
import SvgBarChart from '@/components/SvgBarChart.vue'
import SvgLineChart from '@/components/SvgLineChart.vue'
import SvgRadarChart from '@/components/SvgRadarChart.vue'

const auth = useAuthStore()
const activeTab = ref<'summary' | 'compare' | 'trend' | 'detail'>('summary')

const classes = ref<any[]>([])
const loading = ref(false)

const classId = ref('')
const subject = ref('')
const examName = ref('')
const searchKeyword = ref('')

const page = ref(0)
const pageSize = ref(20)
const total = ref(0)

const exams = ref<any[]>([])
const grades = ref<any[]>([])
const summary = ref<{ subjects: any[]; classes: any[]; totalGrades: number }>({ subjects: [], classes: [], totalGrades: 0 })

const subjectOptions = computed(() => {
  const set = new Set<string>()
  grades.value.forEach((g) => g.subject && set.add(g.subject))
  summary.value.subjects.forEach((s) => s.subject && set.add(s.subject))
  return [...set]
})

const examOptions = computed(() => {
  const set = new Set<string>()
  exams.value.forEach((e) => e.name && set.add(e.name))
  return [...set]
})

async function loadAll() {
  loading.value = true
  try {
    const params = classId.value ? { classId: classId.value } : {}
    const skip = page.value * pageSize.value
    const [examRes, gradeRes, sumRes] = await Promise.all([
      listSchoolExams(params),
      listSchoolGrades({
        ...params,
        subject: subject.value || undefined,
        examName: examName.value || undefined,
        skip,
        take: pageSize.value,
      }),
      getSchoolGradeSummary({ classId: classId.value || undefined }),
    ])
    exams.value = Array.isArray(examRes) ? examRes : (examRes?.items || [])
    grades.value = Array.isArray(gradeRes) ? gradeRes : (gradeRes?.items || [])
    total.value = gradeRes?.total || grades.value.length
    summary.value = (sumRes?.subjects || sumRes)?.subjects ? sumRes : { subjects: [], classes: [], totalGrades: 0 } as any
  } catch (e: any) {
    toast.error(e?.message || '加载失败')
  } finally {
    loading.value = false
  }
}

async function loadSchoolClasses() {
  try {
    const res = await listClasses(0, 500)
    classes.value = res.items || []
  } catch {
    classes.value = []
  }
}

onMounted(async () => {
  await loadSchoolClasses()
  await loadAll()
})

watch([classId, subject, examName], () => {
  page.value = 0
  loadAll()
})

const totalPages = computed(() => Math.max(1, Math.ceil(total.value / pageSize.value)))
function goPage(p: number) {
  page.value = Math.min(Math.max(0, p), totalPages.value - 1)
  loadAll()
}

function className(id: string) {
  return classes.value.find((c) => c.id === id)?.name || id
}

function scoreSummary(g: any): string {
  if (!g.scores?.length) return '暂无'
  const valid = g.scores.filter((s: any) => s.score != null).map((s: any) => Number(s.score))
  if (!valid.length) return '暂无'
  const avg = (valid.reduce((a: number, b: number) => a + b, 0) / valid.length).toFixed(1)
  const passCount = valid.filter((v: number) => v >= 60).length
  return `${valid.length}人 · 均${avg} · 及格${passCount} · 最高${Math.max(...valid)} · 最低${Math.min(...valid)}`
}

function downloadCSV() {
  if (!grades.value.length) {
    toast.warning('暂无数据可导出')
    return
  }
  const header = ['考试', '班级', '科目', '日期', '参考人数', '平均分', '最高分', '最低分', '及格率', '优秀率']
  const rows: string[][] = [header]
  for (const g of grades.value) {
    const valid = (g.scores || []).filter((s: any) => s.score != null).map((s: any) => Number(s.score))
    if (!valid.length) {
      rows.push([g.examName || '', className(g.classId), g.subject, g.date || '0', '0', '-', '-', '-', '-', '-'])
      continue
    }
    const avg = (valid.reduce((a: number, b: number) => a + b, 0) / valid.length).toFixed(1)
    const passCount = valid.filter((v: number) => v >= 60).length
    const excellentCount = valid.filter((v: number) => v >= 85).length
    rows.push([
      g.examName || '',
      className(g.classId),
      g.subject,
      g.date || '',
      String(valid.length),
      avg,
      String(Math.max(...valid)),
      String(Math.min(...valid)),
      `${((passCount / valid.length) * 100).toFixed(1)}%`,
      `${((excellentCount / valid.length) * 100).toFixed(1)}%`,
    ])
  }
  const csv = '\ufeff' + rows.map((r) => r.join(',')).join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `成绩明细_${classId.value ? className(classId.value) : '全校'}_${new Date().toISOString().slice(0, 10)}.csv`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
  toast.success('导出成功')
}

// ---- 对比视图数据 ----
const selectedCompareExam = ref('')
const compareData = computed(() => {
  if (!selectedCompareExam.value) return { avg: [], passRate: [], excellentRate: [] }
  const examGrades = grades.value.filter(
    (g) => g.examName === selectedCompareExam.value || g.examId === selectedCompareExam.value,
  )
  const classMap = new Map<string, Map<string, { total: number; count: number }>>()
  for (const g of examGrades) {
    const cn = className(g.classId)
    if (!classMap.has(cn)) classMap.set(cn, new Map())
    const subjMap = classMap.get(cn)!
    const scores = (g.scores || []).filter((s: any) => s.score != null).map((s: any) => Number(s.score))
    if (!scores.length) continue
    const existing = subjMap.get(g.subject) || { total: 0, count: 0 }
    existing.total += scores.reduce((a: number, s: number) => a + s, 0)
    existing.count += scores.length
    subjMap.set(g.subject, existing)
  }
  const labels: string[] = []
  const avgData: number[] = []
  const passData: number[] = []
  const excellentData: number[] = []
  for (const [cn, subjMap] of classMap) {
    for (const [subj, v] of subjMap) {
      const avg = Math.round((v.total / v.count) * 10) / 10
      const passCount = examGrades
        .filter((g) => className(g.classId) === cn && g.subject === subj)
        .reduce((acc, g) => acc + (g.scores || []).filter((s: any) => s.score != null && Number(s.score) >= 60).length, 0)
      const excellentCount = examGrades
        .filter((g) => className(g.classId) === cn && g.subject === subj)
        .reduce((acc, g) => acc + (g.scores || []).filter((s: any) => s.score != null && Number(s.score) >= 85).length, 0)
      const totalCount = examGrades
        .filter((g) => className(g.classId) === cn && g.subject === subj)
        .reduce((acc, g) => acc + (g.scores || []).filter((s: any) => s.score != null).length, 0)
      labels.push(`${cn}·${subj}`)
      avgData.push(avg)
      passData.push(totalCount ? Math.round((passCount / totalCount) * 1000) / 10 : 0)
      excellentData.push(totalCount ? Math.round((excellentCount / totalCount) * 1000) / 10 : 0)
    }
  }
  return { avg: labels.map((l, i) => ({ label: l, value: avgData[i] })), passRate: labels.map((l, i) => ({ label: l, value: passData[i] })), excellentRate: labels.map((l, i) => ({ label: l, value: excellentData[i] })) }
})

// ---- 趋势视图数据 ----
const trendSubject = ref('')
const trendData = computed(() => {
  const map = new Map<string, { label: string; total: number; count: number }>()
  const filtered = trendSubject.value
    ? grades.value.filter((g) => g.subject === trendSubject.value)
    : grades.value
  filtered.forEach((g) => {
    const key = g.examName || g.id
    const cur = map.get(key) || {
      label: g.date?.slice(0, 7) || g.examName || key,
      total: 0,
      count: 0,
    }
    const scores = (g.scores || []).filter((s: any) => s.score != null)
    if (scores.length) {
      cur.total += scores.reduce((a: number, s: any) => a + Number(s.score), 0) / scores.length
      cur.count++
    }
    map.set(key, cur)
  })
  return [...map.values()]
    .sort((a, b) => a.label.localeCompare(b.label))
    .map((v) => ({ label: v.label.slice(0, 7), value: Math.round((v.total / Math.max(1, v.count)) * 10) / 10 }))
})

// ---- 雷达图数据 ----
const radarData = computed(() => {
  if (!summary.value?.subjects?.length) return []
  return summary.value.subjects.map((s: any) => ({
    label: s.subject,
    value: s.avg || 0,
  }))
})
</script>

<template>
  <div class="space-y-4">
    <!-- 顶栏 -->
    <div class="flex items-center justify-between gap-4 flex-wrap">
      <h1 class="text-2xl font-bold text-cocoa-900 flex items-center gap-2">
        <BarChart3 class="w-6 h-6 text-butter-500" /> 成绩查询与汇总分析
      </h1>
      <div class="flex items-center gap-2 flex-wrap">
        <select
          v-model="classId"
          class="px-3 py-2 rounded-xl border border-cream-200 bg-surface text-sm focus:outline-none focus:border-butter-400"
          @change="loadAll"
        >
          <option value="">全部班级</option>
          <option v-for="c in classes" :key="c.id" :value="c.id">{{ c.name }}</option>
        </select>
        <button
          class="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-butter-500 text-white text-sm font-medium hover:bg-butter-600 disabled:opacity-60"
          :disabled="loading"
          @click="loadAll"
        >
          <RefreshCw class="w-4 h-4" :class="{ 'animate-spin': loading }" /> 刷新
        </button>
        <button
          v-if="activeTab === 'detail'"
          class="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-mint-500 text-white text-sm font-medium hover:bg-mint-600"
          @click="downloadCSV"
        >
          <Download class="w-4 h-4" /> 导出 CSV
        </button>
      </div>
    </div>

    <!-- Tab 导航 -->
    <div class="flex items-center gap-1 bg-surface rounded-xl p-1 shadow-softer">
      <button
        v-for="tab in [
          { key: 'summary', label: '汇总分析', icon: BookOpen },
          { key: 'compare', label: '考试对比', icon: BarChart3 },
          { key: 'trend', label: '成绩趋势', icon: TrendingUp },
          { key: 'detail', label: '成绩明细', icon: ClipboardList },
        ]"
        :key="tab.key"
        class="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition"
        :class="activeTab === tab.key ? 'bg-butter-500 text-white shadow-sm' : 'text-cocoa-500 hover:bg-cream-50'"
        @click="activeTab = tab.key as any"
      >
        <component :is="tab.icon" class="w-4 h-4" />
        {{ tab.label }}
      </button>
    </div>

    <!-- ============ Tab 1: 汇总分析 ============ -->
    <section v-if="activeTab === 'summary'" class="space-y-4">
      <!-- 统计概览卡片 -->
      <div class="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div class="bg-surface rounded-2xl p-4 shadow-softer">
          <div class="flex items-center gap-2 text-cocoa-400 text-xs mb-1">
            <GraduationCap class="w-3.5 h-3.5" /> 成绩记录
          </div>
          <div class="text-2xl font-bold text-cocoa-900">{{ summary.totalGrades }}</div>
        </div>
        <div class="bg-surface rounded-2xl p-4 shadow-softer">
          <div class="flex items-center gap-2 text-cocoa-400 text-xs mb-1">
            <Award class="w-3.5 h-3.5" /> 学科数
          </div>
          <div class="text-2xl font-bold text-cocoa-900">{{ summary.subjects?.length || 0 }}</div>
        </div>
        <div class="bg-surface rounded-2xl p-4 shadow-softer">
          <div class="flex items-center gap-2 text-cocoa-400 text-xs mb-1">
            <Users class="w-3.5 h-3.5" /> 班级数
          </div>
          <div class="text-2xl font-bold text-cocoa-900">{{ classes.length }}</div>
        </div>
        <div class="bg-surface rounded-2xl p-4 shadow-softer">
          <div class="flex items-center gap-2 text-cocoa-400 text-xs mb-1">
            <FileText class="w-3.5 h-3.5" /> 考试数
          </div>
          <div class="text-2xl font-bold text-cocoa-900">{{ exams.length }}</div>
        </div>
      </div>

      <!-- 学科汇总卡片 + 雷达图 -->
      <div class="grid lg:grid-cols-3 gap-4">
        <!-- 学科汇总卡片 -->
        <div class="lg:col-span-2 bg-surface rounded-2xl p-6 shadow-softer">
          <div class="flex items-center gap-2 mb-4">
            <BookOpen class="w-5 h-5 text-butter-500" />
            <h2 class="text-lg font-semibold text-cocoa-900">各学科汇总</h2>
          </div>
          <div v-if="loading" class="text-center text-cocoa-400 py-8 flex items-center justify-center gap-2">
            <Loader2 class="w-5 h-5 animate-spin" /> 加载中…
          </div>
          <div v-else-if="!summary.subjects.length" class="text-center text-cocoa-400 py-8">暂无成绩数据</div>
          <div v-else class="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
            <div
              v-for="s in summary.subjects"
              :key="s.subject"
              class="rounded-xl bg-cream-50 p-4 border border-cream-100"
            >
              <div class="flex items-center justify-between mb-2">
                <span class="text-sm font-semibold text-cocoa-900">{{ s.subject }}</span>
                <span class="text-xs text-cocoa-400">{{ s.count }} 样本</span>
              </div>
              <div class="grid grid-cols-2 gap-x-2 gap-y-1 text-xs">
                <div class="flex justify-between"><span class="text-cocoa-500">平均分</span><span class="text-butter-600 font-medium">{{ s.avg }}</span></div>
                <div class="flex justify-between"><span class="text-cocoa-500">及格率</span><span class="text-mint-500 font-medium">{{ s.passRate }}%</span></div>
                <div class="flex justify-between"><span class="text-cocoa-500">优秀率</span><span class="text-cocoa-700 font-medium">{{ s.excellentRate }}%</span></div>
                <div class="flex justify-between"><span class="text-cocoa-500">最高/最低</span><span class="text-cocoa-700 font-medium">{{ s.max }}/{{ s.min }}</span></div>
              </div>
            </div>
          </div>
        </div>

        <!-- 雷达图 -->
        <div class="bg-surface rounded-2xl p-6 shadow-softer">
          <div class="flex items-center gap-2 mb-4">
            <BarChart3 class="w-5 h-5 text-butter-500" />
            <h2 class="text-lg font-semibold text-cocoa-900">学科雷达</h2>
          </div>
          <div v-if="loading" class="text-center text-cocoa-400 py-8">加载中…</div>
          <SvgRadarChart
            v-else-if="radarData.length >= 3"
            :data="radarData"
            :height="260"
            title="学科均分雷达"
            :maxScore="100"
          />
          <div v-else class="text-center text-cocoa-400 py-8 text-sm">
            需要至少 3 个学科的数据才能生成雷达图
          </div>
        </div>
      </div>

      <!-- 各科均分柱状图 -->
      <section>
        <SvgBarChart
          v-if="summary.subjects.length"
          :data="summary.subjects.map((s: any) => ({ label: s.subject, value: s.avg || 0 }))"
          :height="220"
          title="各学科平均分对比"
          color="#f5b342"
        />
        <div v-else class="bg-surface rounded-2xl p-6 shadow-softer text-center text-cocoa-400 py-8">暂无数据</div>
      </section>
    </section>

    <!-- ============ Tab 2: 考试对比 ============ -->
    <section v-if="activeTab === 'compare'" class="space-y-4">
      <div class="bg-surface rounded-2xl p-6 shadow-softer">
        <div class="flex items-center gap-2 mb-4 flex-wrap">
          <BarChart3 class="w-5 h-5 text-butter-500" />
          <h2 class="text-lg font-semibold text-cocoa-900">各班横向对比</h2>
          <div class="ml-auto flex items-center gap-2 flex-wrap">
            <select v-model="selectedCompareExam" class="px-3 py-1.5 rounded-xl border border-cream-200 bg-surface text-sm">
              <option value="">选择考试</option>
              <option v-for="e in [...new Set(exams.map((x) => x.name))]" :key="e" :value="e">{{ e }}</option>
            </select>
            <select v-model="subject" class="px-3 py-1.5 rounded-xl border border-cream-200 bg-surface text-sm" @change="page=0; loadAll()">
              <option value="">全部科目</option>
              <option v-for="s in subjectOptions" :key="s" :value="s">{{ s }}</option>
            </select>
          </div>
        </div>
        <div v-if="!selectedCompareExam" class="text-center text-cocoa-400 py-12">
          <BarChart3 class="w-12 h-12 mx-auto mb-3 text-cocoa-300" />
          请选择一场考试查看各班对比数据
        </div>
        <template v-else>
          <SvgBarChart
            v-if="compareData.avg.length"
            :data="compareData.avg"
            :height="240"
            title="各班·各学科 平均分"
            color="#f5b342"
          />
          <div v-else class="text-center text-cocoa-400 py-8">暂无对比数据</div>

          <div v-if="compareData.passRate.length" class="mt-6 grid md:grid-cols-2 gap-4">
            <SvgBarChart :data="compareData.passRate" :height="180" title="及格率 (%)" color="#67c23a" />
            <SvgBarChart :data="compareData.excellentRate" :height="180" title="优秀率 (%)" color="#f56c6c" />
          </div>
        </template>
      </div>
    </section>

    <!-- ============ Tab 3: 成绩趋势 ============ -->
    <section v-if="activeTab === 'trend'" class="space-y-4">
      <div class="bg-surface rounded-2xl p-4 shadow-softer flex items-center gap-2 flex-wrap">
        <TrendingUp class="w-5 h-5 text-mint-500" />
        <h2 class="text-lg font-semibold text-cocoa-900">成绩趋势</h2>
        <select v-model="trendSubject" class="ml-auto px-3 py-1.5 rounded-xl border border-cream-200 bg-surface text-sm">
          <option value="">全部科目</option>
          <option v-for="s in subjectOptions" :key="s" :value="s">{{ s }}</option>
        </select>
      </div>
      <SvgLineChart
        v-if="trendData.length"
        :data="trendData"
        :height="260"
        :title="trendSubject || '全校均分趋势'"
        series1Name="均分"
        color="#67c23a"
      />
      <div v-else class="bg-surface rounded-2xl p-12 text-center text-cocoa-400 shadow-softer">
        <TrendingUp class="w-12 h-12 mx-auto mb-3 text-cocoa-300" />
        暂无趋势数据
      </div>
    </section>

    <!-- ============ Tab 4: 成绩明细 ============ -->
    <section v-if="activeTab === 'detail'" class="space-y-4">
      <!-- 过滤器 -->
      <div class="bg-surface rounded-2xl p-4 shadow-softer">
        <div class="flex items-center gap-3 flex-wrap">
          <div class="flex items-center gap-1.5 text-sm text-cocoa-500">
            <Filter class="w-4 h-4" /> 筛选：
          </div>
          <select v-model="subject" class="px-3 py-2 rounded-xl border border-cream-200 bg-surface text-sm" @change="page=0; loadAll()">
            <option value="">全部科目</option>
            <option v-for="s in subjectOptions" :key="s" :value="s">{{ s }}</option>
          </select>
          <select v-model="examName" class="px-3 py-2 rounded-xl border border-cream-200 bg-surface text-sm" @change="page=0; loadAll()">
            <option value="">全部考试</option>
            <option v-for="e in examOptions" :key="e" :value="e">{{ e }}</option>
          </select>
          <div class="relative flex-1 min-w-[200px]">
            <Search class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-cocoa-400" />
            <input
              v-model="searchKeyword"
              type="text"
              placeholder="搜索班级或考试名..."
              class="w-full pl-9 pr-3 py-2 rounded-xl border border-cream-200 bg-surface text-sm focus:outline-none focus:border-butter-400"
            />
          </div>
          <div class="text-xs text-cocoa-400 ml-auto">共 {{ total }} 条记录</div>
        </div>
      </div>

      <!-- 成绩表格 -->
      <div class="bg-surface rounded-2xl shadow-softer overflow-hidden">
        <div v-if="loading" class="text-center text-cocoa-400 py-12 flex items-center justify-center gap-2">
          <Loader2 class="w-5 h-5 animate-spin" /> 加载中…
        </div>
        <div v-else-if="!grades.length" class="text-center text-cocoa-400 py-12">
          <ClipboardList class="w-12 h-12 mx-auto mb-3 text-cocoa-300" />
          暂无成绩记录
        </div>
        <div v-else class="overflow-x-auto">
          <table class="w-full text-sm">
            <thead class="bg-cream-100 text-cocoa-500 text-left">
              <tr>
                <th class="px-4 py-3 font-medium">考试</th>
                <th class="px-4 py-3 font-medium">班级</th>
                <th class="px-4 py-3 font-medium">科目</th>
                <th class="px-4 py-3 font-medium">日期</th>
                <th class="px-4 py-3 font-medium">参考人数</th>
                <th class="px-4 py-3 font-medium">平均分</th>
                <th class="px-4 py-3 font-medium">最高分</th>
                <th class="px-4 py-3 font-medium">最低分</th>
                <th class="px-4 py-3 font-medium">及格率</th>
                <th class="px-4 py-3 font-medium">优秀率</th>
                <th class="px-4 py-3 font-medium">详情</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-cream-100">
              <tr
                v-for="g in grades.filter(g => !searchKeyword || g.examName?.includes(searchKeyword) || className(g.classId).includes(searchKeyword))"
                :key="g.id"
                class="hover:bg-cream-50 transition-colors"
              >
                <td class="px-4 py-3 font-medium text-cocoa-900">{{ g.examName }}</td>
                <td class="px-4 py-3 text-cocoa-700">{{ className(g.classId) }}</td>
                <td class="px-4 py-3">
                  <span class="px-2 py-0.5 rounded-md bg-cream-100 text-cocoa-600 text-xs">{{ g.subject }}</span>
                </td>
                <td class="px-4 py-3 text-cocoa-700">{{ g.date || '-' }}</td>
                <td class="px-4 py-3 text-cocoa-700">{{ (g.scores || []).filter((s: any) => s.score != null).length }}</td>
                <td class="px-4 py-3 text-butter-600 font-semibold">
                  {{ (g.scores || []).filter((s: any) => s.score != null).length ? ((g.scores || []).filter((s: any) => s.score != null).reduce((a: number, s: any) => a + Number(s.score), 0) / (g.scores || []).filter((s: any) => s.score != null).length).toFixed(1) : '-' }}
                </td>
                <td class="px-4 py-3 text-mint-500">{{ (g.scores || []).filter((s: any) => s.score != null).length ? Math.max(...(g.scores || []).filter((s: any) => s.score != null).map((s: any) => Number(s.score))) : '-' }}</td>
                <td class="px-4 py-3 text-red-500">{{ (g.scores || []).filter((s: any) => s.score != null).length ? Math.min(...(g.scores || []).filter((s: any) => s.score != null).map((s: any) => Number(s.score))) : '-' }}</td>
                <td class="px-4 py-3 text-cocoa-700">
                  {{ (g.scores || []).filter((s: any) => s.score != null).length ? (((g.scores || []).filter((s: any) => s.score != null).filter((s: any) => Number(s.score) >= 60).length / (g.scores || []).filter((s: any) => s.score != null).length) * 100).toFixed(1) : '0' }}%
                </td>
                <td class="px-4 py-3 text-cocoa-700">
                  {{ (g.scores || []).filter((s: any) => s.score != null).length ? (((g.scores || []).filter((s: any) => s.score != null).filter((s: any) => Number(s.score) >= 85).length / (g.scores || []).filter((s: any) => s.score != null).length) * 100).toFixed(1) : '0' }}%
                </td>
                <td class="px-4 py-3">
                  <details class="cursor-pointer">
                    <summary class="text-xs text-butter-500 hover:text-butter-600">查看</summary>
                    <div class="mt-2 p-3 bg-cream-50 rounded-lg text-xs text-cocoa-600 space-y-0.5">
                      <div v-for="(s, idx) in (g.scores || []).slice(0, 10)" :key="idx" class="flex justify-between">
                        <span>{{ s.studentName || s.studentId }}</span>
                        <span class="font-medium">{{ s.score != null ? s.score : '缺考' }}</span>
                      </div>
                      <div v-if="(g.scores || []).length > 10" class="text-cocoa-400 mt-1">
                        还有 {{ (g.scores || []).length - 10 }} 条记录…
                      </div>
                    </div>
                  </details>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- 分页 -->
      <div v-if="total > 0" class="flex items-center justify-between gap-3 px-4 py-3 bg-surface rounded-xl shadow-softer">
        <span class="text-xs text-cocoa-400">共 {{ total }} 条记录，第 {{ page + 1 }} / {{ totalPages }} 页</span>
        <div class="flex items-center gap-2">
          <button
            class="px-3 py-1.5 rounded-xl border border-cream-200 text-sm disabled:opacity-40 hover:bg-cream-50"
            :disabled="page === 0"
            @click="goPage(page - 1)"
          >上一页</button>
          <button
            class="px-3 py-1.5 rounded-xl border border-cream-200 text-sm disabled:opacity-40 hover:bg-cream-50"
            :disabled="page + 1 >= totalPages"
            @click="goPage(page + 1)"
          >下一页</button>
        </div>
      </div>
    </section>
  </div>
</template>
