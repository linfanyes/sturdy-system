<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { listSchools, listSchoolAdmins, listTeachers } from '@/api/admin'
import { School, Users, Loader2, ArrowRight, TrendingUp } from 'lucide-vue-next'
import SvgPieChart from '@/components/SvgPieChart.vue'
import SvgProgress from '@/components/SvgProgress.vue'
import WelcomeHero from '@/components/WelcomeHero.vue'

const auth = useAuthStore()
const router = useRouter()
const loading = ref(false)
const schoolTotal = ref(0); const adminTotal = ref(0)
const schoolByStatus = ref<{label:string;value:number;color:string}[]>([])

// 学校状态占比 → 使用 SvgPieChart（需 name/value/color 结构）
const schoolStatusPie = computed(() => schoolByStatus.value)

// Top5 学校规模（横向条形：教师数）
const topSchools = ref<{ name: string; count: number; pct: number }[]>([])
const schoolName = new Map<string, string>()

// 今日日期展示
const todayLabel = computed(() => {
  const d = new Date()
  const wk = ['周日','周一','周二','周三','周四','周五','周六'][d.getDay()]
  return `${d.getMonth() + 1}月${d.getDate()}日 · ${wk}`
})

// Top5 排名配色（金/银/铜 + 柔彩）
const rankColors = ['#F5B342', '#C0C0C0', '#CD7F32', '#9BE0A8', '#FFB8CC']
const rankBg = ['rgba(245,179,66,0.12)', 'rgba(192,192,192,0.10)', 'rgba(205,127,50,0.10)', 'rgba(155,224,168,0.12)', 'rgba(255,184,204,0.12)']

async function load() {
  loading.value = true
  try {
    const [schoolsR, adminsR, teachersR] = await Promise.all([
      listSchools(0, 1000), listSchoolAdmins(0, 1000), listTeachers(0, 500)
    ])
    const schools = schoolsR?.items || []
    schoolTotal.value = schoolsR?.total || schools.length
    adminTotal.value = adminsR?.total || 0

    const active = schools.filter((s: any) => s.status === 'active').length
    const inactive = schools.length - active
    schoolByStatus.value = [
      { label: '活跃', value: active, color: '#4AAE7A' },
      { label: '停用', value: inactive, color: '#e06c75' }
    ]

    // 学校 id → 名称映射
    for (const s of schools) schoolName.set(s.id, s.name || s.id)

    // Top5 学校规模（教师数聚合）
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
  } catch { /* ignore */ }
  finally { loading.value = false }
}
onMounted(load)
</script>

