<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { getDashboard } from '@/api/school-admin'
import { Sparkles, School, Users, GraduationCap, AlertCircle, ArrowRight, Loader2, TrendingUp } from 'lucide-vue-next'
import SvgBarChart from '@/components/SvgBarChart.vue'
import SvgPieChart from '@/components/SvgPieChart.vue'

const auth = useAuthStore()
const router = useRouter()
const loading = ref(false)
const stats = ref({ totalTeachers:0,totalClasses:0,totalStudents:0,pendingHomework:0,attendanceRate:null as number|null,subjectDistribution:[] as any[] })
const chartTeacherStudent = computed(() => [{label:'教师',value:stats.value.totalTeachers,color:'#e6a23c'},{label:'学生',value:stats.value.totalStudents,color:'#67c23a'}])
const chartOverview = computed(() => [{label:'教师',value:stats.value.totalTeachers,color:'#e6a23c'},{label:'班级',value:stats.value.totalClasses,color:'#409eff'},{label:'学生',value:stats.value.totalStudents,color:'#67c23a'}])
const greeting = computed(()=>{const h=new Date().getHours();return h<6?'夜深了':h<9?'早上好':h<12?'上午好':h<14?'中午好':h<18?'下午好':'晚上好'})

async function load() {
  loading.value=true
  try { const d=await getDashboard(); Object.assign(stats.value,d) } catch {}
  finally { loading.value=false }
}
onMounted(load)

const quickLinks = [
  {label:'教师管理',desc:'教师信息与账号',to:'/school-admin/teachers',icon:Users},
  {label:'班级管理',desc:'班级结构与数据',to:'/school-admin/classes',icon:School},
  {label:'学生管理',desc:'学生与家长关联',to:'/school-admin/students',icon:GraduationCap},
]
</script>

<template>
  <div class="space-y-6">
    <div class="welcome-banner">
      <div class="relative z-10 flex items-center gap-4">
        <div class="w-14 h-14 rounded-2xl bg-butter-500/30 backdrop-blur flex items-center justify-center"><Sparkles class="w-7 h-7 text-cocoa-800"/></div>
        <div class="flex-1">
          <div class="text-xl font-bold text-cocoa-900">{{ greeting }}，<span class="text-butter-700">{{ auth.user?.name||'管理员' }}</span></div>
          <div class="text-sm text-cocoa-600/80 mt-0.5">{{ auth.user?.schoolName||'学校管理' }} · 数据看板</div>
        </div>
      </div>
    </div>

    <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
      <div class="stat-card"><div class="flex items-center gap-2 text-sm text-cocoa-500 mb-1"><Users class="w-4 h-4 text-butter-500"/> 教师</div><div class="text-3xl font-bold text-cocoa-900"><Loader2 v-if="loading" class="w-6 h-6 animate-spin"/><template v-else>{{ stats.totalTeachers }}</template></div></div>
      <div class="stat-card"><div class="flex items-center gap-2 text-sm text-cocoa-500 mb-1"><School class="w-4 h-4 text-mint-500"/> 班级</div><div class="text-3xl font-bold text-cocoa-900"><Loader2 v-if="loading" class="w-6 h-6 animate-spin"/><template v-else>{{ stats.totalClasses }}</template></div></div>
      <div class="stat-card"><div class="flex items-center gap-2 text-sm text-cocoa-500 mb-1"><GraduationCap class="w-4 h-4 text-sky2-500"/> 学生</div><div class="text-3xl font-bold text-cocoa-900"><Loader2 v-if="loading" class="w-6 h-6 animate-spin"/><template v-else>{{ stats.totalStudents }}</template></div></div>
      <div class="stat-card"><div class="flex items-center gap-2 text-sm text-cocoa-500 mb-1"><AlertCircle class="w-4 h-4 text-sakura-500"/> 待批改</div><div class="text-3xl font-bold text-cocoa-900"><Loader2 v-if="loading" class="w-6 h-6 animate-spin"/><template v-else>{{ stats.pendingHomework }}</template></div></div>
    </div>

    <!-- 图表区 -->
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <SvgBarChart title="教师 vs 学生数量" :data="chartTeacherStudent" :height="200"/>
      <SvgPieChart :data="chartOverview" title="学校资源分布" :size="160" :inner-radius="0.45"/>
    </div>

    <div>
      <h2 class="text-lg font-semibold text-cocoa-900 mb-3 flex items-center gap-2"><Sparkles class="w-5 h-5 text-butter-400"/> 快速管理</h2>
      <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <button v-for="l in quickLinks" :key="l.to" class="quick-card text-left" @click="router.push(l.to)">
          <div class="flex items-center justify-between">
            <div class="w-10 h-10 rounded-xl bg-butter-100 flex items-center justify-center"><component :is="l.icon" class="w-5 h-5 text-butter-500"/></div>
            <ArrowRight class="w-4 h-4 text-cocoa-300"/>
          </div>
          <div class="mt-3 text-base font-semibold text-cocoa-900">{{ l.label }}</div>
          <div class="text-xs text-cocoa-500 mt-0.5">{{ l.desc }}</div>
        </button>
      </div>
    </div>
  </div>
</template>
