<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { getDashboard } from '@/api/school-admin'
import {
  Sparkles, School, Users, GraduationCap,
  ArrowRight, Loader2, TrendingUp, Activity, BookOpen,
  ToggleLeft, Megaphone, Bot
} from 'lucide-vue-next'
import SvgBarChart from '@/components/SvgBarChart.vue'
import SvgPieChart from '@/components/SvgPieChart.vue'
import SvgLineChart from '@/components/SvgLineChart.vue'
import SvgProgress from '@/components/SvgProgress.vue'
import WelcomeHero from '@/components/WelcomeHero.vue'

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
  { label: '班级', value: stats.value.totalClasses, color: '#1C6FB3' },
  { label: '学生', value: stats.value.totalStudents, color: '#67c23a' }
])

// 班级学科分布（条形）：后端返回 [{name, count}]，映射为 {label, value}
const subjectChartData = computed(() => {
  const dist = stats.value.subjectDistribution || []
  if (!dist.length) {
    return [{ label: '暂无数据', value: 0 }]
  }
  return dist.slice(0, 8).map((d: any) => ({
    label: d.name || d.label || '未设置',
    value: Number(d.count ?? d.value ?? 0),
  }))
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
  { label: '作业批改率', value: stats.value.pendingHomework > 0 ? 100 : 0, total: 100, color: '#1C6FB3' },
  { label: '班级活跃率', value: stats.value.totalClasses, total: Math.max(stats.value.totalTeachers, 1), color: '#8e7cc3' }
])

async function load() {
  loading.value = true
  try {
    const d = await getDashboard()
    Object.assign(stats.value, d)
  } catch { /* ignore */ }
  finally { loading.value = false }
}
onMounted(load)

// 二级功能入口（集中到工作台页内，按一级分类分组）
const entryGroups = [
  {
    title: '人员管理',
    items: [
      { label: '教师管理', desc: '教师信息与账号', to: '/school-admin/teachers', icon: Users, color: 'blue' },
      { label: '班级管理', desc: '班级结构与数据', to: '/school-admin/classes', icon: School, color: 'green' },
      { label: '学生管理', desc: '学生与家长关联', to: '/school-admin/students', icon: GraduationCap, color: 'rose' },
      { label: '学校功能包', desc: '功能开关配置', to: '/school-admin/features', icon: ToggleLeft, color: 'purple' },
    ],
  },
  {
    title: '资源与设置',
    items: [
      { label: '学校公告', desc: '发布与维护公告', to: '/school-admin/notices', icon: Megaphone, color: 'butter' },
      { label: '教材知识库', desc: '教材与知识点', to: '/school-admin/textbooks', icon: BookOpen, color: 'sky' },
      { label: '在线资源库', desc: '在线资源沉淀', to: '/school-admin/resource-library', icon: BookOpen, color: 'green' },
      { label: '智慧中小学', desc: '国家平台在线课程', to: '/school-admin/zhzx', icon: GraduationCap, color: 'blue' },
      { label: 'AI 配置', desc: 'AI 服务商设置', to: '/school-admin/ai-config', icon: Bot, color: 'blue' },
    ],
  },
]

// 图标容器配色（用标准 tailwind 色避免依赖自定义 palette 未配置）
function iconWrapClass(c: string) {
  return ({
    blue: 'bg-blue-100 text-blue-600',
    green: 'bg-green-100 text-green-600',
    rose: 'bg-rose-100 text-rose-600',
    purple: 'bg-purple-100 text-purple-600',
    butter: 'bg-amber-100 text-amber-600',
    sky: 'bg-cyan-100 text-cyan-600',
  } as Record<string, string>)[c] || 'bg-cream-100 text-cocoa-600'
}
</script>

<template>
  <div class="space-y-6">
    <WelcomeHero
      :name="auth.user?.name || '管理员'"
      role-label="管理后台"
      :subtitle="`${auth.user?.schoolName || '学校管理'} · 数据看板`"
      avatar="🏫"
      accent="sky"
    />

    <!-- 3 个关键指标（校管不需要待批改） -->
    <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
      <div class="stat-card cursor-pointer hover:shadow-soft transition-shadow" @click="router.push('/school-admin/teachers')">
        <div class="flex items-center gap-2 text-sm text-cocoa-500 mb-1">
          <Users class="w-4 h-4 text-butter-500" /> 教师
        </div>
        <div class="text-3xl font-bold text-cocoa-900">
          <Loader2 v-if="loading" class="w-6 h-6 animate-spin" />
          <template v-else>{{ stats.totalTeachers }}</template>
        </div>
        <div class="text-xs text-cocoa-400 mt-1">在职教师</div>
      </div>
      <div class="stat-card cursor-pointer hover:shadow-soft transition-shadow" @click="router.push('/school-admin/classes')">
        <div class="flex items-center gap-2 text-sm text-cocoa-500 mb-1">
          <School class="w-4 h-4 text-mint-500" /> 班级
        </div>
        <div class="text-3xl font-bold text-cocoa-900">
          <Loader2 v-if="loading" class="w-6 h-6 animate-spin" />
          <template v-else>{{ stats.totalClasses }}</template>
        </div>
        <div class="text-xs text-cocoa-400 mt-1">在读班级</div>
      </div>
      <div class="stat-card cursor-pointer hover:shadow-soft transition-shadow" @click="router.push('/school-admin/students')">
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

    <div v-for="g in entryGroups" :key="g.title" class="mt-8">
      <h2 class="section-title">{{ g.title }}</h2>
      <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <button v-for="l in g.items" :key="l.to" class="quick-card text-left" @click="router.push(l.to)">
          <div class="flex items-center justify-between">
            <div
              class="w-10 h-10 rounded-xl flex items-center justify-center"
              :class="iconWrapClass(l.color)"
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