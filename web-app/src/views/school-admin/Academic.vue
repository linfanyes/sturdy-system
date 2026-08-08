<script setup lang="ts">
/**
 * 校管只读：成绩 / 考试 / 汇总分析（P2）
 *
 * 校管可跨班级查看本校所有成绩与考试数据（只读，不提供录入/修改）：
 * - 汇总分析：按学科聚合均分 / 及格率 / 最高最低分
 * - 考试列表：本校全部考试（可按班级过滤）
 * - 成绩列表：本校全部成绩记录（可按班级 / 科目 / 考试过滤）
 */
import { ref, onMounted, computed } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { loadClasses, useClasses } from '@/composables/useClasses'
import { listSchoolExams, listSchoolGrades, getSchoolGradeSummary } from '@/api/school-admin'
import { toast } from '@/utils/feedback'
import { BookOpen, BarChart3, Loader2, FileText, RefreshCw } from 'lucide-vue-next'

const auth = useAuthStore()
const { classes } = useClasses()

const loading = ref(false)
const classId = ref('')
const subject = ref('')
const examName = ref('')

const exams = ref<any[]>([])
const grades = ref<any[]>([])
const summary = ref<{ subjects: any[]; classes: any[]; totalGrades: number }>({ subjects: [], classes: [], totalGrades: 0 })

const subjectOptions = computed(() => {
  const set = new Set<string>()
  grades.value.forEach((g) => g.subject && set.add(g.subject))
  summary.value.subjects.forEach((s) => s.subject && set.add(s.subject))
  return [...set]
})

async function loadAll() {
  loading.value = true
  try {
    const params = classId.value ? { classId: classId.value } : {}
    const [examRes, gradeRes, sumRes] = await Promise.all([
      listSchoolExams(params),
      listSchoolGrades({ ...params, subject: subject.value || undefined, examName: examName.value || undefined }),
      getSchoolGradeSummary({ classId: classId.value || undefined }),
    ])
    exams.value = Array.isArray(examRes) ? examRes : (examRes?.items || [])
    grades.value = Array.isArray(gradeRes) ? gradeRes : (gradeRes?.items || [])
    summary.value = (sumRes?.subjects ? sumRes : { subjects: [], classes: [], totalGrades: 0 }) as any
  } catch (e: any) {
    toast.error(e?.message || '加载失败')
  } finally {
    loading.value = false
  }
}

function className(id: string) {
  return classes.value.find(c => c.id === id)?.name || id
}

function scoreSummary(g: any): string {
  if (!g.scores?.length) return '暂无'
  const valid = g.scores.filter((s: any) => s.score != null).map((s: any) => Number(s.score))
  if (!valid.length) return '暂无'
  const avg = (valid.reduce((a: number, b: number) => a + b, 0) / valid.length).toFixed(1)
  return `${valid.length}人 均${avg} 最高${Math.max(...valid)} 最低${Math.min(...valid)}`
}

onMounted(async () => {
  await loadClasses()
  await loadAll()
})
</script>

