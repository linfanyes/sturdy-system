<script setup lang="ts">
import { ref, computed } from 'vue'
import { useClassStore } from '../stores/class'
import { useGradeStore, calcStat } from '../stores/grade'
import { useExamStore } from '../stores/exam'
import EmptyState from '../components/common/EmptyState.vue'
import { TrendingUp, BarChart3 } from 'lucide-vue-next'

const classStore = useClassStore()
const gradeStore = useGradeStore()
const examStore = useExamStore()

// Mode: single class trend or cross-class comparison
const mode = ref<'trend' | 'compare'>('trend')
const selectedClassId = ref(classStore.classes[0]?.id || '')
const selectedSubject = ref('')
const selectedStudentId = ref('')

// All classes for comparison
const classIds = computed(() => classStore.classes.map(c => c.id))

// Subjects from selected class's exams
const subjects = computed(() => {
  if (mode.value === 'trend') {
    const grades = gradeStore.gradesOfClass(selectedClassId.value)
    return [...new Set(grades.map(g => g.subject))]
  } else {
    const allSubjects = new Set<string>()
    for (const cid of classIds.value) {
      for (const g of gradeStore.gradesOfClass(cid)) {
        allSubjects.add(g.subject)
      }
    }
    return [...allSubjects]
  }
})

// Auto-select first subject
if (subjects.value.length && !selectedSubject.value) {
  selectedSubject.value = subjects.value[0]
}

// Students of selected class
const students = computed(() => classStore.studentsOf(selectedClassId.value))

// Trend data: average score per exam for a class+subject
const trendData = computed(() => {
  if (!selectedClassId.value || !selectedSubject.value) return []
  const grades = gradeStore.gradesOfClassSubject(selectedClassId.value, selectedSubject.value)
  return grades
    .sort((a, b) => a.date.localeCompare(b.date))
    .map(g => {
      const stat = calcStat(g.scores)
      return {
        examName: g.examName,
        date: g.date,
        avg: stat.avg,
        max: stat.max,
        min: stat.min,
        median: stat.median,
        passRate: stat.passRate,
        excellentRate: stat.excellentRate,
        count: stat.count,
      }
    })
})

// Student trend: individual student scores across exams
const studentTrend = computed(() => {
  if (!selectedStudentId.value || !selectedSubject.value) return []
  const grades = gradeStore.gradesOfClassSubject(selectedClassId.value, selectedSubject.value)
  return grades
    .sort((a, b) => a.date.localeCompare(b.date))
    .map(g => {
      const s = g.scores.find(s => s.studentId === selectedStudentId.value)
      return {
        examName: g.examName,
        date: g.date,
        score: s?.score ?? null,
      }
    })
    .filter(d => d.score !== null)
})

// Comparison data: latest exam averages across all classes for a subject
const compareData = computed(() => {
  if (!selectedSubject.value) return []
  return classStore.classes.map(c => {
    const grades = gradeStore.gradesOfClassSubject(c.id, selectedSubject.value)
    if (!grades.length) return { classId: c.id, className: c.name, avg: 0, passRate: 0, excellentRate: 0, count: 0, latestExam: '' }
    const latest = grades.sort((a, b) => b.date.localeCompare(a.date))[0]
    const stat = calcStat(latest.scores)
    return {
      classId: c.id,
      className: c.name,
      avg: stat.avg,
      passRate: stat.passRate,
      excellentRate: stat.excellentRate,
      count: stat.count,
      latestExam: latest.examName,
    }
  }).filter(d => d.count > 0)
})

// Chart dimensions
const chartW = 600
const chartH = 200
const padL = 50
const padR = 20
const padT = 20
const padB = 40

function trendPath(data: { avg: number }[]) {
  if (!data.length) return ''
  const maxVal = Math.max(...data.map(d => d.avg), 1)
  const minVal = Math.min(...data.map(d => d.avg), 0)
  const range = maxVal - minVal || 1
  const stepX = data.length > 1 ? (chartW - padL - padR) / (data.length - 1) : 0
  return data.map((d, i) => {
    const x = padL + i * stepX
    const y = padT + (1 - (d.avg - minVal) / range) * (chartH - padT - padB)
    return `${i === 0 ? 'M' : 'L'}${x},${y}`
  }).join(' ')
}

function trendPoints(data: { avg: number }[]) {
  if (!data.length) return []
  const maxVal = Math.max(...data.map(d => d.avg), 1)
  const minVal = Math.min(...data.map(d => d.avg), 0)
  const range = maxVal - minVal || 1
  const stepX = data.length > 1 ? (chartW - padL - padR) / (data.length - 1) : 0
  return data.map((d, i) => ({
    x: padL + i * stepX,
    y: padT + (1 - (d.avg - minVal) / range) * (chartH - padT - padB),
    val: d.avg,
  }))
}

