<script setup lang="ts">
import { computed } from 'vue'

interface SliceData { label: string; value: number; color?: string }

const props = withDefaults(defineProps<{
  data: SliceData[]
  size?: number
  title?: string
  innerRadius?: number
}>(), { size: 180, innerRadius: 0 })

const colors = ['#e6a23c', '#67c23a', '#409eff', '#e06c75', '#8e7cc3', '#40c9c6', '#ff9800', '#2196f3', '#4caf50', '#ff5722']

const total = computed(() => props.data.reduce((s, d) => s + d.value, 0))

const slices = computed(() => {
  const r = props.size / 2
  const cx = r; const cy = r
  const ir = props.innerRadius * r
  let startAngle = -Math.PI / 2

  return props.data.map((d, i) => {
    const sliceAngle = (d.value / total.value) * Math.PI * 2
    const endAngle = startAngle + sliceAngle
    const path = describeArc(cx, cy, r, startAngle, endAngle, ir)
    const mid = (startAngle + endAngle) / 2
    const labelR = (r + ir) / 2
    const lx = cx + labelR * Math.cos(mid) / (ir > 0 ? 1 : 1.3)
    const ly = cy + labelR * Math.sin(mid) / (ir > 0 ? 1 : 1.3)
    const pct = total.value ? Math.round((d.value / total.value) * 100) : 0
    startAngle = endAngle
    return { ...d, color: d.color || colors[i % colors.length], path, pct, lx, ly }
  })
})

function polarToCartesian(cx: number, cy: number, r: number, angle: number) {
  return { x: cx + r * Math.cos(angle), y: cy + r * Math.sin(angle) }
}

function describeArc(cx: number, cy: number, r: number, sa: number, ea: number, ir: number = 0) {
  if (!isFinite(sa) || !isFinite(ea) || !isFinite(r) || !isFinite(cx) || !isFinite(cy)) return ''
  const outerStart = polarToCartesian(cx, cy, r, sa)
  const outerEnd = polarToCartesian(cx, cy, r, ea)
  const largeArc = ea - sa > Math.PI ? 1 : 0

  if (ir > 0) {
    const innerStart = polarToCartesian(cx, cy, ir, sa)
    const innerEnd = polarToCartesian(cx, cy, ir, ea)
    return `M ${outerStart.x} ${outerStart.y} A ${r} ${r} 0 ${largeArc} 1 ${outerEnd.x} ${outerEnd.y} L ${innerEnd.x} ${innerEnd.y} A ${ir} ${ir} 0 ${largeArc} 0 ${innerStart.x} ${innerStart.y} Z`
  }
  return `M ${outerStart.x} ${outerStart.y} A ${r} ${r} 0 ${largeArc} 1 ${outerEnd.x} ${outerEnd.y} L ${cx} ${cy} Z`
}
</script>

<template>
  <div class="bg-white rounded-2xl p-5 shadow-softer">
    <div v-if="title" class="text-sm font-semibold text-cocoa-700 mb-3">{{ title }}</div>
    <div class="flex items-center gap-4">
      <svg :width="size" :height="size" :viewBox="`0 0 ${size} ${size}`" class="shrink-0">
        <template v-if="total > 0">
          <path v-for="(s, i) in slices" :key="i" :d="s.path" :fill="s.color" stroke="#fff" stroke-width="1.5" />
          <text :x="size/2" :y="size/2+5" text-anchor="middle" class="text-xs font-bold fill-cocoa-700">{{ total }}</text>
        </template>
        <circle v-else :cx="size/2" :cy="size/2" :r="size/2 - 2" fill="#f0e6d3" />
      </svg>
      <div class="flex-1 space-y-1.5 min-w-0">
        <div v-for="(s, i) in slices" :key="i" class="flex items-center gap-2 text-xs">
          <span class="w-3 h-3 rounded-sm shrink-0" :style="{ background: s.color }" />
          <span class="text-cocoa-600 truncate flex-1">{{ s.label }}</span>
          <span class="text-cocoa-400 font-mono">{{ s.value }} ({{ s.pct }}%)</span>
        </div>
      </div>
    </div>
  </div>
</template>
