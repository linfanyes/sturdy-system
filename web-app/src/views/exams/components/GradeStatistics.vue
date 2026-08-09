<script setup lang="ts">
import { computed } from 'vue'
import { User } from 'lucide-vue-next'

interface Student {
  id: string
  name: string
  studentNo?: string
}

interface Exam {
  id: string
  name: string
  subjects?: string[]
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

const studentMatrix = computed(() => {
  if (!props.classId || !props.selectedExamId || !props.students.length) return []
  const examGrades = props.grades.filter(g => g.examName === props.selectedExam?.name || g.examId === props.selectedExamId)
  const subjects = props.selectedExam?.subjects || [...new Set(examGrades.map(g => g.subject))]
  return props.students.map(st => {
    const scores: Record<string, number | null> = {}
    let total = 0
    let count = 0
    for (const subj of subjects) {
      const grade = examGrades.find(g => g.subject === subj)
      const entry = grade?.scores?.find((s: any) => s.studentId === st.id)
      scores[subj] = entry?.score ?? null
      if (entry?.score != null) { total += entry.score; count++ }
    }
    return { student: st, scores, total, avg: count > 0 ? total / count : null, subjects }
  })
})

const matrixSubjects = computed(() => props.selectedExam?.subjects || [])
</script>

<template>
  <!-- 学生成绩矩阵 -->
  <div v-if="classId && selectedExamId && studentMatrix.length" class="bg-surface rounded-2xl p-4 shadow-softer">
    <div class="flex items-center gap-2 mb-3">
      <User class="w-4 h-4 text-butter-500" />
      <h3 class="text-sm font-medium text-cocoa-700">学生成绩（双击行查看详情）</h3>
    </div>
    <div class="overflow-x-auto">
      <table class="w-full text-sm">
        <thead class="bg-cream-100 text-cocoa-500 text-left">
          <tr>
            <th class="px-3 py-2 font-medium">姓名</th>
            <th v-for="s in matrixSubjects" :key="s" class="px-3 py-2 font-medium text-center">{{ s }}</th>
            <th class="px-3 py-2 font-medium text-center">总分</th>
            <th class="px-3 py-2 font-medium text-center">均分</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-cream-100">
          <tr
            v-for="row in studentMatrix"
            :key="row.student.id"
            class="hover:bg-cream-50 transition-colors cursor-pointer"
            @dblclick="emit('studentDblClick', row.student.id)"
          >
            <td class="px-3 py-2 font-medium text-cocoa-900">{{ row.student.name }}</td>
            <td v-for="s in matrixSubjects" :key="s" class="px-3 py-2 text-center" :class="row.scores[s] == null ? 'text-cocoa-300' : row.scores[s] >= 85 ? 'text-mint-500 font-medium' : row.scores[s] < 60 ? 'text-red-400' : 'text-cocoa-700'">
              {{ row.scores[s] ?? '缺' }}
            </td>
            <td class="px-3 py-2 text-center font-medium text-cocoa-900">{{ row.total || '-' }}</td>
            <td class="px-3 py-2 text-center text-cocoa-700">{{ row.avg != null ? row.avg.toFixed(1) : '-' }}</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>