<template>
  <div class="space-y-6">
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
        <select
          v-model="subject"
          class="px-3 py-2 rounded-xl border border-cream-200 bg-surface text-sm focus:outline-none focus:border-butter-400"
          @change="loadAll"
        >
          <option value="">全部科目</option>
          <option v-for="s in subjectOptions" :key="s" :value="s">{{ s }}</option>
        </select>
        <button
          class="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-butter-500 text-white text-sm font-medium hover:bg-butter-600"
          :disabled="loading"
          @click="loadAll"
        >
          <RefreshCw class="w-4 h-4" :class="{ 'animate-spin': loading }" /> 刷新
        </button>
      </div>
    </div>

    <!-- 汇总分析 -->
    <section class="bg-surface rounded-2xl p-6 shadow-softer">
      <div class="flex items-center gap-2 mb-4">
        <BookOpen class="w-5 h-5 text-butter-500" />
        <h2 class="text-lg font-semibold text-cocoa-900">学科汇总分析</h2>
        <span class="text-sm text-cocoa-400 ml-auto">共 {{ summary.totalGrades }} 条成绩记录</span>
      </div>
      <div v-if="loading" class="text-center text-cocoa-400 py-8 flex items-center justify-center gap-2">
        <Loader2 class="w-5 h-5 animate-spin" /> 加载中…
      </div>
      <div v-else-if="!summary.subjects.length" class="text-center text-cocoa-400 py-8">暂无成绩数据</div>
      <div v-else class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
        <div
          v-for="s in summary.subjects"
          :key="s.subject"
          class="rounded-xl bg-cream-50 p-4"
        >
          <div class="text-sm font-semibold text-cocoa-900 mb-2">{{ s.subject }}</div>
          <div class="text-xs text-cocoa-500 space-y-1">
            <div class="flex justify-between"><span>样本数</span><span class="text-cocoa-900 font-medium">{{ s.count }}</span></div>
            <div class="flex justify-between"><span>平均分</span><span class="text-butter-600 font-medium">{{ s.avg }}</span></div>
            <div class="flex justify-between"><span>及格率</span><span class="text-mint-500 font-medium">{{ s.passRate }}%</span></div>
            <div class="flex justify-between"><span>最高 / 最低</span><span class="text-cocoa-900 font-medium">{{ s.max }} / {{ s.min }}</span></div>
          </div>
        </div>
      </div>
    </section>

    <!-- 考试列表 -->
    <section class="bg-surface rounded-2xl p-6 shadow-softer">
      <div class="flex items-center gap-2 mb-4">
        <FileText class="w-5 h-5 text-butter-500" />
        <h2 class="text-lg font-semibold text-cocoa-900">考试列表</h2>
        <span class="text-sm text-cocoa-400 ml-auto">共 {{ exams.length }} 场</span>
      </div>
      <div v-if="!exams.length" class="text-center text-cocoa-400 py-6">暂无考试</div>
      <div v-else class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead class="bg-cream-100 text-cocoa-500 text-left">
            <tr>
              <th class="px-4 py-3 font-medium">考试名称</th>
              <th class="px-4 py-3 font-medium">班级</th>
              <th class="px-4 py-3 font-medium">科目</th>
              <th class="px-4 py-3 font-medium">日期</th>
              <th class="px-4 py-3 font-medium">学期</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-cream-100">
            <tr v-for="e in exams" :key="e.id" class="hover:bg-cream-50 transition-colors">
              <td class="px-4 py-3 font-medium text-cocoa-900">{{ e.name }}</td>
              <td class="px-4 py-3 text-cocoa-700">{{ className(e.classId) }}</td>
              <td class="px-4 py-3 text-cocoa-700">{{ (e.subjects || []).join('、') }}</td>
              <td class="px-4 py-3 text-cocoa-700">{{ e.date || '-' }}</td>
              <td class="px-4 py-3 text-cocoa-700">{{ e.term || '-' }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>

    <!-- 成绩列表 -->
    <section class="bg-surface rounded-2xl p-6 shadow-softer">
      <div class="flex items-center gap-2 mb-4">
        <BarChart3 class="w-5 h-5 text-butter-500" />
        <h2 class="text-lg font-semibold text-cocoa-900">成绩列表</h2>
        <span class="text-sm text-cocoa-400 ml-auto">共 {{ grades.length }} 条</span>
      </div>
      <div v-if="!grades.length" class="text-center text-cocoa-400 py-6">暂无成绩记录</div>
      <div v-else class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead class="bg-cream-100 text-cocoa-500 text-left">
            <tr>
              <th class="px-4 py-3 font-medium">考试名称</th>
              <th class="px-4 py-3 font-medium">科目</th>
              <th class="px-4 py-3 font-medium">班级</th>
              <th class="px-4 py-3 font-medium">日期</th>
              <th class="px-4 py-3 font-medium">成绩汇总</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-cream-100">
            <tr v-for="g in grades" :key="g.id" class="hover:bg-cream-50 transition-colors">
              <td class="px-4 py-3 font-medium text-cocoa-900">{{ g.examName }}</td>
              <td class="px-4 py-3 text-cocoa-700">{{ g.subject }}</td>
              <td class="px-4 py-3 text-cocoa-700">{{ className(g.classId) }}</td>
              <td class="px-4 py-3 text-cocoa-700">{{ g.date || '-' }}</td>
              <td class="px-4 py-3 text-cocoa-500 text-xs">{{ scoreSummary(g) }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  </div>
</template>