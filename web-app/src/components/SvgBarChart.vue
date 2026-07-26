<script setup lang="ts">
import { computed } from 'vue'

interface BarData { label: string; value: number; color?: string }

const props = withDefaults(defineProps<{
  data: BarData[]
  height?: number
  title?: string
}>(), { height: 180 })

const maxVal = computed(() => Math.max(...props.data.map(d => d.value), 1))
const colors = ['#e6a23c', '#67c23a', '#409eff', '#e06c75', '#8e7cc3', '#40c9c6', '#ff9800', '#2196f3']

const bars = computed(() => props.data.map((d, i) => ({
  ...d,
  color: d.color || colors[i % colors.length],
  pct: (d.value / maxVal.value) * 100,
})))
</script>

<template>
  <div class="bg-white rounded-2xl p-5 shadow-softer">
    <div v-if="title" class="text-sm font-semibold text-cocoa-700 mb-3">{{ title }}</div>
    <div class="flex items-end gap-2" :style="{ height: height + 'px' }">
      <div v-for="(b, i) in bars" :key="i" class="flex-1 flex flex-col items-center gap-1" style="min-width:0">
        <span class="text-[10px] text-cocoa-500 font-medium">{{ b.value }}</span>
        <div
          class="w-full rounded-t-md transition-all duration-500"
          :style="{ background: b.color, height: Math.max(b.pct * 0.8, 4) + '%', opacity: b.pct > 0 ? 1 : 0.3 }"
        />
        <span class="text-[10px] text-cocoa-400 truncate w-full text-center leading-tight">{{ b.label }}</span>
      </div>
    </div>
  </div>
</template>
