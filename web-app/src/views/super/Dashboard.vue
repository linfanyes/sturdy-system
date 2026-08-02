<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { listSchools, listSchoolAdmins, listAuditLogs, resetAll } from '@/api/admin'
import { School, Users, FileText, Settings, ArrowRight, Loader2, TrendingUp, Clock, Activity, Trash2 } from 'lucide-vue-next'
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

const resetting = ref(false)
const resetConfirmText = ref('')
const showResetDialog = ref(false)

async function doResetAll() {
  if (resetConfirmText.value.trim() !== '确认清除') {
    toast('请输入「确认清除」以继续')
    return
  }
  resetting.value = true
  try {
    await resetAll(true)
    toast('已清除所有业务数据，演示数据已保留')
    showResetDialog.value = false
    resetConfirmText.value = ''
    load()
  } catch (e: any) {
    toast(e?.message || '操作失败')
  } finally {
    resetting.value = false
  }
}

function toast(msg: string) {
  // 使用简单的浏览器 toast，避免引入新依赖
  const el = document.createElement('div')
  el.textContent = msg
  el.style.cssText = 'position:fixed;top:20px;left:50%;transform:translateX(-50%);background:#333;color:#fff;padding:10px 24px;border-radius:8px;font-size:14px;z-index:9999;animation:toastIn .3s'
  document.body.appendChild(el)
  setTimeout(() => el.remove(), 2500)
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

    <!-- 危险操作区 -->
    <div class="bg-red-50/60 rounded-2xl p-5 shadow-softer border border-red-100">
      <div class="text-sm font-semibold text-red-700 mb-2">⚠️ 危险操作区</div>
      <div class="text-xs text-red-500/80 mb-3">以下操作不可恢复，请谨慎操作。一键清除会清除所有业务数据（考试/成绩/作业/考勤/通知等），保留演示数据（学校/校管/教师/班级/学生）。</div>
      <button class="btn-danger" :disabled="resetting" @click="showResetDialog = true">
        <Trash2 class="w-4 h-4 inline-block mr-1" />
        {{ resetting ? '处理中…' : '一键清除（保留演示数据）' }}
      </button>
    </div>

    <!-- 一键清除确认弹窗 -->
    <div v-if="showResetDialog" class="modal-mask" @click.self="showResetDialog = false">
      <div class="modal">
        <div class="modal-h"><h3>确认一键清除</h3><span class="modal-close" @click="showResetDialog = false">×</span></div>
        <div class="modal-body">
          <div class="text-sm text-cocoa-700 mb-2">此操作将：</div>
          <ul class="text-sm text-cocoa-600 list-disc pl-5 space-y-1 mb-3">
            <li>清除所有考试、成绩、作业、考勤、课表</li>
            <li>清除所有通知、公告、班级活动、班级风采、值日</li>
            <li>清除所有 AI 生成内容、教学资源、教学日志</li>
            <li>清除所有学生奖惩、成长记录、家长联系记录</li>
            <li><b>保留</b>：学校、校管、教师、班级、学生等演示数据</li>
            <li><b>保留</b>：超管账号、平台配置</li>
          </ul>
          <div class="text-sm text-red-600 mb-2">此操作不可撤销，请谨慎操作。</div>
          <div class="form-group">
            <label class="block text-sm font-semibold text-cocoa-700 mb-1">请输入「确认清除」继续</label>
            <input v-model="resetConfirmText" class="w-full" placeholder="确认清除" />
          </div>
        </div>
        <div class="modal-foot">
          <button class="btn-outline" @click="showResetDialog = false">取消</button>
          <button class="btn-danger" :disabled="resetting || resetConfirmText.trim() !== '确认清除'" @click="doResetAll()">
            {{ resetting ? '处理中…' : '确认清除' }}
          </button>
        </div>
      </div>
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