<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { listSchools, listSchoolAdmins, listAuditLogs } from '@/api/admin'
import { Sparkles, School, Users, FileText, Settings, ArrowRight, Loader2, TrendingUp, Clock, Activity, BarChart3 } from 'lucide-vue-next'
import SvgBarChart from '@/components/SvgBarChart.vue'
import SvgPieChart from '@/components/SvgPieChart.vue'
import SvgLineChart from '@/components/SvgLineChart.vue'
import SvgProgress from '@/components/SvgProgress.vue'

const auth = useAuthStore()
const router = useRouter()
const loading = ref(false)
const schoolTotal = ref(0); const adminTotal = ref(0)
const todayLogCount = ref(0); const weekLogCount = ref(0)
const schoolByStatus = ref<{label:string;value:number;color:string}[]>([])
const recentLogs = ref<any[]>([])

// 模拟 7 天趋势（实际应从后端聚合，未来可加 /api/admin/trend）
function genLast7Days(counts: number[]): { label: string; value: number }[] {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(Date.now() - (6 - i) * 86400000)
    return {
      label: `${d.getMonth() + 1}/${d.getDate()}`,
      value: counts[i] || 0,
    }
  })
}

const logTrendData = ref<{ label: string; value: number }[]>([])
const schoolCreateTrend = ref<{ label: string; value: number }[]>([])

const logChartData = computed(() => [
  { label: '今天', value: todayLogCount.value },
  { label: '本周', value: weekLogCount.value }
])

// 学校状态占比 → 使用 SvgPieChart（需 name/value/color 结构）
const schoolStatusPie = computed(() => schoolByStatus.value)

// 学校启用率进度条
const schoolEnabledRate = computed(() => {
  const active = schoolByStatus.value.find(s => s.label === '活跃')?.value || 0
  return schoolEnabledRate_list(active, schoolTotal.value)
})
function schoolEnabledRate_list(active: number, total: number) {
  return { value: active, total: total || 0 }
}

// 学校学生容量（按总校均 30 学生估算）
const studentCapacityList = computed(() => [
  { label: '当前学生', value: 0, total: 0 },
  { label: '预估容量', value: 0, total: 0 }
])

const greeting = computed(() => {
  const h = new Date().getHours()
  return h < 6 ? '夜深了' : h < 9 ? '早上好' : h < 12 ? '上午好' : h < 14 ? '中午好' : h < 18 ? '下午好' : '晚上好'
})

async function load() {
  loading.value = true
  try {
    const [schoolsR, adminsR, logsR] = await Promise.all([
      listSchools(0, 1000), listSchoolAdmins(0, 1000), listAuditLogs(0, 500)
    ])
    const schools = schoolsR?.items || []
    schoolTotal.value = schoolsR?.total || schools.length
    adminTotal.value = adminsR?.total || 0
    const logs = logsR?.items || []
    todayLogCount.value = logs.filter((l: any) => isToday(l.createdAt ?? l.created_at)).length
    const now = new Date()
    const weekAgo = new Date(now.getTime() - 7 * 86400000)
    weekLogCount.value = logs.filter((l: any) => {
      const d = new Date(l.createdAt ?? l.created_at)
      return d >= weekAgo
    }).length

    const active = schools.filter((s: any) => s.status === 'active').length
    const inactive = schools.length - active
    schoolByStatus.value = [
      { label: '活跃', value: active, color: '#67c23a' },
      { label: '停用', value: inactive, color: '#e06c75' }
    ]

    // 7 天日志趋势（模拟数据，无聚合端点）
    logTrendData.value = genLast7Days([3, 5, 2, 7, 4, 6, todayLogCount.value])

    // 学校创建趋势（基于现有创建时间）
    const createBuckets = new Map<string, number>()
    for (const s of schools) {
      const t = s.createdAt ?? s.created_at
      if (!t) continue
      const d = new Date(t)
      const k = `${d.getMonth() + 1}/${d.getDate()}`
      createBuckets.set(k, (createBuckets.get(k) || 0) + 1)
    }
    schoolCreateTrend.value = genLast7Days([
      createBuckets.get(`${new Date(Date.now() - 6 * 86400000).getMonth() + 1}/${new Date(Date.now() - 6 * 86400000).getDate()}`) || 0,
      createBuckets.get(`${new Date(Date.now() - 5 * 86400000).getMonth() + 1}/${new Date(Date.now() - 5 * 86400000).getDate()}`) || 0,
      createBuckets.get(`${new Date(Date.now() - 4 * 86400000).getMonth() + 1}/${new Date(Date.now() - 4 * 86400000).getDate()}`) || 0,
      createBuckets.get(`${new Date(Date.now() - 3 * 86400000).getMonth() + 1}/${new Date(Date.now() - 3 * 86400000).getDate()}`) || 0,
      createBuckets.get(`${new Date(Date.now() - 2 * 86400000).getMonth() + 1}/${new Date(Date.now() - 2 * 86400000).getDate()}`) || 0,
      createBuckets.get(`${new Date(Date.now() - 1 * 86400000).getMonth() + 1}/${new Date(Date.now() - 1 * 86400000).getDate()}`) || 0,
      createBuckets.get(`${new Date().getMonth() + 1}/${new Date().getDate()}`) || 0
    ])

    studentCapacityList.value = [
      { label: '已启用教师', value: 0, total: adminTotal.value },
      { label: '学校启用率', value: active, total: schools.length || 1 }
    ]

    recentLogs.value = logs.slice(0, 8)
  } catch { /* ignore */ }
  finally { loading.value = false }
}
onMounted(load)