function studentPath(data: { score: number | null }[]) {
  const valid = data.filter(d => d.score !== null) as { score: number }[]
  if (!valid.length) return ''
  const maxVal = Math.max(...valid.map(d => d.score), 1)
  const minVal = Math.min(...valid.map(d => d.score), 0)
  const range = maxVal - minVal || 1
  const stepX = valid.length > 1 ? (chartW - padL - padR) / (valid.length - 1) : 0
  return valid.map((d, i) => {
    const x = padL + i * stepX
    const y = padT + (1 - (d.score - minVal) / range) * (chartH - padT - padB)
    return `${i === 0 ? 'M' : 'L'}${x},${y}`
  }).join(' ')
}

// Bar chart for comparison
function barWidth(val: number, maxVal: number) {
  if (!maxVal) return 0
  return (val / maxVal) * (chartW - padL - padR)
}
</script>

<template>
  <div class="space-y-5">
    <section class="card-soft p-6 bg-gradient-to-br from-mint-100 via-cream-50 to-sky2-100 relative overflow-hidden">
      <div class="absolute -top-10 right-6 text-7xl opacity-20 select-none">📈</div>
      <h2 class="title-display text-2xl">成绩趋势分析</h2>
      <p class="text-sm text-cocoa-500 mt-1">可视化成绩变化趋势，跨班级对比分析</p>
    </section>

    <!-- Mode switch -->
    <div class="flex items-center gap-3 flex-wrap">
      <div class="flex gap-1">
        <button class="chip cursor-pointer" :class="mode === 'trend' ? 'bg-mint-300 text-mint-700' : 'bg-cocoa-100 text-cocoa-500'" @click="mode = 'trend'">
          <TrendingUp :size="12" class="inline" /> 班级趋势
        </button>
        <button class="chip cursor-pointer" :class="mode === 'compare' ? 'bg-sky2-300 text-sky2-700' : 'bg-cocoa-100 text-cocoa-500'" @click="mode = 'compare'">
          <BarChart3 :size="12" class="inline" /> 班级对比
        </button>
      </div>

      <select v-if="mode === 'trend'" v-model="selectedClassId" class="input-soft !w-auto">
        <option v-for="c in classStore.classes" :key="c.id" :value="c.id">{{ c.name }}</option>
      </select>

      <select v-model="selectedSubject" class="input-soft !w-auto">
        <option value="">选择科目</option>
        <option v-for="s in subjects" :key="s" :value="s">{{ s }}</option>
      </select>

      <select v-if="mode === 'trend'" v-model="selectedStudentId" class="input-soft !w-auto">
        <option value="">全部学生（看均分）</option>
        <option v-for="s in students" :key="s.id" :value="s.id">{{ s.name }}</option>
      </select>
    </div>

    <!-- Trend mode -->
    <template v-if="mode === 'trend'">
      <div v-if="!trendData.length" class="mt-8">
        <EmptyState title="暂无成绩数据" desc="录入成绩后，这里会显示趋势变化" icon="📈" />
      </div>
      <div v-else class="space-y-5">
        <!-- Class average trend chart -->
        <div v-if="!selectedStudentId" class="card-soft p-5">
          <h3 class="title-display text-lg mb-3">
            {{ classStore.getClass(selectedClassId)?.name }} · {{ selectedSubject }} 均分趋势
          </h3>
          <div class="overflow-x-auto">
            <svg :viewBox="`0 0 ${chartW} ${chartH}`" class="w-full max-w-xl" preserveAspectRatio="xMidYMid meet">
              <!-- Grid lines -->
              <line v-for="i in 4" :key="i" :x1="padL" :x2="chartW - padR"
                :y1="padT + (i - 1) * (chartH - padT - padB) / 3"
                :y2="padT + (i - 1) * (chartH - padT - padB) / 3"
                stroke="var(--color-cocoa-100, #e8e0d8)" stroke-width="0.5" />
              <!-- Line -->
              <path :d="trendPath(trendData)" fill="none" stroke="var(--color-mint-400, #6ee7b7)" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" />
              <!-- Points -->
              <circle v-for="(p, i) in trendPoints(trendData)" :key="i" :cx="p.x" :cy="p.y" r="4" fill="var(--color-mint-500, #34d399)" />
              <!-- Labels -->
              <text v-for="(d, i) in trendData" :key="i"
                :x="trendPoints(trendData)[i]?.x" :y="chartH - 5"
                text-anchor="middle" class="text-[9px] fill-cocoa-400">
                {{ d.examName.slice(0, 6) }}
              </text>
              <text v-for="(p, i) in trendPoints(trendData)" :key="'v' + i"
                :x="p.x" :y="p.y - 8"
                text-anchor="middle" class="text-[9px] fill-cocoa-600 font-medium">
                {{ p.val }}
              </text>
            </svg>
          </div>
          <!-- Data table -->
          <div class="overflow-x-auto mt-4">
            <table class="w-full text-xs">
              <thead>
                <tr class="text-cocoa-500 border-b border-cocoa-100">
                  <th class="text-left py-1 pr-3">考试</th>
                  <th class="text-right py-1 px-2">均分</th>
                  <th class="text-right py-1 px-2">最高</th>
                  <th class="text-right py-1 px-2">最低</th>
                  <th class="text-right py-1 px-2">中位数</th>
                  <th class="text-right py-1 px-2">及格率</th>
                  <th class="text-right py-1 px-2">优秀率</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="d in trendData" :key="d.examName" class="border-b border-cocoa-50">
                  <td class="py-1 pr-3">{{ d.examName }}</td>
                  <td class="text-right py-1 px-2 font-medium">{{ d.avg }}</td>
                  <td class="text-right py-1 px-2 text-mint-500">{{ d.max }}</td>
                  <td class="text-right py-1 px-2 text-sakura-500">{{ d.min }}</td>
                  <td class="text-right py-1 px-2">{{ d.median }}</td>
                  <td class="text-right py-1 px-2">{{ d.passRate }}%</td>
                  <td class="text-right py-1 px-2">{{ d.excellentRate }}%</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <!-- Student individual trend -->
        <div v-if="selectedStudentId && studentTrend.length" class="card-soft p-5">
          <h3 class="title-display text-lg mb-3">
            {{ students.find(s => s.id === selectedStudentId)?.name }} · {{ selectedSubject }} 成绩趋势
          </h3>
          <div class="overflow-x-auto">
            <svg :viewBox="`0 0 ${chartW} ${chartH}`" class="w-full max-w-xl" preserveAspectRatio="xMidYMid meet">
              <path :d="studentPath(studentTrend)" fill="none" stroke="var(--color-sky2-400, #7dd3fc)" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" />
              <text v-for="(d, i) in studentTrend" :key="i"
                :x="padL + (studentTrend.length > 1 ? i * (chartW - padL - padR) / (studentTrend.length - 1) : 0)"
                :y="chartH - 5"
                text-anchor="middle" class="text-[9px] fill-cocoa-400">
                {{ d.examName.slice(0, 6) }}
              </text>
            </svg>
          </div>
          <div class="flex flex-wrap gap-2 mt-3">
            <div v-for="d in studentTrend" :key="d.examName" class="chip bg-sky2-100 text-sky2-600 text-xs">
              {{ d.examName }}: {{ d.score }}分
            </div>
          </div>
        </div>
      </div>
    </template>

    <!-- Compare mode -->
    <template v-if="mode === 'compare'">
      <div v-if="!compareData.length" class="mt-8">
        <EmptyState title="暂无对比数据" desc="多个班级录入同一科目成绩后可进行对比" icon="📊" />
      </div>
      <div v-else class="card-soft p-5">
        <h3 class="title-display text-lg mb-3">{{ selectedSubject }} 班级对比</h3>
        <div class="space-y-3">
          <div v-for="d in compareData" :key="d.classId">
            <div class="flex items-center gap-2 mb-1">
              <span class="text-sm font-medium w-20 truncate">{{ d.className }}</span>
              <span class="text-xs text-cocoa-400">{{ d.latestExam }}</span>
              <span class="number text-sm font-bold ml-auto">{{ d.avg }}分</span>
            </div>
            <div class="w-full h-6 bg-cocoa-100/50 rounded-full overflow-hidden">
              <div class="h-full bg-gradient-to-r from-mint-300 to-mint-500 rounded-full transition-all"
                :style="{ width: barWidth(d.avg, Math.max(...compareData.map(c => c.avg))) + 'px' }" />
            </div>
            <div class="flex gap-3 mt-1 text-[10px] text-cocoa-500">
              <span>及格率 {{ d.passRate }}%</span>
              <span>优秀率 {{ d.excellentRate }}%</span>
              <span>参考 {{ d.count }}人</span>
            </div>
          </div>
        </div>

        <!-- Comparison table -->
        <div class="overflow-x-auto mt-5">
          <table class="w-full text-xs">
            <thead>
              <tr class="text-cocoa-500 border-b border-cocoa-100">
                <th class="text-left py-1 pr-3">班级</th>
                <th class="text-right py-1 px-2">均分</th>
                <th class="text-right py-1 px-2">及格率</th>
                <th class="text-right py-1 px-2">优秀率</th>
                <th class="text-right py-1 px-2">参考人数</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="d in compareData" :key="d.classId" class="border-b border-cocoa-50">
                <td class="py-1.5 pr-3 font-medium">{{ d.className }}</td>
                <td class="text-right py-1.5 px-2">{{ d.avg }}</td>
                <td class="text-right py-1.5 px-2">{{ d.passRate }}%</td>
                <td class="text-right py-1.5 px-2">{{ d.excellentRate }}%</td>
                <td class="text-right py-1.5 px-2">{{ d.count }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </template>
  </div>
</template>
