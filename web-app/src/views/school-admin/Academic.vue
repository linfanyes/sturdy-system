<script setup lang="ts">
/**
 * 校管只读：年级对比 & 班级学期趋势
 *
 * 两个视图（Tab 切换）：
 * 1. 年级对比 — 选择学校内某一年级，横向对比各班的学科均分/综合均分
 * 2. 班级趋势 — 选择某班级，查看本学期历次考试的成绩汇总与趋势
 */
import { ref, onMounted, computed, watch } from 'vue'
import { useAuthStore } from '@/stores/auth'
import {
  listSchoolExams, listSchoolGrades, getSchoolGradeSummary,
  listClasses, getGradeClassComparison, getClassTermTrend,
} from '@/api/school-admin'
import { toast } from '@/utils/feedback'
import {
  BarChart3, TrendingUp, Loader2, RefreshCw, GraduationCap,
  Award, Users, ClipboardList, Layers,
} from 'lucide-vue-next'
import SvgBarChart from '@/components/SvgBarChart.vue'
import SvgLineChart from '@/components/SvgLineChart.vue'

const auth = useAuthStore()
const activeTab = ref<'compare' | 'trend'>('compare')
const loading = ref(false)

// ============ 通用数据 ============
const classes = ref<any[]>([])

// ============ Tab1: 年级对比 ============
const selectedGrade = ref('')
const selectedSubject = ref('')
const selectedExamName = ref('')
const gradeComparison = ref<{ grade: string; classes: any[] }>({ grade: '', classes: [] })

const gradeOptions = computed(() => {
  const set = new Set<string>()
  classes.value.forEach((c) => c.grade && set.add(c.grade))
  return [...set].sort()
})

const gradeCompareRows = computed(() => gradeComparison.value.classes || [])
const gradeCompareBarData = computed(() =>
  gradeCompareRows.value.map((c: any) => ({
    label: c.className,
    value: c.overallAvg || 0,
  })),
)
const gradeSubjectBarData = computed(() => {
  if (!selectedSubject.value) {
    // 堆叠展示前 3 个学科的均分
    const avg: Record<string, number[]> = {}
    gradeCompareRows.value.forEach((c: any) => {
      for (const s of c.subjects || []) {
        if (!avg[s.subject]) avg[s.subject] = []
        avg[s.subject].push(s.avg)
      }
    })
    const subjects = Object.keys(avg).slice(0, 6)
    return subjects.map((sub) => ({
      label: sub,
      value: Math.round((avg[sub].reduce((a, b) => a + b, 0) / Math.max(1, avg[sub].length)) * 10) / 10,
    }))
  }
  return gradeCompareRows.value.map((c: any) => {
    const s = (c.subjects || []).find((x: any) => x.subject === selectedSubject.value)
    return { label: c.className, value: s?.avg || 0 }
  })
})

// ============ Tab2: 班级趋势 ============
const selectedClassId = ref('')
const selectedSubjectTrend = ref('')
const classTrend = ref<any>(null)

const trendClassOptions = computed(() => classes.value.map(c => ({ id: c.id, name: c.name, grade: c.grade })))
const trendLineData = computed(() => {
  if (!classTrend.value?.trend) return []
  return classTrend.value.trend.map((t: any) => ({
    label: t.examName,
    value: t.avg,
  }))
})
const trendExams = computed(() => {
  if (!classTrend.value?.exams) return []
  const filtered = selectedSubjectTrend.value
    ? classTrend.value.exams.filter((e: any) => e.subject === selectedSubjectTrend.value)
    : classTrend.value.exams
  return filtered
})
const trendSubjects = computed(() => classTrend.value?.subjects || [])

