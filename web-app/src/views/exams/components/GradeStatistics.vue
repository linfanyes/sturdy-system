<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { Users, Award, AlertTriangle, BarChart3, Target, Sparkles, BookOpen } from 'lucide-vue-next'
import { getExamAnalysis, getWeakStudents } from '@/api/teacher'
import ScoreDistribution from './ScoreDistribution.vue'
import ClassComparison from './ClassComparison.vue'

interface Student {
  id: string
  name: string
  studentNo?: string
}

interface Exam {
  id: string
  name: string
  subjects?: string[]
  date?: string
  term?: string
}

interface SubjectStat {
  subject: string
  count: number
  total: number
  avg: number
  max: number
  min: number
  passRate: number
  excellentRate: number
  failCount: number
  scoreRange: number
  stdDev?: number
  distribution: { label: string; count: number }[]
}

interface ExamAnalysis {
  classId: string
  examId: string
  classAvg: number
  totalStudents: number
  subjects: SubjectStat[]
  weakSubjects: SubjectStat[]
  strongSubjects: SubjectStat[]
}

const props = defineProps<{
  classId: string
  selectedExam: Exam | null
  selectedExamId: string
  students: Student[]
  grades: any[]
}>()

const emit = defineEmits<{
  (e: 'studentDblClick', studentId: string): void
}>()

const loading = ref(false)
const analysis = ref<ExamAnalysis | null>(null)
const weakList = ref<any[]>([])

const compareClassId = ref('')
const compareClasses = ref<Array<{ id: string; name: string }>>([])
const compareLoading = ref(false)
const compareAnalysis = ref<ExamAnalysis | null>(null)

const weakAlert = computed(() => weakList.value.filter(w => w.weakCount >= 3))

async function loadAnalysis() {
  if (!props.classId || !props.selectedExamId) { analysis.value = null; return }
  loading.value = true
  try {
    const res = await getExamAnalysis(props.classId, props.selectedExamId)
    analysis.value = res
  } catch {
    analysis.value = null
  } finally {
    loading.value = false
  }
}

async function loadWeakStudents() {
  if (!props.classId || !props.selectedExamId) { weakList.value = []; return }
  try {
    const res = await getWeakStudents(props.classId, props.selectedExamId)
    weakList.value = res?.weakSubjects || []
  } catch {
    weakList.value = []
  }
}

async function loadCompareAnalysis() {
  if (!props.classId || !compareClassId.value || !props.selectedExamId) { compareAnalysis.value = null; return }
  compareLoading.value = true
  try {
    const res = await getExamAnalysis(compareClassId.value, props.selectedExamId)
    compareAnalysis.value = res
  } catch {
    compareAnalysis.value = null
  } finally {
    compareLoading.value = false
  }
}

async function loadCompareClasses() {
  if (!props.classId) return
  try {
    const res = await listExams({ classId: props.classId, take: 1 })
    // Find other classes in same grade
    const classes = await fetchClassList()
    compareClasses.value = classes.filter((c: any) => c.id !== props.classId)
  } catch {
    compareClasses.value = []
  }
}

async function fetchClassList(): Promise<Array<{ id: string; name: string }>> {
  // Import dynamically to avoid circular deps
  const { useClasses } = await import('@/composables/useClasses')
  const { classes } = useClasses()
  // If classes are already loaded, filter by grade
  const currentClass = classes.value.find((c: any) => c.id === props.classId)
  if (currentClass?.grade) {
    return classes.value
      .filter((c: any) => c.grade === currentClass.grade && c.id !== props.classId)
      .map((c: any) => ({ id: c.id, name: c.name }))
  }
  return []
}

watch([() => props.classId, () => props.selectedExamId], () => {
  loadAnalysis()
  loadWeakStudents()
  compareClassId.value = ''
  compareAnalysis.value = null
}, { immediate: true })

watch(compareClassId, loadCompareAnalysis)

const subjectStats = computed<SubjectStat[]>(() => analysis.value?.subjects || [])
const classAvg = computed(() => analysis.value?.classAvg || 0)
const totalStudents = computed(() => analysis.value?.totalStudents || 0)
const weakSubjects = computed(() => analysis.value?.weakSubjects || [])
const strongSubjects = computed(() => analysis.value?.strongSubjects || [])

const overallPassRate = computed(() => {
  if (!subjectStats.value.length) return 0
  return Math.round(subjectStats.value.reduce((s, x) => s + (x.passRate || 0), 0) / subjectStats.value.length)
})

const overallExcellentRate = computed(() => {
  if (!subjectStats.value.length) return 0
  return Math.round(subjectStats.value.reduce((s, x) => s + (x.excellentRate || 0), 0) / subjectStats.value.length)
})

const distributionSubject = ref('')
watch(subjectStats, (list) => {
  if (list.length && !distributionSubject.value) distributionSubject.value = list[0].subject
})

