<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { listSchools, listSchoolAdmins, listAuditLogs } from '@/api/admin'
import { School, Users, FileText, Settings, ArrowRight, Loader2, Sparkles } from 'lucide-vue-next'

const auth = useAuthStore()
const router = useRouter()
const loading = ref(false)
const schoolTotal = ref(0)
const adminTotal = ref(0)
const todayLogCount = ref(0)
const greeting = ref('')
const timestamp = ref('')

function getGreeting() {
  const h = new Date().getHours()
  if (h < 6) return '夜深了'
  if (h < 9) return '早上好'
  if (h < 12) return '上午好'
  if (h < 14) return '中午好'
  if (h < 18) return '下午好'
  return '晚上好'
}

function isToday(t?: string): boolean {
  if (!t) return false
  const d = new Date(t)
  if (isNaN(d.getTime())) return false
  const now = new Date()
  return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() && d.getDate() === now.getDate()
}

async function loadStats() {
  loading.value = true
  try {
    const [schoolsRes, adminsRes, logsRes] = await Promise.all([
      listSchools(0, 1),
      listSchoolAdmins(0, 1),
      listAuditLogs(0, 1000),
    ])
    schoolTotal.value = schoolsRes?.total || 0
    adminTotal.value = adminsRes?.total || 0
    todayLogCount.value = (logsRes?.items || []).filter((it: any) => isToday(it.createdAt || it.created_at)).length
  } catch { schoolTotal.value = 0; adminTotal.value = 0; todayLogCount.value = 0
  } finally { loading.value = false }
}

onMounted(() => {
  greeting.value = getGreeting()
  timestamp.value = new Date().toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' })
  loadStats()
})

const quickLinks = [
  { label: '学校管理', desc: '管理所有学校信息', to: '/super/schools', icon: School },
  { label: '管理员管理', desc: '管理学校管理员账号', to: '/super/admins', icon: Users },
  { label: '审计日志', desc: '查看系统操作记录', to: '/super/audit-logs', icon: FileText },
  { label: '平台配置', desc: 'AI / 微信 / IM 等配置', to: '/super/config', icon: Settings },
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
          <div class="text-xl font-bold text-cocoa-900">{{ greeting }}，<span class="text-butter-700">{{ auth.user?.name || '超级管理员' }}</span></div>
          <div class="text-sm text-cocoa-600/80 mt-0.5">{{ timestamp }} · 超管工作台</div>
        </div>
      </div>
    </div>

    <!-- 统计卡片 -->
    <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
      <div class="stat-card">
        <div class="flex items-center gap-2 text-sm text-cocoa-500 mb-1">
          <School class="w-4 h-4 text-butter-500" /> 学校总数
        </div>
        <div class="text-3xl font-bold text-cocoa-900">
          <Loader2 v-if="loading" class="w-6 h-6 animate-spin text-butter-400" />
          <template v-else>{{ schoolTotal }}</template>
        </div>
      </div>
      <div class="stat-card">
        <div class="flex items-center gap-2 text-sm text-cocoa-500 mb-1">
          <Users class="w-4 h-4 text-mint-500" /> 管理员总数
        </div>
        <div class="text-3xl font-bold text-cocoa-900">
          <Loader2 v-if="loading" class="w-6 h-6 animate-spin text-butter-400" />
          <template v-else>{{ adminTotal }}</template>
        </div>
      </div>
      <div class="stat-card">
        <div class="flex items-center gap-2 text-sm text-cocoa-500 mb-1">
          <FileText class="w-4 h-4 text-sakura-500" /> 今日日志
        </div>
        <div class="text-3xl font-bold text-cocoa-900">
          <Loader2 v-if="loading" class="w-6 h-6 animate-spin text-butter-400" />
          <template v-else>{{ todayLogCount }}</template>
        </div>
      </div>
    </div>

    <!-- 快捷入口 -->
    <div>
      <h2 class="text-lg font-semibold text-cocoa-900 mb-3 flex items-center gap-2"><Sparkles class="w-5 h-5 text-butter-400" /> 快捷入口</h2>
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <button v-for="link in quickLinks" :key="link.to"
          class="quick-card text-left" @click="router.push(link.to)">
          <div class="flex items-center justify-between">
            <div class="w-10 h-10 rounded-xl bg-butter-100 flex items-center justify-center">
              <component :is="link.icon" class="w-5 h-5 text-butter-500" />
            </div>
            <ArrowRight class="w-4 h-4 text-cocoa-300 group-hover:text-butter-500 transition-colors" />
          </div>
          <div class="mt-3 text-base font-semibold text-cocoa-900">{{ link.label }}</div>
          <div class="text-xs text-cocoa-500 mt-0.5">{{ link.desc }}</div>
        </button>
      </div>
    </div>
  </div>
</template>
