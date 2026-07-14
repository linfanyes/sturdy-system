<script setup lang="ts">
import { ref } from 'vue'
import GradeTrend from './GradeTrend.vue'
import { TrendingUp } from 'lucide-vue-next'

interface Tab {
  id: string
  label: string
  icon: any
}

const tabs: Tab[] = [
  { id: 'grade-trend', label: '成绩趋势', icon: TrendingUp },
]

const activeTab = ref('grade-trend')
</script>

<template>
  <div class="space-y-5">
    <section class="card-soft p-6 bg-gradient-to-br from-mint-100 via-cream-50 to-sky2-100 relative overflow-hidden">
      <div class="absolute -top-10 right-6 text-7xl opacity-20 select-none">📊</div>
      <h2 class="title-display text-2xl">综合分析</h2>
      <p class="text-sm text-cocoa-500 mt-1">多维度班级与学生数据分析</p>
    </section>

    <div class="flex items-center gap-1 card-flat p-1 w-fit">
      <button
        v-for="t in tabs"
        :key="t.id"
        class="px-3 py-1.5 rounded-xl text-xs flex items-center gap-1 transition"
        :class="activeTab === t.id ? 'bg-butter-300 text-cocoa-900' : 'text-cocoa-500 hover:bg-cocoa-50'"
        @click="activeTab = t.id"
      >
        <component :is="t.icon" :size="12" />
        {{ t.label }}
      </button>
    </div>

    <GradeTrend v-if="activeTab === 'grade-trend'" />
  </div>
</template>
