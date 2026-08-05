<script setup lang="ts">
import { computed, ref } from 'vue'

interface SliceData { label: string; value: number; color?: string }

const props = withDefaults(defineProps<{
  data: SliceData[]
  size?: number
  title?: string
  innerRadius?: number
}>(), { size: 180, innerRadius: 0 })

// 更鲜亮、现代的配色（按索引循环）
const palette = ['#22c55e', '#f43f5e', '#3b82f6', '#f59e0b', '#8b5cf6', '#06b6d4', '#84cc16', '#ec4899', '#14b8a6', '#f97316']

const total = computed(() => props.data.reduce((s, d) => s + d.value, 0))
const hovered = ref(-1)

// 由 innerRadius 推导环宽，并保证不溢出
const strokeWidth = computed(() => {
  const raw = (props.size / 2) * (1 - Math.min(0.85, Math.max(0, props.innerRadius)))
  return Math.min(Math.max(raw, 12), props.size / 2 - 4)
})
const radius = computed(() => props.size / 2 - strokeWidth.value / 2)
const circumference = computed(() => 2 * Math.PI * radius.value)

// 段间留白（相对周长），形成清晰缝隙
const gapLen = computed(() => circumference.value * 0.012)

const segments = computed(() => {
  const C = circumference.value
  const n = props.data.length || 1
  const usable = C - gapLen.value * n
  let acc = 0
  return props.data.map((d, i) => {
    const ratio = total.value ? d.value / total.value : 0
    const len = ratio * usable
    const start = acc
    acc += len + gapLen.value
    const pct = total.value ? Math.round(ratio * 100) : 0
    return {
      ...d,
      color: d.color || palette[i % palette.length],
      len,
      dashOffset: C - start, // 经典环形定位：dashoffset = C - 起点弧长
      pct,
    }
  })
})
</script>

<template>
  <div class="bg-surface rounded-2xl p-5 shadow-softer">
    <div v-if="title" class="text-sm font-semibold text-cocoa-700 mb-3">{{ title }}</div>
    <div class="flex items-center gap-5">
      <!-- 环形图 -->
      <div class="relative shrink-0 pie-wrap" :style="{ width: size + 'px', height: size + 'px' }">
        <svg :width="size" :height="size" :viewBox="`0 0 ${size} ${size}`" class="block">
          <defs>
            <filter id="pieShadow" x="-30%" y="-30%" width="160%" height="160%">
              <feDropShadow dx="0" dy="4" stdDeviation="5" flood-color="#7c5c3e" flood-opacity="0.18" />
            </filter>
          </defs>
          <g v-if="total > 0" :transform="`rotate(-90 ${size / 2} ${size / 2})`">
            <circle
              v-for="(s, i) in segments"
              :key="i"
              :cx="size / 2"
              :cy="size / 2"
              :r="radius"
              fill="none"
              :stroke="s.color"
              :stroke-width="hovered === -1 || hovered === i ? strokeWidth : strokeWidth * 0.78"
              :stroke-dasharray="`${s.len} ${circumference - s.len}`"
              :stroke-dashoffset="s.dashOffset"
              class="pie-seg"
              :class="{ dim: hovered !== -1 && hovered !== i }"
              @mouseenter="hovered = i"
              @mouseleave="hovered = -1"
            />
          </g>
          <!-- 无数据占位 -->
          <circle v-else :cx="size / 2" :cy="size / 2" :r="radius" fill="none" stroke="#f1ece3" :stroke-width="strokeWidth" />
        </svg>
        <!-- 中心信息 -->
        <div v-if="total > 0" class="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <span class="text-3xl font-extrabold leading-none" style="color:#7c5c3e">{{ total }}</span>
          <span class="text-[11px] text-cocoa-400 mt-1">总计</span>
        </div>
      </div>

      <!-- 卡片式图例 -->
      <div class="flex-1 space-y-1.5 min-w-0">
        <div
          v-for="(s, i) in segments"
          :key="i"
          class="flex items-center gap-2 px-2.5 py-1.5 rounded-lg cursor-default transition-colors"
          :class="hovered === i ? 'bg-cream-200/80' : 'hover:bg-cream-200/50'"
          @mouseenter="hovered = i"
          @mouseleave="hovered = -1"
        >
          <span class="w-3 h-3 rounded-full shrink-0 ring-2 ring-white" :style="{ background: s.color }" />
          <span class="text-cocoa-700 text-sm truncate flex-1">{{ s.label }}</span>
          <!-- 迷你占比条（醒目的分布直观展示） -->
          <span class="hidden sm:block w-16 h-1.5 rounded-full bg-cream-200 overflow-hidden shrink-0">
            <span class="block h-full rounded-full transition-all" :style="{ width: s.pct + '%', background: s.color }" />
          </span>
          <span class="text-cocoa-700 font-semibold text-sm w-10 text-right tabular-nums">{{ s.value }}</span>
          <span class="text-cocoa-400 text-xs w-10 text-right tabular-nums">{{ s.pct }}%</span>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.pie-wrap { animation: pieFade 0.5s ease both; }
.pie-seg {
  transition: stroke-width 0.18s ease, opacity 0.18s ease;
  cursor: pointer;
}
.pie-seg.dim { opacity: 0.35; }
@keyframes pieFade {
  from { opacity: 0; transform: scale(0.92); }
  to { opacity: 1; transform: scale(1); }
}
</style>
