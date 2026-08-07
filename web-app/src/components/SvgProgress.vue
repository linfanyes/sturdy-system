<script setup lang="ts">
import { computed } from 'vue'

interface ProgressItem { label: string; value: number; total?: number | null; color?: string }

const props = withDefaults(defineProps<{
  data: ProgressItem[]
  title?: string
  showPercent?: boolean
}>(), { showPercent: true })

const colors = ['#e6a23c', '#67c23a', '#409eff', '#e06c75', '#8e7cc3', '#40c9c6', '#ff9800', '#2196f3']

const items = computed(() => props.data.map((d, i) => {
  const total = d.total ?? 0
  return {
    ...d,
    color: d.color || colors[i % colors.length],
    pct: total > 0 ? Math.min((d.value / total) * 100, 100) : 0,
    hasTotal: total > 0,
  }
}))
</script>

<template>
  <div class="bg-surface rounded-2xl p-5 shadow-softer">
    <div v-if="title" class="text-sm font-semibold text-cocoa-700 mb-3">{{ title }}</div>
    <div class="space-y-3">
      <div v-for="(it, i) in items" :key="i">
        <div class="flex items-center justify-between text-xs mb-1">
          <span class="text-cocoa-700 font-medium truncate flex-1">{{ it.label }}</span>
          <span class="text-cocoa-500 tabular-nums">
            {{ it.value }}<template v-if="showPercent && it.hasTotal"> / {{ it.total }} ({{ Math.round(it.pct) }}%)</template>
          </span>
        </div>
        <div class="h-2 bg-cream-100 rounded-full overflow-hidden">
          <div
            class="h-full rounded-full transition-all duration-700 ease-out"
            :style="{ width: it.pct + '%', background: it.color }"
          />
        </div>
      </div>
    </div>
  </div>
</template>