<script setup lang="ts">
import { Bell } from 'lucide-vue-next'

defineProps<{
  reminders: Array<{ icon: string; text: string; level: string }>
  showNoticesSection: boolean
  showHomeworkSection: boolean
  showAttendanceSection: boolean
}>()
</script>

<template>
  <!-- 今日需关注（置顶提醒卡） -->
  <div v-if="reminders.length && (showNoticesSection || showHomeworkSection || showAttendanceSection)" class="rounded-2xl border-l-4 border-sakura-400 bg-surface p-4 shadow-softer">
    <div class="text-sm font-bold text-cocoa-900 mb-2 flex items-center gap-2">
      <Bell class="w-4 h-4 text-sakura-500" /> 今日需关注
      <span class="text-xs font-normal text-cocoa-400">{{ reminders.length }} 项</span>
    </div>
    <div class="space-y-1.5">
      <div v-for="(r, i) in reminders" :key="i" class="flex items-center gap-2 text-sm" :class="r.level === 'red' ? 'text-sakura-700' : 'text-cocoa-700'">
        <span>{{ r.icon }}</span><span>{{ r.text }}</span>
      </div>
    </div>
  </div>
</template>
