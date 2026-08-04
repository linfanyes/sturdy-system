<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { listSchools, listSchoolAdmins, listAuditLogs } from '@/api/admin'
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

const schoolCreateTrend = ref<{ label: string; value: number }[]>([])

// 学校状态占比 → 使用 SvgPieChart（需 name/value/color 结构）
const schoolStatusPie = computed(() => schoolByStatus.value)

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

</script>

<template>
  <div class="space-y-6">
    <!-- 欢迎横幅 -->
    <WelcomeHero
      :name="auth.user?.name || '超级管理员'"
      role-label="仪表盘"
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

    <!-- 学校状态分布 + 新建学校趋势 -->
    <div class="grid grid-cols-1 lg:grid-cols-3 gap-4">
      <SvgPieChart :data="schoolStatusPie" :size="200" :inner-radius="0.5" title="学校状态分布" />
      <div class="lg:col-span-2">
        <SvgLineChart
          :data="schoolCreateTrend"
          :height="200"
          title="最近 7 天新建学校趋势"
          series1Name="新建数"
          color="#67c23a"
        />
      </div>
    </div>

    <!-- 关键指标进度 -->
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