<template>
  <div class="space-y-6 grow-in">
    <!-- 欢迎横幅 -->
    <WelcomeHero
      :name="auth.user?.name || '超级管理员'"
      role-label="工作台"
      subtitle="全局概览"
      avatar="👑"
      accent="butter"
    >
      <template #actions>
        <span class="hidden sm:inline-flex items-center gap-1.5 text-xs text-cocoa-500 bg-white/50 backdrop-blur-sm rounded-full px-3 py-1.5 border border-white/60">
          <span class="w-1.5 h-1.5 rounded-full bg-mint-400 animate-pulse"></span>
          {{ todayLabel }}
        </span>
      </template>
    </WelcomeHero>

    <!-- 关键指标卡片（学校 / 管理员） -->
    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
      <!-- 学校卡片 -->
      <div class="stat-card group" @click="router.push('/super/schools')">
        <div class="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-butter-300 via-butter-400 to-sakura-300 rounded-t-2xl"></div>
        <div class="flex items-start justify-between">
          <div class="flex-1">
            <div class="flex items-center gap-2 text-sm text-cocoa-500 mb-1">
              <span class="w-8 h-8 rounded-xl bg-butter-100 flex items-center justify-center">
                <School class="w-4 h-4 text-butter-500" />
              </span>
              学校
            </div>
            <div class="flex items-baseline gap-1">
              <Loader2 v-if="loading" class="w-6 h-6 animate-spin text-butter-400" />
              <span v-else class="text-4xl font-extrabold text-cocoa-900 tracking-tight tabular-nums">{{ schoolTotal }}</span>
              <span class="text-sm text-cocoa-400 ml-0.5">所</span>
            </div>
            <div class="flex items-center gap-1 mt-1">
              <TrendingUp class="w-3 h-3 text-mint-500" />
              <span class="text-xs text-mint-600">已覆盖</span>
            </div>
          </div>
          <div class="w-10 h-10 rounded-2xl bg-butter-50 flex items-center justify-center group-hover:bg-butter-100 transition-colors">
            <ArrowRight class="w-4 h-4 text-butter-400 opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300" />
          </div>
        </div>
      </div>

      <!-- 管理员卡片 -->
      <div class="stat-card group" @click="router.push('/super/admins')">
        <div class="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-mint-300 via-mint-400 to-sky2-300 rounded-t-2xl"></div>
        <div class="flex items-start justify-between">
          <div class="flex-1">
            <div class="flex items-center gap-2 text-sm text-cocoa-500 mb-1">
              <span class="w-8 h-8 rounded-xl bg-mint-100 flex items-center justify-center">
                <Users class="w-4 h-4 text-mint-500" />
              </span>
              管理员
            </div>
            <div class="flex items-baseline gap-1">
              <Loader2 v-if="loading" class="w-6 h-6 animate-spin text-mint-400" />
              <span v-else class="text-4xl font-extrabold text-cocoa-900 tracking-tight tabular-nums">{{ adminTotal }}</span>
              <span class="text-sm text-cocoa-400 ml-0.5">位</span>
            </div>
            <div class="flex items-center gap-1 mt-1">
              <span class="w-3 h-3 rounded-full bg-mint-400 flex items-center justify-center">
                <span class="w-1.5 h-1.5 rounded-full bg-white"></span>
              </span>
              <span class="text-xs text-cocoa-400">已分配</span>
            </div>
          </div>
          <div class="w-10 h-10 rounded-2xl bg-mint-50 flex items-center justify-center group-hover:bg-mint-100 transition-colors">
            <ArrowRight class="w-4 h-4 text-mint-400 opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300" />
          </div>
        </div>
      </div>
    </div>

    <!-- Top5 学校规模（按教师数） -->
    <div class="stat-card p-5">
      <div class="flex items-center justify-between mb-4">
        <div class="flex items-center gap-2">
          <span class="w-7 h-7 rounded-lg bg-butter-100 flex items-center justify-center">
            <TrendingUp class="w-3.5 h-3.5 text-butter-500" />
          </span>
          <span class="text-sm font-semibold text-cocoa-700">Top5 学校规模</span>
        </div>
        <span class="text-xs text-cocoa-400 bg-cream-50 px-2 py-0.5 rounded-full">按教师数</span>
      </div>

      <!-- 骨架屏 -->
      <div v-if="loading" class="space-y-3 py-2">
        <div v-for="i in 5" :key="i" class="h-10 rounded-xl bg-cream-100 animate-pulse" :style="{ width: `${95 - i * 12}%` }" />
      </div>

      <!-- 数据展示 -->
      <div v-else-if="topSchools.length" class="space-y-2.5">
        <div
          v-for="(s, idx) in topSchools"
          :key="s.name"
          class="group relative flex items-center gap-3 p-2.5 rounded-xl hover:bg-cream-50/80 transition-colors"
        >
          <!-- 排名徽章 -->
          <div
            class="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold shrink-0 transition-transform group-hover:scale-110"
            :style="{
              background: rankBg[idx],
              color: idx < 3 ? rankColors[idx] : 'rgb(var(--cocoa-600))'
            }"
          >
            {{ idx + 1 }}
          </div>

          <!-- 学校名 + 条形图 -->
          <div class="flex-1 min-w-0">
            <div class="flex items-center justify-between mb-1">
              <span class="text-sm text-cocoa-700 font-medium truncate">{{ s.name }}</span>
              <span class="text-sm font-bold text-cocoa-800 tabular-nums ml-2">{{ s.count }}<span class="text-xs text-cocoa-400 font-normal ml-0.5">人</span></span>
            </div>
            <div class="h-2.5 rounded-full bg-cream-100 overflow-hidden relative">
              <div
                class="h-full rounded-full transition-all duration-1000 ease-out relative overflow-hidden"
                :style="{
                  width: s.pct + '%',
                  background: `linear-gradient(90deg, ${rankColors[idx]}cc, ${rankColors[idx]})`
                }"
              >
                <!-- 条形图内高光 -->
                <div class="absolute inset-0 bg-gradient-to-b from-white/30 to-transparent rounded-full"></div>
              </div>
            </div>
          </div>

          <!-- 占比百分比 -->
          <span class="w-10 shrink-0 text-right text-xs text-cocoa-400 tabular-nums">{{ s.pct }}%</span>
        </div>
      </div>

      <!-- 空状态 -->
      <div v-else class="empty-state py-10">
        <span class="icon opacity-40">🏫</span>
        <span class="desc">暂无学校数据</span>
      </div>
    </div>

    <!-- 学校状态 + 核心指标进度 -->
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <SvgPieChart :data="schoolStatusPie" :size="200" :inner-radius="0.5" title="学校状态分布" />
      <SvgProgress
        :data="[
          { label: '已启用学校', value: schoolByStatus.find(s => s.label === '活跃')?.value || 0, total: schoolTotal, color: '#4AAE7A' },
          { label: '学校管理员', value: adminTotal, total: schoolTotal * 2 || 1, color: '#1C6FB3' }
        ]"
        title="平台核心指标"
      />
    </div>
  </div>
</template>

<style scoped>
/* 统计卡片 —— 增强版（在全局 stat-card 基础上叠加） */
.stat-card:focus-visible {
  outline: none;
  box-shadow: 0 0 0 3px rgba(245, 179, 66, 0.3);
}

/* 暗色模式适配覆盖 */
.dark .stat-card .group:hover {
  background: rgba(68, 61, 52, 0.5);
}
</style>
