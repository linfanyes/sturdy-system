<script setup lang="ts">
import { computed } from 'vue'
import { fmt1, pct } from '@gardener/shared/utils/format'

interface Subject {
  subject: string
  avg: number
  max: number
  min: number
  passRate: number
  excellentRate: number
  fullScore?: number
  distribution?: { label: string; count: number }[]
}

const props = defineProps<{
  subjects: Subject[]
  distSubject: string
}>()

const emit = defineEmits<{
  (e: 'update:distSubject', v: string): void
}>()

const selectedDist = computed({
  get: () => props.distSubject,
  set: (v) => emit('update:distSubject', v),
})

const CHART_W = 800
const CHART_H = 300
const PAD = { top: 20, right: 20, bottom: 40, left: 40 }

const distribution = computed(() => {
  const subj = props.subjects.find(s => s.subject === selectedDist.value) || props.subjects[0]
  if (!subj?.distribution) return []
  return subj.distribution.map(d => ({ range: d.label, count: d.count }))
})

const subjectBars = computed(() => {
  if (!props.subjects.length) return []
  const maxAvg = Math.max(...props.subjects.map(s => s.avg || 0))
  return props.subjects.map(s => ({
    subject: s.subject,
    avg: s.avg || 0,
    pct: maxAvg > 0 ? (s.avg / maxAvg) * 100 : 0,
  }))
})

/* 各科分数段统计 */
const segmentStats = computed(() => {
  if (!props.subjects.length) return []
  return props.subjects.map((s: any) => {
    const scores = s.rawScores || []
    const full = s.fullScore || 100
    const seg = {
      subject: s.subject,
      excellent: scores.filter((v: number) => v >= full * 0.9).length,
      good: scores.filter((v: number) => v >= full * 0.8 && v < full * 0.9).length,
      pass: scores.filter((v: number) => v >= full * 0.6 && v < full * 0.8).length,
      borderline: scores.filter((v: number) => v >= full * 0.5 && v < full * 0.6).length,
      fail: scores.filter((v: number) => v < full * 0.5).length,
      total: scores.length,
    }
    return seg
  })
})

</script>

