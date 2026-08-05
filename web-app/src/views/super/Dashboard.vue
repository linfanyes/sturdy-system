<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { listSchools, listSchoolAdmins, listAuditLogs, listTeachers } from '@/api/admin'
import { School, Users, FileText, Settings, ArrowRight, Loader2, TrendingUp, Clock, Activity } from 'lucide-vue-next'
import SvgPieChart from '@/components/SvgPieChart.vue'
import SvgLineChart from '@/components/SvgLineChart.vue'
import SvgProgress from '@/components/SvgProgress.vue'
import WelcomeHero from '@/components/WelcomeHero.vue'

const auth = useAuthStore()
const router = useRouter()
const loading = ref(false)
const schoolTotal = ref(0); const adminTotal = ref(0)
const todayLogCount = ref(0); const weekLogCount = ref(0)
const schoolByStatus = ref<{label:string;value:number;color:string}[]>([])

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

// 学校状态占比 → 使用 SvgPieChart（需 name/value/color 结构）
const schoolStatusPie = computed(() => schoolByStatus.value)

// 审计操作类型中文映射
const ACTION_NAMES: Record<string, string> = {
  create_teacher: '创建教师',
  delete_teacher: '删除教师',
  reset_password: '重置密码',
  create_class: '创建班级',
  delete_class: '删除班级',
  create_school_admin: '新增校管',
  delete_school_admin: '删除校管',
}

// ① 操作类型分布（环形图）
const actionPie = ref<{ label: string; value: number; color: string }[]>([])
// ② 7 天操作活跃趋势（折线）
const activeTrend = ref<{ label: string; value: number }[]>([])
// ③ Top5 学校规模（横向条形：教师数）
const topSchools = ref<{ name: string; count: number; pct: number }[]>([])
// ④ 各校操作热度（横向条形）
const schoolHot = ref<{ name: string; count: number; pct: number }[]>([])

