<script setup lang="ts">
import { computed } from 'vue'
import { Sparkles, Bell, ChevronRight, ClipboardList, TrendingUp, TrendingDown } from 'lucide-vue-next'

const props = defineProps<{
  showNoticesSection: boolean
  showHomeworkSection: boolean
  showScoresSection: boolean
  pendingNotices: number
  pendingHomework: number
  latestPct: number | null
  pctDelta: number | null
  latestExam: any
  rankDelta: number | null
}>()

const emit = defineEmits<{
  clickNotice: []
  clickHomework: []
  clickExamCount: []
  clickRank: []
}>()
</script>

<template>
  <!-- 概览卡片 -->
  <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
    <div v-if="showNoticesSection" class="stat-card cursor-pointer hover:shadow-lg hover:-translate-y-0.5 transition-all" @click="emit('clickNotice')">
      <div class="flex items-center gap-2 text-sm text-cocoa-500 mb-1"><Bell class="w-4 h-4 text-sakura-500" /> 待读通知</div>
      <div class="text-3xl font-bold text-cocoa-900">{{ pendingNotices }}</div>
      <div class="text-xs text-sakura-400 mt-1 flex items-center gap-0.5">查看通知 <ChevronRight class="w-3 h-3" /></div>
    </div>
    <div v-if="showHomeworkSection" class="stat-card cursor-pointer hover:shadow-lg hover:-translate-y-0.5 transition-all" @click="emit('clickHomework')">
      <div class="flex items-center gap-2 text-sm text-cocoa-500 mb-1"><ClipboardList class="w-4 h-4 text-butter-500" /> 待完成作业</div>
      <div class="text-3xl font-bold text-cocoa-900">{{ pendingHomework }}</div>
      <div class="text-xs text-butter-500 mt-1 flex items-center gap-0.5">查看作业 <ChevronRight class="w-3 h-3" /></div>
    </div>
    <div v-if="showScoresSection" class="stat-card cursor-pointer hover:shadow-lg hover:-translate-y-0.5 transition-all" @click="emit('clickExamCount')">
      <div class="flex items-center gap-2 text-sm text-cocoa-500 mb-1"><Sparkles class="w-4 h-4 text-mint-500" /> 最近考试</div>
      <div class="text-3xl font-bold text-cocoa-900">
        <template v-if="latestPct != null">{{ latestPct }}<span class="text-base font-semibold text-cocoa-400">%</span></template>
        <template v-else>--</template>
      </div>
      <div class="text-xs mt-1 flex items-center gap-1">
        <template v-if="pctDelta != null && pctDelta !== 0">
          <span :class="pctDelta > 0 ? 'text-mint-600' : 'text-sakura-500'" class="flex items-center gap-0.5">
            <component :is="pctDelta > 0 ? TrendingUp : TrendingDown" class="w-3 h-3" />
            较上次 {{ pctDelta > 0 ? '+' : '' }}{{ pctDelta }}%
          </span>
        </template>
        <span class="text-mint-500 flex items-center gap-0.5">得分率详情 <ChevronRight class="w-3 h-3" /></span>
      </div>
    </div>
    <div v-if="showScoresSection" class="stat-card cursor-pointer hover:shadow-lg hover:-translate-y-0.5 transition-all" @click="emit('clickRank')">
      <div class="flex items-center gap-2 text-sm text-cocoa-500 mb-1"><TrendingUp class="w-4 h-4 text-sky2-500" /> 最新排名</div>
      <div class="text-3xl font-bold text-cocoa-900">
        <template v-if="latestExam && latestExam.classRank">第 {{ latestExam.classRank }} 名</template>
        <template v-else>--</template>
      </div>
      <div class="text-xs mt-1 flex items-center gap-1">
        <template v-if="rankDelta != null && rankDelta !== 0">
          <span :class="rankDelta > 0 ? 'text-mint-600' : 'text-sakura-500'">较上次 {{ rankDelta > 0 ? '上升' : '下降' }} {{ Math.abs(rankDelta) }} 名</span>
        </template>
        <span class="text-sky2-500 flex items-center gap-0.5">查看成绩 <ChevronRight class="w-3 h-3" /></span>
      </div>
    </div>
  </div>
</template>