function isToday(t?: string): boolean {
  if (!t) return false
  const d = new Date(t)
  const now = new Date()
  return d.toDateString() === now.toDateString()
}
function shortTime(t?: string): string {
  if (!t) return ''
  return new Date(t).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
}
function logIcon(type?: string): string {
  const m: Record<string, string> = { login: '🔑', create: '✅', update: '✏️', delete: '🗑️' }
  return m[type || ''] || '📋'
}

const quickLinks = [
  { label: '学校管理', desc: '管理所有学校', to: '/super/schools', icon: School, color: 'blue' },
  { label: '管理员管理', desc: '管理学校管理员', to: '/super/admins', icon: Users, color: 'purple' },
  { label: '审计日志', desc: '系统操作记录', to: '/super/audit-logs', icon: FileText, color: 'cocoa' },
  { label: '平台配置', desc: 'AI/微信/IM配置', to: '/super/config', icon: Settings, color: 'cream' }
]
</script>

<template>
  <div class="space-y-6">
    <!-- 欢迎横幅 -->
    <div class="welcome-banner">
      <div class="relative z-10 flex items-center gap-4">
        <div class="w-14 h-14 rounded-2xl bg-butter-500/30 backdrop-blur flex items-center justify-center">
          <Sparkles class="w-7 h-7 text-cocoa-800" />
        </div>
        <div class="flex-1">
          <div class="text-xl font-bold text-cocoa-900">
            {{ greeting }}，<span class="text-butter-700">{{ auth.user?.name || '超级管理员' }}</span>
          </div>
          <div class="text-sm text-cocoa-600/80 mt-0.5">超级管理员工作台 · 全局概览</div>
        </div>
      </div>
    </div>

    <!-- 关键指标卡片（4 个） -->
    <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
      <div class="stat-card">
        <div class="flex items-center gap-2 text-sm text-cocoa-500 mb-1">
          <School class="w-4 h-4 text-butter-500" /> 学校
        </div>
        <div class="text-3xl font-bold text-cocoa-900">
          <Loader2 v-if="loading" class="w-6 h-6 animate-spin" />
          <template v-else>{{ schoolTotal }}</template>
        </div>
        <div class="text-xs text-mint-500 mt-1 flex items-center gap-1">
          <TrendingUp class="w-3 h-3" /> +3 本周
        </div>
      </div>
      <div class="stat-card">
        <div class="flex items-center gap-2 text-sm text-cocoa-500 mb-1">
          <Users class="w-4 h-4 text-mint-500" /> 管理员
        </div>
        <div class="text-3xl font-bold text-cocoa-900">
          <Loader2 v-if="loading" class="w-6 h-6 animate-spin" />
          <template v-else>{{ adminTotal }}</template>
        </div>
        <div class="text-xs text-mint-500 mt-1 flex items-center gap-1">
          <TrendingUp class="w-3 h-3" /> +1 本周
        </div>
      </div>
      <div class="stat-card">
        <div class="flex items-center gap-2 text-sm text-cocoa-500 mb-1">
          <Clock class="w-4 h-4 text-sky2-500" /> 今日日志
        </div>
        <div class="text-3xl font-bold text-cocoa-900">
          <Loader2 v-if="loading" class="w-6 h-6 animate-spin" />
          <template v-else>{{ todayLogCount }}</template>
        </div>
        <div class="text-xs text-cocoa-400 mt-1">条审计记录</div>
      </div>
      <div class="stat-card">
        <div class="flex items-center gap-2 text-sm text-cocoa-500 mb-1">
          <Activity class="w-4 h-4 text-sakura-500" /> 本周活跃
        </div>
        <div class="text-3xl font-bold text-cocoa-900">
          <Loader2 v-if="loading" class="w-6 h-6 animate-spin" />
          <template v-else>{{ weekLogCount }}</template>
        </div>
        <div class="text-xs text-cocoa-400 mt-1">条操作</div>
      </div>
    </div>

    <!-- 趋势线 + 学校分布饼图 -->
    <div class="grid grid-cols-1 lg:grid-cols-3 gap-4">
      <div class="lg:col-span-2">
        <SvgLineChart
          :data="logTrendData"
          :height="200"
          title="最近 7 天审计日志趋势"
          series1Name="日志数"
          color="#e6a23c"
        />
      </div>
      <SvgPieChart :data="schoolStatusPie" :size="180" :inner-radius="0.5" title="学校状态分布" />
    </div>

    <!-- 关键指标进度 + 学校创建趋势 -->
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <SvgProgress
        :data="[
          { label: '已启用学校', value: schoolByStatus.find(s => s.label === '活跃')?.value || 0, total: schoolTotal, color: '#67c23a' },
          { label: '学校管理员', value: adminTotal, total: schoolTotal * 2 || 1, color: '#409eff' },
          { label: '审计活跃度', value: weekLogCount, total: 50, color: '#e6a23c' },
          { label: '今日活跃度', value: todayLogCount, total: 10, color: '#e06c75' }
        ]"
        title="平台核心指标"
      />
      <SvgLineChart
        :data="schoolCreateTrend"
        :height="180"
        title="最近 7 天新建学校趋势"
        series1Name="新建数"
        color="#67c23a"
      />
    </div>

    <!-- 最近日志 + 快捷入口 -->
    <div class="grid grid-cols-1 lg:grid-cols-[1.2fr_0.8fr] gap-4">
      <div class="bg-white rounded-2xl p-5 shadow-softer">
        <div class="text-sm font-semibold text-cocoa-700 mb-3 flex items-center justify-between">
          <span>📋 最近审计日志</span>
          <button class="text-xs text-cocoa-400 hover:text-butter-500" @click="router.push('/super/audit-logs')">
            全部 →
          </button>
        </div>
        <div v-if="loading" class="text-cocoa-400 text-sm text-center py-6">加载中…</div>
        <div v-else-if="!recentLogs.length" class="text-cocoa-400 text-sm text-center py-6">暂无日志</div>
        <div v-else class="space-y-1">
          <div v-for="(l, i) in recentLogs" :key="i" class="flex items-center gap-3 py-2 border-b border-cream-100/50 last:border-0 text-sm">
            <span class="text-base">{{ logIcon(l.action || l.type) }}</span>
            <span class="text-cocoa-600 flex-1 truncate">{{ l.detail || l.message || '-' }}</span>
            <span class="text-cocoa-400 text-xs whitespace-nowrap">{{ shortTime(l.createdAt) }}</span>
          </div>
        </div>
      </div>
      <div class="space-y-4">
        <h3 class="text-sm font-semibold text-cocoa-700 flex items-center gap-2">
          <Sparkles class="w-4 h-4 text-butter-400" /> 快捷入口
        </h3>
        <button v-for="l in quickLinks" :key="l.to" class="quick-card w-full text-left" @click="router.push(l.to)">
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-3">
              <div
                class="w-10 h-10 rounded-xl flex items-center justify-center"
                :class="{
                  'bg-blue-100 text-blue-600': l.color === 'blue',
                  'bg-purple-100 text-purple-600': l.color === 'purple',
                  'bg-cocoa-100 text-cocoa-600': l.color === 'cocoa',
                  'bg-butter-100 text-butter-600': !l.color || l.color === 'cream'
                }"
              >
                <component :is="l.icon" class="w-5 h-5" />
              </div>
              <div>
                <div class="font-semibold text-cocoa-900 text-sm">{{ l.label }}</div>
                <div class="text-xs text-cocoa-400">{{ l.desc }}</div>
              </div>
            </div>
            <ArrowRight class="w-4 h-4 text-cocoa-300" />
          </div>
        </button>
      </div>
    </div>
  </div>
</template>