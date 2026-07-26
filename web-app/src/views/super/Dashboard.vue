<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { listSchools, listSchoolAdmins, listAuditLogs } from '@/api/admin'
import { Sparkles, School, Users, FileText, Settings, ArrowRight, Loader2, TrendingUp, Clock } from 'lucide-vue-next'
import SvgBarChart from '@/components/SvgBarChart.vue'
import SvgPieChart from '@/components/SvgPieChart.vue'

const auth = useAuthStore()
const router = useRouter()
const loading = ref(false)
const schoolTotal = ref(0); const adminTotal = ref(0)
const todayLogCount = ref(0); const weekLogCount = ref(0)
const schoolByStatus = ref<{label:string;value:number;color:string}[]>([])
const recentLogs = ref<any[]>([])
const logChartData = computed(() => [{label:'今天',value:todayLogCount.value},{label:'本周',value:weekLogCount.value}])
const greeting = computed(() => { const h=new Date().getHours(); return h<6?'夜深了':h<9?'早上好':h<12?'上午好':h<14?'中午好':h<18?'下午好':'晚上好' })

async function load() {
  loading.value = true
  try {
    const [schoolsR, adminsR, logsR] = await Promise.all([
      listSchools(0, 1000), listSchoolAdmins(0, 1000), listAuditLogs(0, 500),
    ])
    const schools = schoolsR?.items || []
    schoolTotal.value = schoolsR?.total || schools.length
    adminTotal.value = adminsR?.total || 0
    const logs = logsR?.items || []
    todayLogCount.value = logs.filter((l:any)=>isToday(l.createdAt??l.created_at)).length
    const now = new Date(); const weekAgo = new Date(now.getTime()-7*86400000)
    weekLogCount.value = logs.filter((l:any)=> { const d=new Date(l.createdAt??l.created_at); return d>=weekAgo }).length
    // 学校状态分布
    const active = schools.filter((s:any)=>s.status==='active').length
    const inactive = schools.length - active
    schoolByStatus.value = [{label:'活跃',value:active,color:'#67c23a'},{label:'停用',value:inactive,color:'#e06c75'}]
    recentLogs.value = logs.slice(0, 8)
  } catch { /* ignore */ }
  finally { loading.value = false }
}
onMounted(load)

function isToday(t?:string):boolean { if(!t) return false; const d=new Date(t); const now=new Date(); return d.toDateString()===now.toDateString() }
function shortTime(t?:string):string { if(!t) return ''; return new Date(t).toLocaleTimeString('zh-CN',{hour:'2-digit',minute:'2-digit'}) }
function logIcon(type?:string):string { const m:Record<string,string>={login:'🔑',create:'✅',update:'✏️',delete:'🗑️'}; return m[type||'']||'📋' }

const quickLinks = [
  { label:'学校管理',desc:'管理所有学校',to:'/super/schools',icon:School},
  { label:'管理员管理',desc:'管理学校管理员',to:'/super/admins',icon:Users},
  { label:'审计日志',desc:'系统操作记录',to:'/super/audit-logs',icon:FileText},
  { label:'平台配置',desc:'AI/微信/IM配置',to:'/super/config',icon:Settings},
]
</script>