// Quick subject overview
const subjectCards = computed(() => {
  if (!subjectStats.value.length) return []
  return subjectStats.value
    .map(s => ({
      subject: s.subject,
      avg: s.avg,
      passRate: s.passRate,
      excellentRate: s.excellentRate,
      distribution: s.distribution,
    }))
    .sort((a, b) => b.avg - a.avg)
})

// Generate AI insight text
const aiInsight = computed(() => {
  if (!subjectStats.value.length) return ''
  const parts: string[] = []
  if (strongSubjects.value.length) {
    parts.push(`优势学科：${strongSubjects.value.map(s => `${s.subject}(均分${s.avg})`).join('、')}`)
  }
  if (weakSubjects.value.length) {
    parts.push(`薄弱学科：${weakSubjects.value.map(s => `${s.subject}(均分${s.avg})`).join('、')}，建议加强基础训练`)
  }
  if (overallPassRate.value < 80) {
    parts.push(`班级整体及格率偏低(${overallPassRate.value}%)，需关注临界生`)
  }
  return parts.join('；')
})
</script>

<template>
  <div v-if="classId && selectedExamId" class="space-y-4">
    <!-- 加载态 -->
    <div v-if="loading" class="bg-surface rounded-2xl p-6 shadow-softer text-center text-cocoa-400">
      <div class="flex items-center justify-center gap-2">
        <div class="w-5 h-5 border-2 border-butter-400 border-t-transparent rounded-full animate-spin"></div>
        <span>正在分析考试数据…</span>
      </div>
    </div>

    <template v-else-if="analysis">
      <!-- 班级概览卡片 -->
      <div class="grid grid-cols-2 md:grid-cols-5 gap-3">
        <div class="bg-surface rounded-2xl p-4 shadow-softer">
          <div class="flex items-center justify-between">
            <div>
              <div class="text-xs text-cocoa-400">班级均分</div>
              <div class="text-2xl font-bold text-cocoa-900 mt-0.5">{{ classAvg.toFixed(1) }}</div>
            </div>
            <div class="w-10 h-10 rounded-xl bg-butter-100 text-butter-600 flex items-center justify-center">
              <BarChart3 class="w-5 h-5" />
            </div>
          </div>
        </div>

        <div class="bg-surface rounded-2xl p-4 shadow-softer">
          <div class="flex items-center justify-between">
            <div>
              <div class="text-xs text-cocoa-400">参考人数</div>
              <div class="text-2xl font-bold text-cocoa-900 mt-0.5">{{ totalStudents }}</div>
            </div>
            <div class="w-10 h-10 rounded-xl bg-sky2-50 text-sky2-600 flex items-center justify-center">
              <Users class="w-5 h-5" />
            </div>
          </div>
        </div>

        <div class="bg-surface rounded-2xl p-4 shadow-softer">
          <div class="flex items-center justify-between">
            <div>
              <div class="text-xs text-cocoa-400">平均及格率</div>
              <div class="text-2xl font-bold text-mint-600 mt-0.5">{{ overallPassRate }}%</div>
            </div>
            <div class="w-10 h-10 rounded-xl bg-mint-100 text-mint-600 flex items-center justify-center">
              <Target class="w-5 h-5" />
            </div>
          </div>
        </div>

        <div class="bg-surface rounded-2xl p-4 shadow-softer">
          <div class="flex items-center justify-between">
            <div>
              <div class="text-xs text-cocoa-400">平均优秀率</div>
              <div class="text-2xl font-bold text-butter-600 mt-0.5">{{ overallExcellentRate }}%</div>
            </div>
            <div class="w-10 h-10 rounded-xl bg-cream-100 text-butter-600 flex items-center justify-center">
              <Award class="w-5 h-5" />
            </div>
          </div>
        </div>

        <div class="bg-surface rounded-2xl p-4 shadow-softer">
          <div class="flex items-center justify-between">
            <div>
              <div class="text-xs text-cocoa-400">学科数</div>
              <div class="text-2xl font-bold text-cocoa-900 mt-0.5">{{ subjectStats.length }}</div>
            </div>
            <div class="w-10 h-10 rounded-xl bg-purple-100 text-purple-600 flex items-center justify-center">
              <BookOpen class="w-5 h-5" />
            </div>
          </div>
        </div>
      </div>

      <!-- 优势/薄弱学科 + AI 洞察 -->
      <div class="bg-surface rounded-2xl p-4 shadow-softer">
        <div class="flex items-center gap-2 mb-3">
          <Sparkles class="w-4 h-4 text-butter-500" />
          <h3 class="text-sm font-medium text-cocoa-700">学情分析</h3>
        </div>
        <div class="flex flex-wrap gap-2 mb-3">
          <span
            v-for="s in strongSubjects"
            :key="'s-' + s.subject"
            class="text-xs px-2 py-1 rounded-full bg-mint-50 text-mint-700"
          >⬆️ {{ s.subject }} 均 {{ s.avg }} · 优秀率 {{ s.excellentRate }}%</span>
          <span
            v-for="s in weakSubjects"
            :key="'w-' + s.subject"
            class="text-xs px-2 py-1 rounded-full bg-sakura-50 text-sakura-700"
          >⬇️ {{ s.subject }} 均 {{ s.avg }} · 及格率 {{ s.passRate }}%</span>
        </div>
        <p v-if="aiInsight" class="text-sm text-cocoa-600 leading-relaxed">{{ aiInsight }}</p>
      </div>

      <!-- 学科概览卡片 -->
      <div v-if="subjectCards.length" class="bg-surface rounded-2xl p-4 shadow-softer">
        <h3 class="text-sm font-medium text-cocoa-700 mb-3">各科成绩概览</h3>
        <div class="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div
            v-for="s in subjectCards"
            :key="s.subject"
            class="rounded-xl border border-cream-200 p-3 hover:border-butter-300 transition-colors"
          >
            <div class="text-sm font-medium text-cocoa-900">{{ s.subject }}</div>
            <div class="flex items-baseline gap-1 mt-1">
              <span class="text-xl font-bold text-cocoa-900">{{ s.avg }}</span>
              <span class="text-xs text-cocoa-400">均分</span>
            </div>
            <div class="mt-2 h-1.5 rounded-full bg-cream-200 overflow-hidden">
              <div
                class="h-full rounded-full transition-all"
                :style="{
                  width: Math.round(s.passRate) + '%',
                  background: s.passRate >= 90 ? '#67c23a' : s.passRate >= 75 ? '#e6a23c' : '#f56c6c',
                }"
              ></div>
            </div>
            <div class="flex justify-between text-xs text-cocoa-400 mt-1">
              <span>及格 {{ s.passRate }}%</span>
              <span>优秀 {{ s.excellentRate }}%</span>
            </div>
          </div>
        </div>
      </div>

      <!-- 分数分布 + 对比 -->
      <ScoreDistribution
        :subjects="subjectStats"
        :dist-subject="distributionSubject"
        @update:dist-subject="distributionSubject = $event"
      />

      <!-- 班级对比 -->
      <ClassComparison
        :exam-stats="analysis"
        :analysis-b="compareAnalysis"
        :compare-class-id="compareClassId"
        :compare-classes="compareClasses"
        :compare-loading="compareLoading"
        @update:compare-class-id="compareClassId = $event"
      />

      <!-- 薄弱学生预警 -->
      <div v-if="weakAlert.length" class="bg-surface rounded-2xl p-4 shadow-softer">
        <div class="flex items-center gap-2 mb-3">
          <AlertTriangle class="w-4 h-4 text-sakura-500" />
          <h3 class="text-sm font-medium text-cocoa-700">薄弱学生预警</h3>
          <span class="text-xs text-cocoa-400">共 {{ weakAlert.length }} 名学生在{{ weakAlert[0]?.subject || '' }}等学科低于班级均分</span>
        </div>
        <div class="overflow-x-auto">
          <table class="w-full text-sm">
            <thead class="bg-cream-100 text-cocoa-500 text-left">
              <tr>
                <th class="px-3 py-2 font-medium">学科</th>
                <th class="px-3 py-2 font-medium text-center">班级均分</th>
                <th class="px-3 py-2 font-medium text-center">待关注人数</th>
                <th class="px-3 py-2 font-medium text-left">待关注学生</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-cream-100">
              <tr v-for="w in weakAlert" :key="w.subject" class="hover:bg-cream-50">
                <td class="px-3 py-2 font-medium text-cocoa-900">{{ w.subject }}</td>
                <td class="px-3 py-2 text-center text-cocoa-700">{{ w.classAvg }}</td>
                <td class="px-3 py-2 text-center">
                  <span class="inline-flex items-center px-2 py-0.5 rounded-full bg-sakura-50 text-sakura-600 text-xs font-medium">{{ w.weakCount }} 人</span>
                </td>
                <td class="px-3 py-2 text-cocoa-700">
                  <div class="flex flex-wrap gap-1">
                    <span
                      v-for="stu in (w.weakList || []).slice(0, 5)"
                      :key="stu.studentId"
                      class="text-xs px-1.5 py-0.5 rounded bg-cream-100 text-cocoa-600 cursor-pointer hover:bg-butter-100 hover:text-butter-700"
                      @click="emit('studentDblClick', stu.studentId)"
                      :title="`点击查看 ${stu.studentName} 详情`"
                    >
                      {{ stu.studentName }}({{ stu.score }})
                    </span>
                    <span v-if="w.weakList.length > 5" class="text-xs text-cocoa-400">等{{ w.weakList.length }}人</span>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </template>

    <!-- 空态 -->
    <div v-else-if="!loading" class="bg-surface rounded-2xl p-8 shadow-softer text-center text-cocoa-400">
      <Users class="w-10 h-10 mx-auto mb-3 text-cream-300" />
      <p>请先选择考试查看班级成绩分析</p>
    </div>
  </div>
</template>

<style scoped>
.stat-card {
  background: white; border-radius: 1rem; padding: 1rem;
  box-shadow: 0 1px 3px rgba(0,0,0,0.06);
  display: flex; flex-direction: column; align-items: flex-start;
}
</style>
