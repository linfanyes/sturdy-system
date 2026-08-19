<script setup lang="ts">
import { computed, ref, onMounted } from 'vue'

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

const mounted = ref(false)
onMounted(() => { mounted.value = true })

const maxVal = computed(() => {
  let max = 0
  for (const d of props.data) {
    if (d.value > max) max = d.value
    if (d.value2 && d.value2 > max) max = d.value2
  }
  return Math.max(max, 1)
})

// 宽度根据数据点数量自适应：每点至少 28px，保证 30 天趋势可读
const W = computed(() => {
  const perPoint = 28
  const minW = 320
  const calcW = props.data.length * perPoint + 80
  return Math.max(minW, calcW)
})

const padding = { top: 20, right: 20, bottom: 30, left: 32 }
const H = computed(() => props.height)

const points1 = computed<{x:number;y:number;label:string;value:number}[]>(() => {
  const innerW = W.value - padding.left - padding.right
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
  const innerW = W.value - padding.left - padding.right
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

// X 轴标签抽稀：数据点 > 10 时，每隔 N 个显示一个，避免重叠
const xLabels = computed(() => {
  if (!props.data.length) return []
  const innerW = W.value - padding.left - padding.right
  const stepX = innerW / Math.max(props.data.length - 1, 1)
  const total = props.data.length
  // 目标最多显示约 8 个标签
  const interval = total > 8 ? Math.ceil(total / 8) : 1
  const result: { x: number; label: string }[] = []
  for (let i = 0; i < total; i++) {
    // 始终显示首尾，其余按间隔显示
    if (i === 0 || i === total - 1 || i % interval === 0) {
      result.push({ x: padding.left + i * stepX, label: props.data[i].label })
    }
  }
  return result
})

// 数值标签抽稀：数据点 > 10 时，仅显示首尾和每隔 N 个的值，避免重叠
const valueLabels = computed(() => {
  const total = points1.value.length
  if (total <= 10) return points1.value
  const interval = Math.ceil(total / 8)
  const result = []
  for (let i = 0; i < total; i++) {
    if (i === 0 || i === total - 1 || i % interval === 0) {
      result.push(points1.value[i])
    }
  }
  return result
})

// 唯一渐变 ID（避免多实例冲突）
const gradId = computed(() => `line1-grad-${Math.random().toString(36).slice(2, 9)}`)
const gradId2 = computed(() => `line2-grad-${Math.random().toString(36).slice(2, 9)}`)

// 折线动画路径长度
const pathLength = computed(() => {
  const pts = points1.value
  if (pts.length < 2) return 0
  let len = 0
  for (let i = 1; i < pts.length; i++) {
    const dx = pts[i].x - pts[i-1].x
    const dy = pts[i].y - pts[i-1].y
    len += Math.sqrt(dx*dx + dy*dy)
  }
  return len
})
</script>

<template>
  <div class="bg-surface rounded-2xl p-5 shadow-softer">
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
    <div class="overflow-x-auto">
      <svg :viewBox="`0 0 ${W} ${H}`" :style="{ height: H + 'px', width: W + 'px', minWidth: '100%' }" class="overflow-visible">
        <defs>
          <linearGradient :id="gradId" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" :stop-color="color" stop-opacity="0.35" />
            <stop offset="100%" :stop-color="color" stop-opacity="0" />
          </linearGradient>
          <linearGradient :id="gradId2" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" :stop-color="color2" stop-opacity="0.25" />
            <stop offset="100%" :stop-color="color2" stop-opacity="0" />
          </linearGradient>
          <!-- 折线绘制动画滤镜 -->
          <filter id="glow">
            <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
            <feMerge>
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
        </defs>

        <!-- 网格线 -->
        <g class="text-cocoa-200">
          <line v-for="i in 4" :key="i"
            :x1="padding.left" :x2="W - padding.right"
            :y1="padding.top + ((H - padding.top - padding.bottom) / 4) * (i - 1)"
            :y2="padding.top + ((H - padding.top - padding.bottom) / 4) * (i - 1)"
            stroke="currentColor" stroke-width="1" stroke-dasharray="3 3">
            <animate attributeName="opacity" from="0" to="1" dur="0.6s" fill="freeze" />
          </line>
        </g>

        <!-- X 轴标签（抽稀） -->
        <g class="text-[10px] fill-cocoa-400">
          <text v-for="(t, i) in xLabels" :key="i"
            :x="t.x" :y="H - 8" text-anchor="middle"
            :style="{ opacity: mounted ? 1 : 0, transition: 'opacity 0.5s', transitionDelay: `${i * 50}ms` }">
            {{ t.label }}
          </text>
        </g>

        <!-- Y 轴最大值标签 -->
        <g class="text-[10px] fill-cocoa-400">
          <text :x="padding.left - 4" :y="padding.top + 4" text-anchor="end"
            :style="{ opacity: mounted ? 1 : 0, transition: 'opacity 0.5s' }">
            {{ maxVal }}
          </text>
        </g>

        <!-- 系列2填充/折线 -->
        <template v-if="data[0]?.value2 !== undefined">
          <path :d="area1" :fill="`url(#${gradId2})`" :style="{ opacity: mounted ? 1 : 0, transition: 'opacity 0.8s' }" />
          <path :d="path2" fill="none" :stroke="color2" stroke-width="2"
            stroke-linecap="round" stroke-linejoin="round" stroke-dasharray="4 3"
            :style="{ strokeDashoffset: mounted ? 0 : pathLength, transition: 'stroke-dashoffset 1s ease-out' }" />
          <circle v-for="(p, i) in points2" :key="`p2-${i}`" :cx="p.x" :cy="p.y" r="3" :fill="color2"
            :style="{ opacity: mounted ? 1 : 0, transition: 'opacity 0.3s', transitionDelay: `${i * 80}ms` }" />
        </template>

        <!-- 系列1填充/折线 -->
        <path :d="area1" :fill="`url(#${gradId})`"
          :style="{ opacity: mounted ? 1 : 0, transition: 'opacity 1s ease-out' }" />
        <path :d="path1" fill="none" :stroke="color" stroke-width="2.5"
          stroke-linecap="round" stroke-linejoin="round"
          :stroke-dasharray="pathLength"
          :stroke-dashoffset="mounted ? 0 : pathLength"
          :style="{ transition: 'stroke-dashoffset 1.2s cubic-bezier(0.4, 0, 0.2, 1)' }" />
        <circle v-for="(p, i) in points1" :key="`p1-${i}`" :cx="p.x" :cy="p.y" r="4" fill="white" :stroke="color" stroke-width="2"
          :style="{ opacity: mounted ? 1 : 0, transform: mounted ? 'scale(1)' : 'scale(0)', transformOrigin: `${p.x}px ${p.y}px`, transition: 'all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)', transitionDelay: `${i * 80}ms` }" />

        <!-- 数值标签（抽稀，避免重叠） -->
        <g class="text-[10px] fill-cocoa-600 font-medium">
          <text v-for="(p, i) in valueLabels" :key="`v1-${i}`"
            :x="p.x" :y="p.y - 8" text-anchor="middle"
            :style="{ opacity: mounted ? 1 : 0, transition: 'opacity 0.4s', transitionDelay: `${i * 100 + 300}ms` }">
            {{ p.value }}
          </text>
        </g>
      </svg>
    </div>
  </div>
</template>