<template>
  <div class="space-y-6">
    <!-- 欢迎横幅 -->
    <div class="welcome-banner">
      <div class="relative z-10 flex items-center gap-4">
        <div class="w-14 h-14 rounded-2xl bg-butter-500/30 backdrop-blur flex items-center justify-center"><Sparkles class="w-7 h-7 text-cocoa-800" /></div>
        <div class="flex-1">
          <div class="text-xl font-bold text-cocoa-900">{{ greeting }}，<span class="text-butter-700">{{ auth.user?.name||'超级管理员' }}</span></div>
          <div class="text-sm text-cocoa-600/80 mt-0.5">超级管理员工作台 · 全局概览</div>
        </div>
      </div>
    </div>

    <!-- 统计卡片 -->
    <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
      <div class="stat-card"><div class="flex items-center gap-2 text-sm text-cocoa-500 mb-1"><School class="w-4 h-4 text-butter-500"/> 学校</div><div class="text-3xl font-bold text-cocoa-900"><Loader2 v-if="loading" class="w-6 h-6 animate-spin"/><template v-else>{{ schoolTotal }}</template></div></div>
      <div class="stat-card"><div class="flex items-center gap-2 text-sm text-cocoa-500 mb-1"><Users class="w-4 h-4 text-mint-500"/> 管理员</div><div class="text-3xl font-bold text-cocoa-900"><Loader2 v-if="loading" class="w-6 h-6 animate-spin"/><template v-else>{{ adminTotal }}</template></div></div>
      <div class="stat-card"><div class="flex items-center gap-2 text-sm text-cocoa-500 mb-1"><TrendingUp class="w-4 h-4 text-sky2-500"/> 本周日志</div><div class="text-3xl font-bold text-cocoa-900"><Loader2 v-if="loading" class="w-6 h-6 animate-spin"/><template v-else>{{ weekLogCount }}</template></div></div>
      <div class="stat-card"><div class="flex items-center gap-2 text-sm text-cocoa-500 mb-1"><Clock class="w-4 h-4 text-sakura-500"/> 今日日志</div><div class="text-3xl font-bold text-cocoa-900"><Loader2 v-if="loading" class="w-6 h-6 animate-spin"/><template v-else>{{ todayLogCount }}</template></div></div>
    </div>

    <!-- 图表区 -->
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <SvgPieChart :data="schoolByStatus" :size="160" :inner-radius="0.5" title="学校状态分布" />
      <SvgBarChart :data="logChartData" title="日志活跃趋势" :height="160" />
    </div>

    <!-- 最近日志 + 快捷入口 -->
    <div class="grid grid-cols-1 lg:grid-cols-[1.2fr_0.8fr] gap-4">
      <div class="bg-white rounded-2xl p-5 shadow-softer">
        <div class="text-sm font-semibold text-cocoa-700 mb-3 flex items-center justify-between">
          <span>📋 最近审计日志</span>
          <button class="text-xs text-cocoa-400 hover:text-butter-500" @click="router.push('/super/audit-logs')">全部 →</button>
        </div>
        <div v-if="loading" class="text-cocoa-400 text-sm text-center py-6">加载中…</div>
        <div v-else-if="!recentLogs.length" class="text-cocoa-400 text-sm text-center py-6">暂无日志</div>
        <div v-else class="space-y-1">
          <div v-for="(l,i) in recentLogs" :key="i" class="flex items-center gap-3 py-2 border-b border-cream-100/50 last:border-0 text-sm">
            <span class="text-base">{{ logIcon(l.action||l.type) }}</span>
            <span class="text-cocoa-600 flex-1 truncate">{{ l.detail||l.message||'-' }}</span>
            <span class="text-cocoa-400 text-xs whitespace-nowrap">{{ shortTime(l.createdAt) }}</span>
          </div>
        </div>
      </div>
      <div class="space-y-4">
        <h3 class="text-sm font-semibold text-cocoa-700 flex items-center gap-2"><Sparkles class="w-4 h-4 text-butter-400"/> 快捷入口</h3>
        <button v-for="l in quickLinks" :key="l.to" class="quick-card w-full text-left" @click="router.push(l.to)">
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-3">
              <div class="w-10 h-10 rounded-xl bg-butter-100 flex items-center justify-center"><component :is="l.icon" class="w-5 h-5 text-butter-500"/></div>
              <div><div class="font-semibold text-cocoa-900 text-sm">{{ l.label }}</div><div class="text-xs text-cocoa-400">{{ l.desc }}</div></div>
            </div>
            <ArrowRight class="w-4 h-4 text-cocoa-300"/>
          </div>
        </button>
      </div>
    </div>
  </div>
</template>