<template>
  <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
    <!-- 分数分布 -->
    <div class="bg-surface rounded-2xl p-4 shadow-softer">
      <div class="flex items-center justify-between mb-3">
        <h3 class="text-sm font-medium text-cocoa-700">分数分布</h3>
        <select v-model="selectedDist" class="px-2 py-1 rounded-lg border border-cream-200 text-xs">
          <option v-for="s in subjects" :key="s.subject" :value="s.subject">{{ s.subject }}</option>
        </select>
      </div>
      <svg v-if="distribution.length" :viewBox="`0 0 ${CHART_W} ${CHART_H}`" class="w-full h-48">
        <g v-for="(d, i) in distribution" :key="i">
          <rect
            :x="PAD.left + (i / distribution.length) * (CHART_W - PAD.left - PAD.right)"
            :y="CHART_H - PAD.bottom - (d.count / Math.max(...distribution.map(x => x.count), 1)) * (CHART_H - PAD.top - PAD.bottom)"
            :width="(CHART_W - PAD.left - PAD.right) / distribution.length * 0.8"
            :height="(d.count / Math.max(...distribution.map(x => x.count), 1)) * (CHART_H - PAD.top - PAD.bottom)"
            :fill="d.count > 0 ? '#e6a23c' : '#f5f0e8'"
            rx="2"
          />
          <text
            :x="PAD.left + (i / distribution.length) * (CHART_W - PAD.left - PAD.right) + ((CHART_W - PAD.left - PAD.right) / distribution.length * 0.4)"
            :y="CHART_H - PAD.bottom + 15"
            text-anchor="middle" class="fill-cocoa-400" style="font-size: 9px;"
          >{{ d.range }}</text>
          <text
            v-if="d.count > 0"
            :x="PAD.left + (i / distribution.length) * (CHART_W - PAD.left - PAD.right) + ((CHART_W - PAD.left - PAD.right) / distribution.length * 0.4)"
            :y="CHART_H - PAD.bottom - (d.count / Math.max(...distribution.map(x => x.count), 1)) * (CHART_H - PAD.top - PAD.bottom) - 4"
            text-anchor="middle" class="fill-cocoa-700" style="font-size: 10px; font-weight: 600;"
          >{{ d.count }}</text>
        </g>
      </svg>
      <div v-else class="text-center py-8 text-cocoa-400 text-sm">暂无分布数据</div>
    </div>

    <!-- 各科均分对比 -->
    <div class="bg-surface rounded-2xl p-4 shadow-softer">
      <h3 class="text-sm font-medium text-cocoa-700 mb-3">各科均分对比</h3>
      <div class="space-y-3">
        <div v-for="s in subjectBars" :key="s.subject" class="flex items-center gap-3">
          <span class="text-sm text-cocoa-700 w-12 flex-shrink-0">{{ s.subject }}</span>
          <div class="flex-1 bg-cream-100 rounded-full h-6 relative overflow-hidden">
            <div class="h-full rounded-full flex items-center justify-end pr-2" :style="{ width: s.pct + '%' }" style="background: #67c23a">
              <span class="text-xs text-white font-medium">{{ fmt1(s.avg) }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>

  <!-- 分数段统计 -->
  <div v-if="segmentStats.length" class="bg-surface rounded-2xl p-4 shadow-softer">
    <h3 class="text-sm font-medium text-cocoa-700 mb-3 flex items-center gap-1">
      <svg class="w-4 h-4 text-butter-500" viewBox="0 0 24 24" fill="none" stroke="currentColor"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="9" y1="3" x2="9" y2="21"/></svg>
      各科分数段统计
    </h3>
    <div class="overflow-x-auto">
      <table class="w-full text-sm">
        <thead class="bg-cream-100 text-cocoa-500 text-left">
          <tr>
            <th class="px-3 py-2 font-medium">科目</th>
            <th class="px-3 py-2 font-medium text-center text-mint-600">优秀(&ge;90%)</th>
            <th class="px-3 py-2 font-medium text-center text-butter-600">良好(&ge;80%)</th>
            <th class="px-3 py-2 font-medium text-center text-cocoa-600">及格(&ge;60%)</th>
            <th class="px-3 py-2 font-medium text-center text-cocoa-500">临界(&ge;50%)</th>
            <th class="px-3 py-2 font-medium text-center text-red-500">不及格(&lt;50%)</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-cream-100">
          <tr v-for="seg in segmentStats" :key="seg.subject" class="hover:bg-cream-50">
            <td class="px-3 py-2 font-medium text-cocoa-900">{{ seg.subject }}</td>
            <td class="px-3 py-2 text-center">
              <span class="text-mint-600 font-medium">{{ seg.excellent }}</span>
              <span class="text-cocoa-400 text-xs ml-1">({{ seg.total ? pct(seg.excellent / seg.total) : '0%' }})</span>
            </td>
            <td class="px-3 py-2 text-center">
              <span class="text-butter-600 font-medium">{{ seg.good }}</span>
              <span class="text-cocoa-400 text-xs ml-1">({{ seg.total ? pct(seg.good / seg.total) : '0%' }})</span>
            </td>
            <td class="px-3 py-2 text-center">
              <span class="text-cocoa-600 font-medium">{{ seg.pass }}</span>
              <span class="text-cocoa-400 text-xs ml-1">({{ seg.total ? pct(seg.pass / seg.total) : '0%' }})</span>
            </td>
            <td class="px-3 py-2 text-center">
              <span class="text-cocoa-500 font-medium">{{ seg.borderline }}</span>
              <span class="text-cocoa-400 text-xs ml-1">({{ seg.total ? pct(seg.borderline / seg.total) : '0%' }})</span>
            </td>
            <td class="px-3 py-2 text-center">
              <span class="text-red-500 font-medium">{{ seg.fail }}</span>
              <span class="text-cocoa-400 text-xs ml-1">({{ seg.total ? pct(seg.fail / seg.total) : '0%' }})</span>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>
