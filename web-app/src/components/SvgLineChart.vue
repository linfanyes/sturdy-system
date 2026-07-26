<script setup lang="ts">
import { computed } from 'vue'

interface LinePoint { label: string; value: number; value2?: number }

const props = withDefaults(defineProps<{
  data: LinePoint[]
  height?: number
  title?: string
  series2Name?: string
  series1Name?: string
  color?: string
  color2?: string
}>(), { height: 180, series1Name: '数量', color: '#e6a23c', color2: '#409eff' })

const maxVal = computed(() => {
  let max = 0
  for (const d of props.data) {
    if (d.value > max) max = d.value
    if (d.value2 && d.value2 > max) max = d.value2
  }
  return Math.max(max, 1)
})

const padding = { top: 20, right: 20, bottom: 30, left: 32 }
const W = 320
const H = computed(() => props.height)

const points1 = computed<{x:number;y:number;label:string;value:number}[]>(() => {
  const innerW = W - padding.left - padding.right
  const innerH = H.value - padding.top - padding.bottom
  if (!props.data.length) return []
  const stepX = innerW / Math.max(props.data.length - 1, 1)
  return props.data.map((d, i) => ({
    x: padding.left + i * stepX,
    y: padding.top + innerH - (d.value / maxVal.value) * innerH,
    label: d.label,
    value: d.value,
  }))
})

const points2 = computed<{x:number;y:number;label:string;value:number}[]>(() => {
  const innerW = W - padding.left - padding.right
  const innerH = H.value - padding.top - padding.bottom
  if (!props.data.length) return []
  const stepX = innerW / Math.max(props.data.length - 1, 1)
  return props.data.map((d, i) => ({
    x: padding.left + i * stepX,
    y: padding.top + innerH - ((d.value2 || 0) / maxVal.value) * innerH,
    label: d.label,
    value: d.value2 || 0,
  }))
})

const path1 = computed(() => points1.value.map((p, i) => (i === 0 ? `M ${p.x} ${p.y}` : `L ${p.x} ${p.y}`)).join(' '))
const path2 = computed(() => points2.value.map((p, i) => (i === 0 ? `M ${p.x} ${p.y}` : `L ${p.x} ${p.y}`)).join(' '))
const area1 = computed(() => {
  const pts = points1.value
  if (!pts.length) return ''
  const bottom = padding.top + (H.value - padding.top - padding.bottom)
  return path1.value + ` L ${pts[pts.length - 1].x} ${bottom} L ${pts[0].x} ${bottom} Z`
})

const xAxisLabels = computed(() => {
  if (!props.data.length) return []
  const innerW = W - padding.left - padding.right
  const stepX = innerW / Math.max(props.data.length - 1, 1)
  return props.data.map((d, i) => ({
    x: padding.left + i * stepX,
    label: d.label,
  }))
})
</script>

<template>
  <div class="bg-white rounded-2xl p-5 shadow-softer">
    <div v-if="title" class="flex items-center justify-between mb-3">
      <div class="text-sm font-semibold text-cocoa-700">{{ title }}</div>
      <div v-if="data[0]?.value2 !== undefined" class="flex items-center gap-3 text-xs text-cocoa-500">
        <div class="flex items-center gap-1">
          <div class="w-2.5 h-2.5 rounded-full" :style="{ background: color }"></div>
          <span>{{ series1Name }}</span>
        </div>
        <div class="flex items-center gap-1">
          <div class="w-2.5 h-2.5 rounded-full" :style="{ background: color2 }"></div>
          <span>{{ series2Name }}</span>
        </div>
      </div>
    </div>
    <svg :viewBox="`0 0 ${W} ${H}`" :style="{ height: H + 'px', width: '100%' }" class="overflow-visible">
      <defs>
        <linearGradient :id="`line1-grad-${(Math.random()*1e9)|0}`" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" :stop-color="color" stop-opacity="0.35" />
          <stop offset="100%" :stop-color="color" stop-opacity="0" />
        </linearGradient>
      </defs>

      <!-- 网格线 -->
      <g class="text-cocoa-200">
        <line v-for="i in 4" :key="i"
          :x1="padding.left" :x2="W - padding.right"
          :y1="padding.top + ((H - padding.top - padding.bottom) / 4) * (i - 1)"
          :y2="padding.top + ((H - padding.top - padding.bottom) / 4) * (i - 1)"
          stroke="currentColor" stroke-width="1" stroke-dasharray="3 3" />
      </g>

      <!-- X 轴标签 -->
      <g class="text-[10px] fill-cocoa-400">
        <text v-for="(t, i) in xAxisLabels" :key="i"
          :x="t.x" :y="H - 8" text-anchor="middle">{{ t.label }}</text>
      </g>

      <!-- Y 轴最大值标签 -->
      <g class="text-[10px] fill-cocoa-400">
        <text :x="padding.left - 4" :y="padding.top + 4" text-anchor="end">{{ maxVal }}</text>
      </g>

      <!-- 系列2填充/折线 -->
      <template v-if="data[0]?.value2 !== undefined">
        <path :d="path2" fill="none" :stroke="color2" stroke-width="2"
          stroke-linecap="round" stroke-linejoin="round" stroke-dasharray="4 3" />
        <circle v-for="(p, i) in points2" :key="`p2-${i}`" :cx="p.x" :cy="p.y" r="3" :fill="color2" />
      </template>

      <!-- 系列1填充/折线 -->
      <path :d="area1" :fill="`url(#line1-grad-${(Math.random()*1e9)|0})`" />
      <path :d="path1" fill="none" :stroke="color" stroke-width="2.5"
        stroke-linecap="round" stroke-linejoin="round" />
      <circle v-for="(p, i) in points1" :key="`p1-${i}`" :cx="p.x" :cy="p.y" r="4" fill="white" :stroke="color" stroke-width="2" />

      <!-- Hover tooltip values -->
      <g class="text-[10px] fill-cocoa-600 font-medium">
        <text v-for="(p, i) in points1" :key="`v1-${i}`"
          :x="p.x" :y="p.y - 8" text-anchor="middle">{{ p.value }}</text>
      </g>
    </svg>
  </div>
</template>