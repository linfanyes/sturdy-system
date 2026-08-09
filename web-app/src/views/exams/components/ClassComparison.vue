<script setup lang="ts">
import { computed } from 'vue'
import { Users } from 'lucide-vue-next'
import { fmt1, pct } from '@gardener/shared/utils/format'

const props = defineProps<{
  examStats: any
  analysisB: any
  compareClassId: string
  compareClasses: Array<{ id: string; name: string }>
  compareLoading: boolean
}>()

const emit = defineEmits<{
  (e: 'update:compareClassId', v: string): void
}>()

const avgPassRate = computed(() => {
  if (!props.examStats?.subjects?.length) return 0
  const rates = props.examStats.subjects.map((s: any) => s.passRate || 0)
  return rates.reduce((a: number, b: number) => a + b, 0) / rates.length
})
const avgExcellentRate = computed(() => {
  if (!props.examStats?.subjects?.length) return 0
  const rates = props.examStats.subjects.map((s: any) => s.excellentRate || 0)
  return rates.reduce((a: number, b: number) => a + b, 0) / rates.length
})

const compareBPassRate = computed(() => {
  if (!props.analysisB?.subjects?.length) return 0
  const rates = props.analysisB.subjects.map((s: any) => s.passRate || 0)
  return rates.reduce((a: number, b: number) => a + b, 0) / rates.length
})
const compareBExcellentRate = computed(() => {
  if (!props.analysisB?.subjects?.length) return 0
  const rates = props.analysisB.subjects.map((s: any) => s.excellentRate || 0)
  return rates.reduce((a: number, b: number) => a + b, 0) / rates.length
})

const compareClassIdModel = computed({
  get: () => props.compareClassId,
  set: (v) => emit('update:compareClassId', v),
})
</script>

<template>
  <div class="bg-surface rounded-2xl p-6 shadow-softer">
    <div class="flex items-center gap-3 mb-4 flex-wrap">
      <div class="font-medium text-cocoa-700 flex items-center gap-2">
        <Users class="w-4 h-4 text-butter-500" /> 班级对比
      </div>
      <select v-if="compareClasses.length" v-model="compareClassIdModel" class="px-3 py-1.5 rounded-xl border border-cream-200 bg-surface text-sm focus:outline-none focus:border-butter-400">
        <option value="">选择对比班级</option>
        <option v-for="c in compareClasses" :key="c.id" :value="c.id">{{ c.name }}</option>
      </select>
      <span v-else class="text-xs text-cocoa-400">同年级暂无其他班级可对比</span>
    </div>

    <div v-if="compareLoading" class="text-center py-8 text-cocoa-400">加载对比数据…</div>

    <div v-else-if="compareClassId && analysisB" class="space-y-4">
      <div class="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div class="stat-card">
          <div class="text-xs text-cocoa-400">班级均分</div>
          <div class="flex items-center gap-2 mt-1">
            <span class="text-lg font-bold text-cocoa-900">{{ fmt1(examStats.classAvg) }}</span>
            <span class="text-xs text-cocoa-500">vs</span>
            <span class="text-lg font-bold" :class="analysisB.classAvg >= (examStats.classAvg || 0) ? 'text-red-500' : 'text-mint-500'">{{ fmt1(analysisB.classAvg) }}</span>
          </div>
        </div>
        <div class="stat-card">
          <div class="text-xs text-cocoa-400">总人数</div>
          <div class="flex items-center gap-2 mt-1">
            <span class="text-lg font-bold text-cocoa-900">{{ examStats.totalStudents }}</span>
            <span class="text-xs text-cocoa-500">vs</span>
            <span class="text-lg font-bold text-cocoa-900">{{ analysisB.totalStudents }}</span>
          </div>
        </div>
        <div class="stat-card">
          <div class="text-xs text-cocoa-400">及格率</div>
          <div class="flex items-center gap-2 mt-1">
            <span class="text-lg font-bold text-mint-500">{{ pct(avgPassRate) }}</span>
            <span class="text-xs text-cocoa-500">vs</span>
            <span class="text-lg font-bold" :class="compareBPassRate >= avgPassRate ? 'text-red-500' : 'text-mint-500'">{{ pct(compareBPassRate) }}</span>
          </div>
        </div>
        <div class="stat-card">
          <div class="text-xs text-cocoa-400">优秀率</div>
          <div class="flex items-center gap-2 mt-1">
            <span class="text-lg font-bold text-butter-500">{{ pct(avgExcellentRate) }}</span>
            <span class="text-xs text-cocoa-500">vs</span>
            <span class="text-lg font-bold" :class="compareBExcellentRate >= avgExcellentRate ? 'text-red-500' : 'text-mint-500'">{{ pct(compareBExcellentRate) }}</span>
          </div>
        </div>
      </div>

      <!-- 各科对比 -->
      <div class="bg-surface rounded-2xl p-4 shadow-softer">
        <h3 class="text-sm font-medium text-cocoa-700 mb-3">各科对比</h3>
        <div class="overflow-x-auto">
          <table class="w-full text-sm">
            <thead class="bg-cream-100 text-cocoa-500 text-left">
              <tr>
                <th class="px-3 py-2 font-medium">科目</th>
                <th class="px-3 py-2 font-medium text-right">均分（本班）</th>
                <th class="px-3 py-2 font-medium text-right">均分（对比班）</th>
                <th class="px-3 py-2 font-medium text-right">及格率（本班）</th>
                <th class="px-3 py-2 font-medium text-right">及格率（对比班）</th>
                <th class="px-3 py-2 font-medium text-right">优秀率（本班）</th>
                <th class="px-3 py-2 font-medium text-right">优秀率（对比班）</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-cream-100">
              <tr v-for="s in examStats.subjects" :key="s.subject" class="hover:bg-cream-50">
                <td class="px-3 py-2 font-medium text-cocoa-900">{{ s.subject }}</td>
                <td class="px-3 py-2 text-right">{{ fmt1(s.avg) }}</td>
                <td class="px-3 py-2 text-right">{{ fmt1(analysisB.subjects?.find((x: any) => x.subject === s.subject)?.avg) }}</td>
                <td class="px-3 py-2 text-right">{{ pct(s.passRate) }}</td>
                <td class="px-3 py-2 text-right">{{ pct(analysisB.subjects?.find((x: any) => x.subject === s.subject)?.passRate) }}</td>
                <td class="px-3 py-2 text-right">{{ pct(s.excellentRate) }}</td>
                <td class="px-3 py-2 text-right">{{ pct(analysisB.subjects?.find((x: any) => x.subject === s.subject)?.excellentRate) }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
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
