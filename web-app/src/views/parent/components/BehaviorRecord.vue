<script setup lang="ts">
import { computed } from 'vue'
import { Scale } from 'lucide-vue-next'

interface BehaviorRecentItem {
  id: string
  behavior: string
  category: string
  note?: string | null
  date: string
}

interface BehaviorByMonth {
  month: string
  count: number
}

interface BehaviorSummary {
  praise: number
  violation: number
  other: number
}

interface BehaviorData {
  summary: BehaviorSummary
  byMonth: BehaviorByMonth[]
  recent: BehaviorRecentItem[]
}

const COLOR = { green: '#07c160', red: '#f56c6c', amber: '#E6A23C' }
const CATEGORY_COLOR: Record<string, string> = { praise: COLOR.green, violation: COLOR.red, other: COLOR.amber }

const props = defineProps<{
  loading: boolean
  behavior: BehaviorData | null
}>()

const behaviorChips = computed(() => {
  const s = props.behavior?.summary
  return [
    { label: '表扬', value: s ? s.praise : 0, color: COLOR.green, bg: 'bg-[#07c160]/10' },
    { label: '违纪', value: s ? s.violation : 0, color: COLOR.red, bg: 'bg-[#f56c6c]/10' },
    { label: '其他', value: s ? s.other : 0, color: COLOR.amber, bg: 'bg-[#E6A23C]/10' },
  ]
})

const behaviorByMonth = computed(() => {
  const list = (props.behavior?.byMonth || []) as BehaviorByMonth[]
  const max = Math.max(1, ...list.map((m) => m.count))
  return list.map((m) => ({ ...m, pct: Math.round((m.count / max) * 100), isMax: m.count === max }))
})

const behaviorRecent = computed(() => props.behavior?.recent || [])
</script>

<template>
  <!-- 行为表现 -->
  <div v-if="!loading && behavior">
    <h2 class="section-title">
      <Scale class="w-5 h-5 text-mint-400" /> 行为表现
    </h2>
    <div class="quick-card">
      <!-- 汇总 chips -->
      <div class="grid grid-cols-3 gap-3 mb-4">
        <div v-for="c in behaviorChips" :key="c.label" class="rounded-xl p-3 flex flex-col items-center gap-1" :class="c.bg">
          <div class="text-2xl font-bold" :style="{ color: c.color }">{{ c.value }}</div>
          <div class="text-xs" :style="{ color: c.color }">{{ c.label }}</div>
        </div>
      </div>

      <!-- 近 6 月趋势 -->
      <div v-if="behaviorByMonth.length" class="mb-4">
        <div class="text-xs text-cocoa-500 mb-2">近 6 月趋势</div>
        <div class="space-y-1.5">
          <div v-for="m in behaviorByMonth" :key="m.month" class="flex items-center gap-2">
            <div class="text-xs text-cocoa-500 w-14 shrink-0">{{ m.month }}</div>
            <div class="flex-1 h-3 bg-cocoa-50 rounded-full overflow-hidden">
              <div class="h-full rounded-full" :style="{ width: Math.max(4, m.pct) + '%', background: m.isMax ? COLOR.green : '#c8e6c9' }"></div>
            </div>
            <div class="text-xs text-cocoa-500 w-10 text-right shrink-0">{{ m.count }}次</div>
          </div>
        </div>
      </div>

      <!-- 最近记录 -->
      <div v-if="behaviorRecent.length">
        <div class="text-xs text-cocoa-500 mb-2">最近记录</div>
        <div class="space-y-2">
          <div v-for="r in behaviorRecent.slice(0, 8)" :key="r.id" class="flex items-start gap-3">
            <span class="w-2.5 h-2.5 rounded-full mt-1.5 shrink-0" :style="{ background: CATEGORY_COLOR[r.category] || COLOR.amber }"></span>
            <div class="flex-1 min-w-0">
              <div class="text-sm text-cocoa-900 font-medium">{{ r.behavior }}</div>
              <div v-if="r.note" class="text-xs text-cocoa-500 truncate">{{ r.note }}</div>
            </div>
            <div class="text-xs text-cocoa-400 shrink-0">{{ r.date }}</div>
          </div>
        </div>
      </div>
      <div v-else class="text-sm text-cocoa-500">暂无行为记录</div>
    </div>
  </div>
</template>
