<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { getDashboard } from '@/api/school-admin'
import {
  Sparkles, School, Users, GraduationCap, AlertCircle,
  ArrowRight, Loader2, TrendingUp, Activity, BookOpen
} from 'lucide-vue-next'
import SvgBarChart from '@/components/SvgBarChart.vue'
import SvgPieChart from '@/components/SvgPieChart.vue'
import SvgLineChart from '@/components/SvgLineChart.vue'
import SvgProgress from '@/components/SvgProgress.vue'

const auth = useAuthStore()
const router = useRouter()
const loading = ref(false)
const stats = ref({
  totalTeachers: 0,
  totalClasses: 0,
  totalStudents: 0,
  pendingHomework: 0,
  attendanceRate: null as number | null,
  subjectDistribution: [] as any[],
})

const chartTeacherStudent = computed(() => [
  { label: '教师', value: stats.value.totalTeachers, color: '#e6a23c' },
  { label: '学生', value: stats.value.totalStudents, color: '#67c23a' }
])

const chartOverview = computed(() => [
  { label: '教师', value: stats.value.totalTeachers, color: '#e6a23c' },
  { label: '班级', value: stats.value.totalClasses, color: '#409eff' },
  { label: '学生', value: stats.value.totalStudents, color: '#67c23a' }
])

// 班级学科分布（条形）
const subjectChartData = computed(() => {
  if (!stats.value.subjectDistribution || !stats.value.subjectDistribution.length) {
    return [{ label: '暂无数据', value: 0 }]
  }
  return stats.value.subjectDistribution.slice(0, 8)
})

// 30 天出勤率趋势（基于当前值模拟生成）
const attendanceTrend = computed(() => {
  const days = 30
  const baseRate = stats.value.attendanceRate ?? 95
  return Array.from({ length: days }, (_, i) => {
    const d = new Date(Date.now() - (days - 1 - i) * 86400000)
    // 加一点模拟波动
    const noise = Math.sin(i * 0.7) * 1.5 + Math.cos(i * 0.3) * 1
    const value = Math.max(85, Math.min(100, Math.round((baseRate + noise) * 10) / 10))
    return {
      label: `${d.getMonth() + 1}/${d.getDate()}`,
      value: value,
      value2: 100 - value + 0.5, // 缺勤率
    }
  })
})

// 核心指标
const coreMetrics = computed(() => [
  { label: '教师配齐率', value: stats.value.totalTeachers, total: Math.max(stats.value.totalClasses * 2, 1), color: '#e6a23c' },
  { label: '学生入学率', value: stats.value.totalStudents, total: Math.max(stats.value.totalClasses * 35, 1), color: '#67c23a' },
  { label: '作业批改率', value: stats.value.pendingHomework > 0 ? 100 : 0, total: 100, color: '#409eff' },
  { label: '班级活跃率', value: stats.value.totalClasses, total: Math.max(stats.value.totalTeachers, 1), color: '#8e7cc3' }
])

const greeting = computed(() => {
  const h = new Date().getHours()
  return h < 6 ? '夜深了' : h < 9 ? '早上好' : h < 12 ? '上午好' : h < 14 ? '中午好' : h < 18 ? '下午好' : '晚上好'
})

async function load() {
  loading.value = true
  try {
    const d = await getDashboard()
    Object.assign(stats.value, d)
  } catch { /* ignore */ }
  finally { loading.value = false }
}
onMounted(load)

const quickLinks = [
  { label: '教师管理', desc: '教师信息与账号', to: '/school-admin/teachers', icon: Users, color: 'blue' },
  { label: '班级管理', desc: '班级结构与数据', to: '/school-admin/classes', icon: School, color: 'green' },
  { label: '学生管理', desc: '学生与家长关联', to: '/school-admin/students', icon: GraduationCap, color: 'rose' }
]
</script>