async function loadAll() {
  loading.value = true
  try {
    if (activeTab.value === 'compare') {
      const params: any = {}
      if (selectedGrade.value) params.grade = selectedGrade.value
      if (selectedSubject.value) params.subject = selectedSubject.value
      if (selectedExamName.value) params.examName = selectedExamName.value
      gradeComparison.value = await getGradeClassComparison(params)
    } else {
      if (!selectedClassId.value) {
        classTrend.value = null
        return
      }
      const params: any = { classId: selectedClassId.value }
      if (selectedSubjectTrend.value) params.subject = selectedSubjectTrend.value
      classTrend.value = await getClassTermTrend(params)
    }
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
    // 默认选中第一个班级
    if (!selectedClassId.value && classes.value.length) {
      selectedClassId.value = classes.value[0].id
    }
    // 默认选中第一个年级
    if (!selectedGrade.value && gradeOptions.value.length) {
      selectedGrade.value = gradeOptions.value[0]
    }
  } catch {
    classes.value = []
  }
}

onMounted(async () => {
  await loadSchoolClasses()
  await loadAll()
})

watch([activeTab, selectedGrade, selectedSubject, selectedExamName], () => {
  loadAll()
})
watch([selectedClassId, selectedSubjectTrend], () => {
  if (activeTab.value === 'trend' && selectedClassId.value) loadAll()
})
</script>