async function load() {
  loading.value = true
  try {
    const [schoolsR, adminsR, logsR, teachersR] = await Promise.all([
      listSchools(0, 1000), listSchoolAdmins(0, 1000), listAuditLogs(0, 500), listTeachers(0, 500)
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
      { label: '活跃', value: active, color: '#4AAE7A' },
      { label: '停用', value: inactive, color: '#e06c75' }
    ]

    // 学校 id → 名称映射
    const schoolName = new Map<string, string>()
    for (const s of schools) schoolName.set(s.id, s.name || s.id)

    // ① 操作类型分布（审计 action 聚合，Top 5 + 其他）
    const actionCount = new Map<string, number>()
    for (const l of logs) {
      const k = l.action || 'other'
      actionCount.set(k, (actionCount.get(k) || 0) + 1)
    }
    const sortedActions = [...actionCount.entries()].sort((a, b) => b[1] - a[1])
    const pieColors = ['#f5b342', '#1C6FB3', '#4AAE7A', '#E7698C', '#9b8c6f', '#8e7cc3']
    const actionArr = sortedActions.slice(0, 5).map(([k, v]) => ({ label: ACTION_NAMES[k] || k, value: v }))
    const restCount = sortedActions.slice(5).reduce((s, [, v]) => s + v, 0)
    if (restCount > 0) actionArr.push({ label: '其他', value: restCount })
    actionPie.value = actionArr.map((d, i) => ({ ...d, color: pieColors[i % pieColors.length] }))

    // ② 7 天操作活跃趋势（审计按天聚合）
    const logDay = new Map<string, number>()
    for (const l of logs) {
      const t = l.createdAt ?? l.created_at
      if (!t) continue
      const d = new Date(t)
      logDay.set(`${d.getMonth() + 1}/${d.getDate()}`, (logDay.get(`${d.getMonth() + 1}/${d.getDate()}`) || 0) + 1)
    }
    activeTrend.value = genLast7Days(Array.from({ length: 7 }, (_, i) => logDay.get(dayKey(i - 6)) || 0))

    // ③ Top5 学校规模（教师数聚合）
    const teachers = teachersR?.items || []
    const tBySchool = new Map<string, number>()
    for (const t of teachers) {
      const sid = t.schoolId || ''
      tBySchool.set(sid, (tBySchool.get(sid) || 0) + 1)
    }
    const topSchoolsArr = [...tBySchool.entries()]
      .sort((a, b) => b[1] - a[1]).slice(0, 5)
      .map(([sid, cnt]) => ({ name: schoolName.get(sid) || (sid || '未分配'), count: cnt }))
    const maxT = Math.max(1, ...topSchoolsArr.map((t) => t.count))
    topSchools.value = topSchoolsArr.map((t) => ({ ...t, pct: Math.round((t.count / maxT) * 100) }))

    // ④ 各校操作热度（审计按 schoolId 聚合）
    const hotBySchool = new Map<string, number>()
    for (const l of logs) {
      const sid = l.schoolId || '__global__'
      hotBySchool.set(sid, (hotBySchool.get(sid) || 0) + 1)
    }
    const hotArr = [...hotBySchool.entries()]
      .sort((a, b) => b[1] - a[1]).slice(0, 5)
      .map(([sid, cnt]) => ({ name: sid === '__global__' ? '全局操作' : schoolName.get(sid) || sid, count: cnt }))
    const maxH = Math.max(1, ...hotArr.map((h) => h.count))
    schoolHot.value = hotArr.map((h) => ({ ...h, pct: Math.round((h.count / maxH) * 100) }))
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

/** 距今天 offset 天的 M/d 键 */
function dayKey(offset: number): string {
  const d = new Date(Date.now() + offset * 86400000)
  return `${d.getMonth() + 1}/${d.getDate()}`
}

</script>

<template>
  <div class="space-y-6">
    <!-- 欢迎横幅 -->
    <WelcomeHero
      :name="auth.user?.name || '超级管理员'"
      role-label="工作台"
      subtitle="全局概览"
      avatar="👑"
      accent="butter"
    />

    <!-- 关键指标卡片（4 个，可点击跳转） -->
    <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
      <div class="stat-card cursor-pointer hover:shadow-soft transition-shadow" @click="router.push('/super/schools')">
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
      <div class="stat-card cursor-pointer hover:shadow-soft transition-shadow" @click="router.push('/super/admins')">
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
      <div class="stat-card cursor-pointer hover:shadow-soft transition-shadow" @click="router.push('/super/audit-logs')">
        <div class="flex items-center gap-2 text-sm text-cocoa-500 mb-1">
          <Clock class="w-4 h-4 text-sky2-500" /> 今日日志
        </div>
        <div class="text-3xl font-bold text-cocoa-900">
          <Loader2 v-if="loading" class="w-6 h-6 animate-spin" />
          <template v-else>{{ todayLogCount }}</template>
        </div>
        <div class="text-xs text-cocoa-400 mt-1">条审计记录</div>
      </div>
      <div class="stat-card cursor-pointer hover:shadow-soft transition-shadow" @click="router.push('/super/audit-logs')">
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

    <!-- 平台仪表盘 2×2：操作类型 / 活跃趋势 / 学校规模 / 操作热度 -->
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <SvgPieChart :data="actionPie" :size="200" :inner-radius="0.5" title="操作类型分布" />

      <div class="stat-card p-5">
        <div class="flex items-center justify-between mb-2">
          <div class="flex items-center gap-2 text-sm font-medium text-cocoa-700"><Activity class="w-4 h-4 text-sky2-500" /> 7 天操作活跃趋势</div>
        </div>
        <SvgLineChart :data="activeTrend" :height="150" series1Name="操作数" color="#1C6FB3" />
      </div>

      <div class="stat-card p-5">
        <div class="flex items-center justify-between mb-3">
          <div class="flex items-center gap-2 text-sm font-medium text-cocoa-700"><School class="w-4 h-4 text-butter-500" /> Top5 学校规模</div>
          <span class="text-xs text-cocoa-400">按教师数</span>
        </div>
        <div v-if="loading" class="space-y-2.5 py-2">
          <div v-for="i in 3" :key="i" class="h-5 rounded-lg bg-cream-100 animate-pulse" :style="{ width: `${90 - i * 15}%` }" />
        </div>
        <div v-else-if="topSchools.length" class="space-y-2.5">
          <div v-for="s in topSchools" :key="s.name" class="flex items-center gap-2">
            <span class="w-20 shrink-0 truncate text-xs text-cocoa-600">{{ s.name }}</span>
            <div class="flex-1 h-5 rounded-full bg-cream-100 overflow-hidden">
              <div
                class="h-full rounded-full bg-gradient-to-r from-butter-300 to-butter-500 transition-all duration-700"
                :style="{ width: s.pct + '%' }"
              />
            </div>
            <span class="w-8 shrink-0 text-right text-xs text-cocoa-500">{{ s.count }}</span>
          </div>
        </div>
        <div v-else class="py-8 text-center text-sm text-cocoa-400">暂无学校数据</div>
      </div>

      <div class="stat-card p-5">
        <div class="flex items-center justify-between mb-3">
          <div class="flex items-center gap-2 text-sm font-medium text-cocoa-700"><Clock class="w-4 h-4 text-mint-500" /> 各校操作热度</div>
          <span class="text-xs text-cocoa-400">近 500 条审计</span>
        </div>
        <div v-if="loading" class="space-y-2.5 py-2">
          <div v-for="i in 3" :key="i" class="h-5 rounded-lg bg-cream-100 animate-pulse" :style="{ width: `${90 - i * 15}%` }" />
        </div>
        <div v-else-if="schoolHot.length" class="space-y-2.5">
          <div v-for="h in schoolHot" :key="h.name" class="flex items-center gap-2">
            <span class="w-20 shrink-0 truncate text-xs text-cocoa-600">{{ h.name }}</span>
            <div class="flex-1 h-5 rounded-full bg-cream-100 overflow-hidden">
              <div
                class="h-full rounded-full bg-gradient-to-r from-sky2-300 to-sky2-500 transition-all duration-700"
                :style="{ width: h.pct + '%' }"
              />
            </div>
            <span class="w-8 shrink-0 text-right text-xs text-cocoa-500">{{ h.count }}</span>
          </div>
        </div>
        <div v-else class="py-8 text-center text-sm text-cocoa-400">暂无操作记录</div>
      </div>
    </div>

    <!-- 学校状态 + 核心指标进度 -->
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <SvgPieChart :data="schoolStatusPie" :size="200" :inner-radius="0.5" title="学校状态分布" />
      <SvgProgress
        :data="[
          { label: '已启用学校', value: schoolByStatus.find(s => s.label === '活跃')?.value || 0, total: schoolTotal, color: '#4AAE7A' },
          { label: '学校管理员', value: adminTotal, total: schoolTotal * 2 || 1, color: '#1C6FB3' },
          { label: '审计活跃度', value: weekLogCount, total: 50, color: '#f5b342' },
          { label: '今日活跃度', value: todayLogCount, total: 10, color: '#E7698C' }
        ]"
        title="平台核心指标"
      />
    </div>
  </div>
</template>

<style>
@keyframes toastIn {
  from { opacity: 0; transform: translateX(-50%) translateY(-10px); }
  to { opacity: 1; transform: translateX(-50%) translateY(0); }
}
.btn-danger {
  background: var(--danger);
  color: #fff;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  padding: 10px 24px;
  font-weight: 600;
  cursor: pointer;
  transition: all .2s;
}
.btn-danger:hover:not(:disabled) { background: #c0392b; }
.btn-danger:disabled { opacity: 0.5; cursor: not-allowed; }
.modal-mask {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,.4);
  z-index: 999;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
}
</style>