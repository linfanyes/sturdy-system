<script setup lang="ts">
import { computed } from 'vue'
import { Trophy } from 'lucide-vue-next'
import { scoreColor } from '@gardener/shared/utils/format'

interface Subject {
  subject: string
  fullScore?: number
}

interface RankItem {
  studentId: string
  studentName: string
  rank: number
  score: number
  percentile?: number
  subjectScores?: Record<string, number>
  totalScore?: number
}

const props = defineProps<{
  subjects: Subject[]
  rankData: RankItem[]
  totalSubjects: number
}>()

const scoreMatrix = computed(() => {
  if (!props.rankData?.length || !props.subjects?.length) return []
  return props.rankData.map((r: any) => {
    const row: any = { studentId: r.studentId, name: r.studentName, rank: r.rank }
    props.subjects.forEach((subj: any) => {
      const subjScores = r.subjectScores || {}
      row[subj.subject] = subjScores[subj.subject] ?? null
    })
    return row
  })
})
</script>

<template>
  <!-- 排名表 -->
  <div class="bg-surface rounded-2xl p-4 shadow-softer">
    <h3 class="text-sm font-medium text-cocoa-700 flex items-center gap-1 mb-3">
      <Trophy class="w-4 h-4 text-butter-500" /> 班级排名
    </h3>
    <div class="max-h-96 overflow-auto">
      <table class="w-full text-sm">
        <thead class="bg-cream-100 text-cocoa-500 text-left sticky top-0">
          <tr>
            <th class="px-3 py-2 font-medium">排名</th>
            <th class="px-3 py-2 font-medium">姓名</th>
            <th class="px-3 py-2 font-medium">分数</th>
            <th class="px-3 py-2 font-medium">百分位</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-cream-100">
          <tr v-for="r in rankData" :key="r.studentId" class="hover:bg-cream-50">
            <td class="px-3 py-2">
              <span class="inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold" :class="r.rank <= 3 ? 'bg-butter-100 text-butter-600' : 'text-cocoa-500'">{{ r.rank }}</span>
            </td>
            <td class="px-3 py-2 font-medium text-cocoa-900">{{ r.studentName }}</td>
            <td class="px-3 py-2 text-cocoa-700">{{ r.score }}</td>
            <td class="px-3 py-2 text-cocoa-500">{{ r.percentile != null ? r.percentile.toFixed(1) + '%' : '-' }}</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>

  <!-- 学生成绩矩阵 -->
  <div v-if="scoreMatrix.length" class="bg-surface rounded-2xl p-4 shadow-softer">
    <h3 class="text-sm font-medium text-cocoa-700 mb-3 flex items-center gap-1">
      <svg class="w-4 h-4 text-butter-500" viewBox="0 0 24 24" fill="none" stroke="currentColor"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="9" y1="3" x2="9" y2="21"/></svg>
      学生成绩矩阵
    </h3>
    <div class="overflow-x-auto">
      <table class="w-full text-sm border-collapse">
        <thead>
          <tr class="bg-cream-100">
            <th class="px-2 py-2 font-medium text-cocoa-500 sticky left-0 bg-cream-100 z-10">排名</th>
            <th class="px-2 py-2 font-medium text-cocoa-500 sticky left-12 bg-cream-100 z-10">姓名</th>
            <th v-for="subj in subjects" :key="subj.subject" class="px-2 py-2 font-medium text-cocoa-500 text-center min-w-16">{{ subj.subject }}</th>
            <th class="px-2 py-2 font-medium text-cocoa-500 text-center">总分</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-cream-100">
          <tr v-for="row in scoreMatrix" :key="row.studentId" class="hover:bg-cream-50">
            <td class="px-2 py-1.5 text-cocoa-500 text-xs sticky left-0 bg-white z-10">{{ row.rank }}</td>
            <td class="px-2 py-1.5 font-medium text-cocoa-900 text-sm sticky left-12 bg-white z-10 min-w-20">{{ row.name }}</td>
            <td v-for="subj in subjects" :key="subj.subject" class="px-2 py-1.5 text-center">
              <span class="inline-block px-2 py-0.5 rounded text-xs font-medium min-w-10" :style="{ background: scoreColor(row[subj.subject], subj.fullScore || 100), color: row[subj.subject] != null ? '#fff' : '#999' }">
                {{ row[subj.subject] != null ? row[subj.subject].toFixed(0) : '-' }}
              </span>
            </td>
            <td class="px-2 py-1.5 text-center font-semibold text-cocoa-900 text-sm">{{ row.totalScore != null ? row.totalScore.toFixed(0) : '-' }}</td>
          </tr>
        </tbody>
      </table>
    </div>
    <div class="flex items-center gap-3 mt-3 text-xs text-cocoa-500">
      <span>颜色说明：</span>
      <span class="inline-block w-3 h-3 rounded" style="background:#67c23a"></span>优秀(ge;90%)
      <span class="inline-block w-3 h-3 rounded" style="background:#e6a23c"></span>良好(ge;80%)
      <span class="inline-block w-3 h-3 rounded" style="background:#f5d342"></span>及格(ge;60%)
      <span class="inline-block w-3 h-3 rounded" style="background:#f5b342"></span>临界(ge;50%)
      <span class="inline-block w-3 h-3 rounded" style="background:#f56c6c"></span>不及格(&lt;50%)
    </div>
  </div>
</template>