<template>
  <div class="space-y-4">
    <!-- 顶栏 -->
    <div class="flex items-center justify-between gap-4 flex-wrap">
      <h1 class="text-2xl font-bold text-cocoa-900 flex items-center gap-2">
        <BarChart3 class="w-6 h-6 text-butter-500" /> 成绩查询
      </h1>
      <button
        class="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-butter-500 text-white text-sm font-medium hover:bg-butter-600 disabled:opacity-60"
        :disabled="loading"
        @click="loadAll"
      >
        <RefreshCw class="w-4 h-4" :class="{ 'animate-spin': loading }" /> 刷新
      </button>
    </div>

    <!-- Tab 导航 -->
    <div class="flex items-center gap-1 bg-surface rounded-xl p-1 shadow-softer">
      <button
        v-for="tab in [
          { key: 'compare', label: '年级对比', icon: Layers },
          { key: 'trend', label: '班级趋势', icon: TrendingUp },
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

    <!-- ============ Tab 1: 年级对比 ============ -->
    <section v-if="activeTab === 'compare'" class="space-y-4">
      <!-- 过滤器 -->
      <div class="bg-surface rounded-2xl p-4 shadow-softer flex items-center gap-3 flex-wrap">
        <GraduationCap class="w-5 h-5 text-butter-500" />
        <span class="text-sm text-cocoa-600 font-medium">选择年级：</span>
        <select v-model="selectedGrade" class="px-3 py-1.5 rounded-xl border border-cream-200 bg-surface text-sm min-w-[120px]">
          <option value="">全部年级</option>
          <option v-for="g in gradeOptions" :key="g" :value="g">{{ g }}</option>
        </select>

        <span class="text-sm text-cocoa-600 font-medium ml-2">学科：</span>
        <select v-model="selectedSubject" class="px-3 py-1.5 rounded-xl border border-cream-200 bg-surface text-sm min-w-[120px]">
          <option value="">全部学科</option>
          <option v-for="s in ['语文','数学','英语','科学','道法','体育']" :key="s" :value="s">{{ s }}</option>
        </select>

        <span class="text-sm text-cocoa-600 font-medium ml-2">考试：</span>
        <select v-model="selectedExamName" class="px-3 py-1.5 rounded-xl border border-cream-200 bg-surface text-sm min-w-[140px]">
          <option value="">全部考试</option>
          <option v-for="e in ['第一次月考','期中考试','第二次月考','期末考试','第一单元测验','第二单元测验','模拟测试','课堂小测','期中联考','期末统考']" :key="e" :value="e">{{ e }}</option>
        </select>

        <div class="text-xs text-cocoa-400 ml-auto">共 {{ gradeCompareRows.length }} 个班级</div>
      </div>

      <!-- 图表 -->
      <div class="grid lg:grid-cols-2 gap-4">
        <div class="bg-surface rounded-2xl p-6 shadow-softer">
          <SvgBarChart
            v-if="gradeCompareBarData.length"
            :data="gradeCompareBarData"
            :height="240"
            title="各班综合均分"
            color="#f5b342"
          />
          <div v-else class="text-center text-cocoa-400 py-12">
            <BarChart3 class="w-12 h-12 mx-auto mb-3 text-cocoa-300" />
            暂无数据，请选择年级
          </div>
        </div>
        <div class="bg-surface rounded-2xl p-6 shadow-softer">
          <SvgBarChart
            v-if="gradeSubjectBarData.length"
            :data="gradeSubjectBarData"
            :height="240"
            :title="selectedSubject ? `${selectedSubject} 学科均分对比` : '各学科均分'"
            color="#67c23a"
          />
          <div v-else class="text-center text-cocoa-400 py-12">暂无学科数据</div>
        </div>
      </div>

      <!-- 班级详情表 -->
      <div class="bg-surface rounded-2xl shadow-softer overflow-hidden">
        <div v-if="loading" class="text-center text-cocoa-400 py-12 flex items-center justify-center gap-2">
          <Loader2 class="w-5 h-5 animate-spin" /> 加载中…
        </div>
        <div v-else-if="!gradeCompareRows.length" class="text-center text-cocoa-400 py-12">
          暂无班级数据
        </div>
        <div v-else class="overflow-x-auto">
          <table class="w-full text-sm">
            <thead class="bg-cream-100 text-cocoa-500 text-left">
              <tr>
                <th class="px-4 py-3 font-medium">班级</th>
                <th class="px-4 py-3 font-medium">年级</th>
                <th class="px-4 py-3 font-medium">综合均分</th>
                <th v-for="s in (gradeCompareRows[0]?.subjects || []).slice(0, 6)" :key="s.subject" class="px-4 py-3 font-medium">
                  {{ s.subject }} 均分
                </th>
              </tr>
            </thead>
            <tbody class="divide-y divide-cream-100">
              <tr v-for="c in gradeCompareRows" :key="c.classId" class="hover:bg-cream-50">
                <td class="px-4 py-3 font-medium text-cocoa-900">{{ c.className }}</td>
                <td class="px-4 py-3 text-cocoa-700">{{ c.grade }}</td>
                <td class="px-4 py-3 text-butter-600 font-semibold">{{ c.overallAvg }}</td>
                <td v-for="s in (c.subjects || []).slice(0, 6)" :key="s.subject" class="px-4 py-3 text-cocoa-700">
                  {{ s.avg }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </section>

    <!-- ============ Tab 2: 班级趋势 ============ -->
    <section v-if="activeTab === 'trend'" class="space-y-4">
      <div class="bg-surface rounded-2xl p-4 shadow-softer flex items-center gap-3 flex-wrap">
        <TrendingUp class="w-5 h-5 text-mint-500" />
        <span class="text-sm text-cocoa-600 font-medium">选择班级：</span>
        <select v-model="selectedClassId" class="px-3 py-1.5 rounded-xl border border-cream-200 bg-surface text-sm min-w-[180px]">
          <option value="">请选择班级</option>
          <option v-for="c in trendClassOptions" :key="c.id" :value="c.id">{{ c.name }}（{{ c.grade }}）</option>
        </select>

        <template v-if="selectedClassId && trendSubjects.length">
          <span class="text-sm text-cocoa-600 font-medium ml-2">学科：</span>
          <select v-model="selectedSubjectTrend" class="px-3 py-1.5 rounded-xl border border-cream-200 bg-surface text-sm min-w-[120px]">
            <option value="">全部学科</option>
            <option v-for="s in trendSubjects" :key="s" :value="s">{{ s }}</option>
          </select>
        </template>
      </div>

      <template v-if="selectedClassId && classTrend">
        <!-- 班级概览 -->
        <div class="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div class="bg-surface rounded-2xl p-4 shadow-softer">
            <div class="flex items-center gap-2 text-cocoa-400 text-xs mb-1">
              <Users class="w-3.5 h-3.5" /> 班级
            </div>
            <div class="text-lg font-bold text-cocoa-900">{{ classTrend.className }}</div>
            <div class="text-xs text-cocoa-400 mt-1">{{ classTrend.grade }} · {{ classTrend.term || '本学期' }}</div>
          </div>
          <div class="bg-surface rounded-2xl p-4 shadow-softer">
            <div class="flex items-center gap-2 text-cocoa-400 text-xs mb-1">
              <Award class="w-3.5 h-3.5" /> 学科数
            </div>
            <div class="text-2xl font-bold text-cocoa-900">{{ classTrend.subjects?.length || 0 }}</div>
          </div>
          <div class="bg-surface rounded-2xl p-4 shadow-softer">
            <div class="flex items-center gap-2 text-cocoa-400 text-xs mb-1">
              <ClipboardList class="w-3.5 h-3.5" /> 考试数
            </div>
            <div class="text-2xl font-bold text-cocoa-900">{{ classTrend.exams?.length || 0 }}</div>
          </div>
          <div class="bg-surface rounded-2xl p-4 shadow-softer">
            <div class="flex items-center gap-2 text-cocoa-400 text-xs mb-1">
              <GraduationCap class="w-3.5 h-3.5" /> 最近均分
            </div>
            <div class="text-2xl font-bold text-butter-600">
              {{ trendLineData.length ? trendLineData[trendLineData.length - 1].value : '-' }}
            </div>
          </div>
        </div>

        <!-- 趋势折线图 -->
        <div class="bg-surface rounded-2xl p-6 shadow-softer">
          <SvgLineChart
            v-if="trendLineData.length"
            :data="trendLineData"
            :height="260"
            :title="`${classTrend.className} · ${selectedSubjectTrend || '全学科'}均分趋势`"
            series1Name="均分"
            color="#67c23a"
          />
          <div v-else class="text-center text-cocoa-400 py-12">暂无趋势数据</div>
        </div>

        <!-- 考试成绩表 -->
        <div class="bg-surface rounded-2xl shadow-softer overflow-hidden">
          <div class="px-4 py-3 border-b border-cream-100 flex items-center gap-2">
            <ClipboardList class="w-4 h-4 text-butter-500" />
            <h3 class="text-base font-semibold text-cocoa-900">考试明细</h3>
            <span class="text-xs text-cocoa-400 ml-auto">共 {{ trendExams.length }} 条记录</span>
          </div>
          <div v-if="!trendExams.length" class="text-center text-cocoa-400 py-8">暂无考试数据</div>
          <table v-else class="w-full text-sm">
            <thead class="bg-cream-100 text-cocoa-500 text-left">
              <tr>
                <th class="px-4 py-3 font-medium">考试</th>
                <th class="px-4 py-3 font-medium">学科</th>
                <th class="px-4 py-3 font-medium">日期</th>
                <th class="px-4 py-3 font-medium">均分</th>
                <th class="px-4 py-3 font-medium">参考数</th>
                <th class="px-4 py-3 font-medium">及格率</th>
                <th class="px-4 py-3 font-medium">优秀率</th>
                <th class="px-4 py-3 font-medium">最高</th>
                <th class="px-4 py-3 font-medium">最低</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-cream-100">
              <tr v-for="(e, i) in trendExams" :key="i" class="hover:bg-cream-50">
                <td class="px-4 py-3 text-cocoa-900 font-medium">{{ e.examName }}</td>
                <td class="px-4 py-3">
                  <span class="px-2 py-0.5 rounded-md bg-cream-100 text-cocoa-600 text-xs">{{ e.subject }}</span>
                </td>
                <td class="px-4 py-3 text-cocoa-700">{{ e.date }}</td>
                <td class="px-4 py-3 text-butter-600 font-semibold">{{ e.avg }}</td>
                <td class="px-4 py-3 text-cocoa-700">{{ e.count }}</td>
                <td class="px-4 py-3 text-mint-500">{{ e.passRate }}%</td>
                <td class="px-4 py-3 text-cocoa-700">{{ e.excellentRate }}%</td>
                <td class="px-4 py-3 text-cocoa-700">{{ e.max }}</td>
                <td class="px-4 py-3 text-cocoa-700">{{ e.min }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </template>

      <div v-else class="bg-surface rounded-2xl p-12 text-center text-cocoa-400 shadow-softer">
        <GraduationCap class="w-12 h-12 mx-auto mb-3 text-cocoa-300" />
        请选择一个班级查看本学期成绩汇总与趋势
      </div>
    </section>
  </div>
</template>
