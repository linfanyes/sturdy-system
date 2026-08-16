<script setup lang="ts">
/**
 * 生长图标系统 —— 「生长花园」设计语言的核心载体
 *
 * 4 态生长隐喻（种子→萌芽→含苞→盛放）作为进度/等级/成长的统一视觉语言，
 * 辅以一组功能线性图标，统一 1.75px 线宽、圆头线帽、currentColor 继承主题色。
 * Web 与小程序共享同一套 SVG path 源，保证多端品牌一致。
 */
import { computed } from 'vue'

type GrowthStage = 'seed' | 'sprout' | 'bud' | 'bloom'
type FunctionalName =
  | 'classes' | 'students' | 'chart' | 'tools' | 'msg' | 'ai'
  | 'bell' | 'clock' | 'check' | 'spark' | 'book' | 'flame' | 'send'
  | 'user' | 'lock' | 'dashboard' | 'config'

type IconName = GrowthStage | FunctionalName

const props = withDefaults(defineProps<{
  name: IconName
  size?: number | string
  stroke?: string
}>(), {
  size: 24,
  stroke: 'currentColor',
})

interface IconDef { paths: string[]; fills?: string[] }

const GROWTH: Record<GrowthStage, IconDef> = {
  seed: { paths: ['M12 21c0-4 0-7 0-9', 'M12 8c0-3 2-5 5-5 0 3-2 5-5 5z'] },
  sprout: { paths: ['M12 21V11', 'M12 13c0-3-2-5-5-5 0 3 2 5 5 5z', 'M12 11c0-2 1.5-4 4-4 0 2-1.5 4-4 4z'] },
  bud: { paths: ['M12 21V12', 'M12 13c-2.5-1-4-3-4-6 2.5 0 4 2 4 6z', 'M12 13c2.5-1 4-3 4-6-2.5 0-4 2-4 6z'], fills: ['M12 9m-1.6 0a1.6 1.6 0 1 0 3.2 0a1.6 1.6 0 1 0-3.2 0'] },
  bloom: {
    paths: ['M12 15V21', 'M12 6.5a2.2 3.2 0 1 0 0.01 0z', 'M12 17.5a2.2 3.2 0 1 0 0.01 0z', 'M6.5 12a3.2 2.2 0 1 0 0.01 0z', 'M17.5 12a3.2 2.2 0 1 0 0.01 0z'],
    fills: ['M12 12m-2.4 0a2.4 2.4 0 1 0 4.8 0a2.4 2.4 0 1 0-4.8 0z'],
  },
}

const FUNCTIONAL: Record<FunctionalName, IconDef> = {
  classes: { paths: ['M3 21h18', 'M5 21V7l8-4v18', 'M19 21V11l-6-3', 'M9 9v0M9 12v0M9 15v0'] },
  students: { paths: ['M22 10L12 5 2 10l10 5 10-5z', 'M6 12v5c3 2 9 2 12 0v-5', 'M22 10v6'] },
  chart: { paths: ['M3 3v18h18', 'M7 14l3-3 3 3 5-6'] },
  tools: { paths: ['M14.7 6.3a4 4 0 015.66 5.66l-9.9 9.9-4.24.7.7-4.24z'] },
  msg: { paths: ['M21 11.5a8.5 8.5 0 01-12.8 7.4L3 21l2.1-5.2A8.5 8.5 0 1121 11.5z'] },
  ai: { paths: ['M4 4h16v16H4z', 'M9 9h6v6H9z'] },
  bell: { paths: ['M18 8a6 6 0 10-12 0c0 7-3 9-3 9h18s-3-2-3-9', 'M13.7 21a2 2 0 01-3.4 0'] },
  clock: { paths: ['M12 3a9 9 0 100 18 9 9 0 000-18z', 'M12 7v5l3 2'] },
  check: { paths: ['M20 6L9 17l-5-5'] },
  spark: { paths: ['M12 3v4M12 17v4M3 12h4M17 12h4M5.6 5.6l2.8 2.8M15.6 15.6l2.8 2.8M18.4 5.6l-2.8 2.8M8.4 15.6l-2.8 2.8'] },
  book: { paths: ['M4 19.5A2.5 2.5 0 016.5 17H20V3H6.5A2.5 2.5 0 004 5.5z', 'M4 19.5V21h16'] },
  flame: { paths: ['M12 2c1 4 5 5 5 10a5 5 0 01-10 0c0-2 1-3 2-4 0 2 1 3 2 3 0-3-1-5 1-9z'] },
  send: { paths: ['M22 2L11 13', 'M22 2l-7 20-4-9-9-4z'] },
  user: { paths: ['M12 4a4 4 0 100 8 4 4 0 000-8z', 'M4 21c0-4 4-6 8-6s8 2 8 6'] },
  lock: { paths: ['M4 11h16v10H4z', 'M8 11V7a4 4 0 018 0v4'] },
  dashboard: { paths: ['M3 3h7v9H3z', 'M14 3h7v5h-7z', 'M14 12h7v9h-7z', 'M3 16h7v5H3z'] },
  config: { paths: ['M12 9a3 3 0 100 6 3 3 0 000-6z', 'M19.4 15a1.6 1.6 0 00.3 1.8l.1.1a2 2 0 11-2.8 2.8l-.1-.1a1.6 1.6 0 00-1.8-.3 1.6 1.6 0 00-1 1.5V21a2 2 0 11-4 0v-.1a1.6 1.6 0 00-1-1.5 1.6 1.6 0 00-1.8.3l-.1.1a2 2 0 11-2.8-2.8l.1-.1a1.6 1.6 0 00.3-1.8 1.6 1.6 0 00-1.5-1H3a2 2 0 110-4h.1a1.6 1.6 0 001.5-1 1.6 1.6 0 00-.3-1.8l-.1-.1a2 2 0 112.8-2.8l.1.1a1.6 1.6 0 001.8.3H9a1.6 1.6 0 001-1.5V3a2 2 0 114 0v.1a1.6 1.6 0 001 1.5 1.6 1.6 0 001.8-.3l.1-.1a2 2 0 112.8 2.8l-.1.1a1.6 1.6 0 00-.3 1.8V9a1.6 1.6 0 001.5 1H21a2 2 0 110 4h-.1a1.6 1.6 0 00-1.5 1z'] },
}

const iconDef = computed<IconDef>(() => GROWTH[props.name as GrowthStage] ?? FUNCTIONAL[props.name as FunctionalName] ?? { paths: [] })
const sizeStr = computed(() => typeof props.size === 'number' ? `${props.size}` : props.size)
</script>

<template>
  <svg
    :width="sizeStr"
    :height="sizeStr"
    viewBox="0 0 24 24"
    fill="none"
    :stroke="stroke"
    stroke-width="1.75"
    stroke-linecap="round"
    stroke-linejoin="round"
    aria-hidden="true"
  >
    <path v-for="(d, i) in iconDef.paths" :key="`p${i}`" :d="d" />
    <path v-for="(d, i) in iconDef.fills" :key="`f${i}`" :d="d" :fill="stroke" stroke="none" />
  </svg>
</template>
