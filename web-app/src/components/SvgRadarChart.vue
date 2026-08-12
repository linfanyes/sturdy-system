<script setup lang="ts">
import { computed } from 'vue'

interface RadarData { label: string; value: number }

const props = withDefaults(defineProps<{
  data: RadarData[]
  height?: number
  title?: string
  maxScore?: number
}>(), { height: 240, maxScore: 100 })

const size = computed(() => Math.min(props.height, 320))
const cx = computed(() => size.value / 2)
const cy = computed(() => size.value / 2)
const radius = computed(() => size.value / 2 - 28)

const levels = computed(() => [0.25, 0.5, 0.75, 1].map((r) => r * radius.value))

const points = computed(() => {
  if (!props.data.length) return ''
  const n = props.data.length
  return props.data.map((d, i) => {
    const angle = -Math.PI / 2 + (i * 2 * Math.PI) / n
    const ratio = Math.min(Math.max(d.value / (props.maxScore || 100), 0), 1)
    const r = radius.value * ratio
    const x = cx.value + r * Math.cos(angle)
    const y = cy.value + r * Math.sin(angle)
    return `${x.toFixed(2)},${y.toFixed(2)}`
  }).join(' ')
})

const axisPoints = computed(() => {
  const n = props.data.length || 3
  return Array.from({ length: n }, (_, i) => {
    const angle = -Math.PI / 2 + (i * 2 * Math.PI) / n
    const x = cx.value + radius.value * Math.cos(angle)
    const y = cy.value + radius.value * Math.sin(angle)
    return { x, y }
  })
})

const labelPositions = computed(() => {
  const n = props.data.length || 3
  return props.data.map((d, i) => {
    const angle = -Math.PI / 2 + (i * 2 * Math.PI) / n
    const lr = radius.value + 18
    const x = cx.value + lr * Math.cos(angle)
    const y = cy.value + lr * Math.sin(angle)
    return { label: d.label, value: d.value, x, y }
  })
})
</script>

<template>
  <div class="w-full">
    <div v-if="title" class="text-sm font-semibold text-cocoa-700 mb-2">{{ title }}</div>
    <div v-if="!data.length" class="flex items-center justify-center text-cocoa-400 text-sm" :style="{ height: height + 'px' }">
      暂无数据
    </div>
    <svg v-else :viewBox="`0 0 ${size} ${size}`" :style="{ height: height + 'px' }" class="w-full">
      <!-- 背景层级 -->
      <polygon
        v-for="(lv, idx) in levels"
        :key="idx"
        :points="axisPoints.map((_, i) => {
          const a = -Math.PI / 2 + (i * 2 * Math.PI) / axisPoints.length
          return `${(cx + lv * Math.cos(a)).toFixed(2)},${(cy + lv * Math.sin(a)).toFixed(2)}`
        }).join(' ')"
        fill="#fdf6ec"
        stroke="#f0e4c8"
        stroke-width="1"
      />
      <!-- 轴线 -->
      <line
        v-for="(p, i) in axisPoints"
        :key="'axis-' + i"
        :x1="cx"
        :y1="cy"
        :x2="p.x"
        :y2="p.y"
        stroke="#e8dcc0"
        stroke-width="1"
      />
      <!-- 数据多边形 -->
      <polygon :points="points" fill="rgba(245, 179, 66, 0.25)" stroke="#f5b342" stroke-width="2" />
      <!-- 数据点 -->
      <circle
        v-for="(p, i) in points.split(' ')"
        :key="'dot-' + i"
        :cx="Number(p.split(',')[0])"
        :cy="Number(p.split(',')[1])"
        r="3"
        fill="#f5b342"
      />
      <!-- 标签 -->
      <g v-for="(lp, i) in labelPositions" :key="'lbl-' + i">
        <text
          :x="lp.x"
          :y="lp.y"
          text-anchor="middle"
          dominant-baseline="middle"
          font-size="11"
          fill="#8b7355"
        >{{ lp.label }}</text>
        <text
          :x="lp.x"
          :y="lp.y + 13"
          text-anchor="middle"
          font-size="10"
          fill="#b98f3e"
          font-weight="600"
        >{{ lp.value }}</text>
      </g>
    </svg>
  </div>
</template>
