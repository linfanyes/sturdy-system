<script setup lang="ts">
import { ref, computed } from 'vue'
import { listAllStudents, listGrades } from '@/api/teacher'
import SvgBarChart from '@/components/SvgBarChart.vue'
import { Users } from 'lucide-vue-next'

const students = ref<any[]>([])
const selected = ref('')
const trend = ref<any[]>([])
const loading = ref(false)

async function loadStudents() {
  try {
    const d = await listAllStudents({ take: 500 })
    students.value = (d?.items || d || []).slice(0, 500)
  } catch (e) {
    console.error(e)
  }
}

async function loadTrend() {
  if (!selected.value) return
  loading.value = true
  try {
    const d = await listGrades({ studentId: selected.value })
    trend.value = d?.items || d || []
  } catch (e) {
    console.error(e)
  } finally {
    loading.value = false
  }
}

const chartData = computed(() => {
  return trend.value.map((item: any) => ({
    label: (item.examName || item.name || '').slice(0, 6),
    value: Number(item.totalScore || 0),
  }))
})

const selectedName = computed(() => {
  const s = students.value.find((x: any) => x.id === selected.value)
  return s ? (s.name || s.studentNo) : ''
})

loadStudents()
</script>
<template>
  <div class="grade-trend space-y-4">
    <div class="flex items-center justify-between flex-wrap gap-3">
      <h2 class="text-lg font-bold text-cocoa-900">📈 成绩趋势</h2>
      <div class="flex items-center gap-2">
        <span class="text-xs text-cocoa-400">选择学生</span>
        <select v-model="selected" @change="loadTrend"
          class="px-3 py-2 rounded-xl border border-cream-200 bg-surface text-sm focus:outline-none focus:border-butter-400 min-w-[160px]">
          <option value="">请选择学生</option>
          <option v-for="s in students" :key="s.id" :value="s.id">{{ s.name }}（{{ s.studentNo }}）</option>
        </select>
      </div>
    </div>

    <!-- 柱状图 -->
    <div v-if="chartData.length" class="stat-card">
      <div v-if="selectedName" class="flex items-center gap-2 mb-3 text-sm text-cocoa-500">
        <Users class="w-4 h-4" /> {{ selectedName }} 的成绩概览
      </div>
      <SvgBarChart
        :data="chartData"
        :height="240"
        title="考试成绩分布"
        color="#f5b342"
      />
    </div>

    <!-- 空状态 -->
    <div v-if="!loading && !chartData.length" class="text-center py-10 text-cocoa-400">
      {{ students.length ? '请选择一个学生查看成绩趋势' : '暂无学生数据，请先在学生管理中导入学生' }}
    </div>
  </div>
</template>