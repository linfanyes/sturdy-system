<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { getDashboard } from '@/api/school-admin'
import { Sparkles, School, Users, GraduationCap, AlertCircle, ArrowRight, Loader2 } from 'lucide-vue-next'

const auth = useAuthStore()
const router = useRouter()
const loading = ref(false)
const stats = ref({ totalTeachers: 0, totalClasses: 0, totalStudents: 0, pendingHomework: 0, attendanceRate: null as number | null })
const greeting = computed(() => { const h = new Date().getHours(); return h < 6 ? '夜深了' : h < 9 ? '早上好' : h < 12 ? '上午好' : h < 14 ? '中午好' : h < 18 ? '下午好' : '晚上好' })

async function load() {
  loading.value = true
  try { const d = await getDashboard(); Object.assign(stats.value, d) } catch { /* ignore */ }
  finally { loading.value = false }
}
onMounted(load)

const quickLinks = [
  { label: '教师管理', desc: '管理教师信息与账号', to: '/school-admin/teachers', icon: Users },
  { label: '班级管理', desc: '管理班级结构与数据', to: '/school-admin/classes', icon: School },
  { label: '学生管理', desc: '学生信息与家长关联', to: '/school-admin/students', icon: GraduationCap },
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
          <div class="text-xl font-bold text-cocoa-900">{{ greeting }}，<span class="text-butter-700">{{ auth.user?.name || '管理员' }}</span></div>
          <div class="text-sm text-cocoa-600/80 mt-0.5">{{ auth.user?.schoolName || '学校管理' }} · 管理员工作台</div>
        </div>
      </div>
    </div>

    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <div class="stat-card">
        <div class="flex items-center gap-2 text-sm text-cocoa-500 mb-1"><Users class="w-4 h-4 text-butter-500" /> 教师</div>
        <div class="text-3xl font-bold text-cocoa-900"><Loader2 v-if="loading" class="w-6 h-6 animate-spin text-butter-400" /><template v-else>{{ stats.totalTeachers }}</template></div>
      </div>
      <div class="stat-card">
        <div class="flex items-center gap-2 text-sm text-cocoa-500 mb-1"><School class="w-4 h-4 text-mint-500" /> 班级</div>
        <div class="text-3xl font-bold text-cocoa-900"><Loader2 v-if="loading" class="w-6 h-6 animate-spin text-butter-400" /><template v-else>{{ stats.totalClasses }}</template></div>
      </div>
      <div class="stat-card">
        <div class="flex items-center gap-2 text-sm text-cocoa-500 mb-1"><GraduationCap class="w-4 h-4 text-sky2-500" /> 学生</div>
        <div class="text-3xl font-bold text-cocoa-900"><Loader2 v-if="loading" class="w-6 h-6 animate-spin text-butter-400" /><template v-else>{{ stats.totalStudents }}</template></div>
      </div>
      <div class="stat-card">
        <div class="flex items-center gap-2 text-sm text-cocoa-500 mb-1"><AlertCircle class="w-4 h-4 text-sakura-500" /> 待批改</div>
        <div class="text-3xl font-bold text-cocoa-900"><Loader2 v-if="loading" class="w-6 h-6 animate-spin text-butter-400" /><template v-else>{{ stats.pendingHomework }}</template></div>
      </div>
    </div>

    <div>
      <h2 class="text-lg font-semibold text-cocoa-900 mb-3 flex items-center gap-2"><Sparkles class="w-5 h-5 text-butter-400" /> 快速管理</h2>
      <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <button v-for="link in quickLinks" :key="link.to" class="quick-card text-left" @click="router.push(link.to)">
          <div class="flex items-center justify-between">
            <div class="w-10 h-10 rounded-xl bg-butter-100 flex items-center justify-center">
              <component :is="link.icon" class="w-5 h-5 text-butter-500" />
            </div>
            <ArrowRight class="w-4 h-4 text-cocoa-300" />
          </div>
          <div class="mt-3 text-base font-semibold text-cocoa-900">{{ link.label }}</div>
          <div class="text-xs text-cocoa-500 mt-0.5">{{ link.desc }}</div>
        </button>
      </div>
    </div>
  </div>
</template>