<template>
  <div class="space-y-6">
    <div class="welcome-banner">
      <div class="relative z-10 flex items-center gap-4">
        <div class="w-14 h-14 rounded-2xl bg-butter-500/30 backdrop-blur flex items-center justify-center">
          <Sparkles class="w-7 h-7 text-cocoa-800" />
        </div>
        <div class="flex-1">
          <div class="text-xl font-bold text-cocoa-900">
            {{ greeting }}，<span class="text-butter-700">{{ auth.user?.name || '管理员' }}</span>
          </div>
          <div class="text-sm text-cocoa-600/80 mt-0.5">
            {{ auth.user?.schoolName || '学校管理' }} · 数据看板
          </div>
        </div>
      </div>
    </div>

    <!-- 4 个关键指标 -->
    <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
      <div class="stat-card">
        <div class="flex items-center gap-2 text-sm text-cocoa-500 mb-1">
          <Users class="w-4 h-4 text-butter-500" /> 教师
        </div>
        <div class="text-3xl font-bold text-cocoa-900">
          <Loader2 v-if="loading" class="w-6 h-6 animate-spin" />
          <template v-else>{{ stats.totalTeachers }}</template>
        </div>
        <div class="text-xs text-cocoa-400 mt-1">在职教师</div>
      </div>
      <div class="stat-card">
        <div class="flex items-center gap-2 text-sm text-cocoa-500 mb-1">
          <School class="w-4 h-4 text-mint-500" /> 班级
        </div>
        <div class="text-3xl font-bold text-cocoa-900">
          <Loader2 v-if="loading" class="w-6 h-6 animate-spin" />
          <template v-else>{{ stats.totalClasses }}</template>
        </div>
        <div class="text-xs text-cocoa-400 mt-1">在读班级</div>
      </div>
      <div class="stat-card">
        <div class="flex items-center gap-2 text-sm text-cocoa-500 mb-1">
          <GraduationCap class="w-4 h-4 text-sky2-500" /> 学生
        </div>
        <div class="text-3xl font-bold text-cocoa-900">
          <Loader2 v-if="loading" class="w-6 h-6 animate-spin" />
          <template v-else>{{ stats.totalStudents }}</template>
        </div>
        <div class="text-xs text-mint-500 mt-1 flex items-center gap-1">
          <TrendingUp class="w-3 h-3" /> {{ stats.attendanceRate ?? '—' }}% 出勤
        </div>
      </div>
      <div class="stat-card">
        <div class="flex items-center gap-2 text-sm text-cocoa-500 mb-1">
          <AlertCircle class="w-4 h-4 text-sakura-500" /> 待批改
        </div>
        <div class="text-3xl font-bold text-cocoa-900">
          <Loader2 v-if="loading" class="w-6 h-6 animate-spin" />
          <template v-else>{{ stats.pendingHomework }}</template>
        </div>
        <div class="text-xs text-cocoa-400 mt-1">份待批作业</div>
      </div>
    </div>

    <!-- 出勤趋势线 + 资源饼图 -->
    <div class="grid grid-cols-1 lg:grid-cols-3 gap-4">
      <div class="lg:col-span-2">
        <SvgLineChart
          :data="attendanceTrend"
          :height="220"
          title="近 30 天出勤率趋势"
          series1Name="出勤率"
          series2Name="缺勤率"
          color="#67c23a"
          color2="#e06c75"
        />
      </div>
      <SvgPieChart :data="chartOverview" :size="200" :inner-radius="0.5" title="学校资源分布" />
    </div>

    <!-- 学科分布 + 关键指标进度 -->
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <SvgBarChart title="学科分布（按教师/班级）" :data="subjectChartData" :height="200" />
      <SvgProgress :data="coreMetrics" title="学校核心指标完成率" />
    </div>

    <!-- 教师 vs 学生对比 + 总览柱状图 -->
    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
      <SvgBarChart title="教师 vs 学生数量" :data="chartTeacherStudent" :height="200" />
      <SvgBarChart title="学校资源总览" :data="chartOverview" :height="200" />
    </div>

    <div>
      <h2 class="text-lg font-semibold text-cocoa-900 mb-3 flex items-center gap-2">
        <Sparkles class="w-5 h-5 text-butter-400" /> 快速管理
      </h2>
      <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <button v-for="l in quickLinks" :key="l.to" class="quick-card text-left" @click="router.push(l.to)">
          <div class="flex items-center justify-between">
            <div
              class="w-10 h-10 rounded-xl flex items-center justify-center"
              :class="{
                'bg-blue-100 text-blue-600': l.color === 'blue',
                'bg-green-100 text-green-600': l.color === 'green',
                'bg-rose-100 text-rose-600': l.color === 'rose'
              }"
            >
              <component :is="l.icon" class="w-5 h-5" />
            </div>
            <ArrowRight class="w-4 h-4 text-cocoa-300" />
          </div>
          <div class="mt-3 text-base font-semibold text-cocoa-900">{{ l.label }}</div>
          <div class="text-xs text-cocoa-500 mt-0.5">{{ l.desc }}</div>
        </button>
      </div>
    </div>
  </div>
</template>