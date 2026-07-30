<script setup lang="ts">
import { computed } from 'vue'

interface BarData { label: string; value: number; color?: string }

const props = withDefaults(defineProps<{
  data: BarData[]
  height?: number
  title?: string
}>(), { height: 180 })

const maxVal = computed(() => Math.max(...props.data.map(d => d.value), 1))
const hasData = computed(() => props.data.some(d => d.value > 0))
const colors = ['#e6a23c', '#67c23a', '#409eff', '#e06c75', '#8e7cc3', '#40c9c6', '#ff9800', '#2196f3']

const bars = computed(() => props.data.map((d, i) => ({
  ...d,
  color: d.color || colors[i % colors.length],
  pct: d.value > 0 ? Math.max((d.value / maxVal.value) * 100, 8) : 0,
})))

// Y 轴刻度线
const gridLines = computed(() => {
  const step = Math.ceil(maxVal.value / 4)
  return Array.from({ length: 5 }, (_, i) => step * i)
})
</script>

<template>
  <div class="bg-white rounded-2xl p-5 shadow-softer">
    <div v-if="title" class="text-sm font-semibold text-cocoa-700 mb-3">{{ title }}</div>
    <div v-if="!hasData" class="flex items-center justify-center text-cocoa-400 text-sm" :style="{ height: height + 'px' }">
      暂无数据
    </div>
    <div v-else class="relative" :style="{ height: height + 'px' }">
      <!-- 网格线 -->
      <div class="absolute inset-0 flex flex-col justify-between pointer-events-none">
        <div v-for="(g, i) in gridLines" :key="i" class="border-t border-cream-100 flex items-center">
          <span class="text-[9px] text-cocoa-300 -mt-1 -ml-1 w-8 text-right pr-1">{{ g }}</span>
        </div>
      </div>
      <!-- 柱状图 -->
      <div class="relative flex items-end gap-3 h-full pl-8">
        <div v-for="(b, i) in bars" :key="i" class="flex-1 flex flex-col items-center gap-1" style="min-width:0">
          <span class="text-xs text-cocoa-700 font-semibold">{{ b.value }}</span>
          <div
            class="w-full rounded-t-lg transition-all duration-500"
            :style="{ background: b.color, height: b.pct + '%', minHeight: b.value > 0 ? '8px' : '0', opacity: b.value > 0 ? 0.85 : 0.2 }"
          />
          <span class="text-xs text-cocoa-500 truncate w-full text-center leading-tight">{{ b.label }}</span>
        </div>
      </div>
    </div>
  </div>
</template>
