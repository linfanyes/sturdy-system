<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { listSchools, listSchoolAdmins, listTeachers } from '@/api/admin'
import { School, Users, Loader2 } from 'lucide-vue-next'
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
    />

    <!-- 关键指标卡片（学校 / 管理员） -->
    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div class="stat-card cursor-pointer hover:shadow-soft transition-shadow" @click="router.push('/super/schools')">
        <div class="flex items-center gap-2 text-sm text-cocoa-500 mb-1">
          <School class="w-4 h-4 text-butter-500" /> 学校
        </div>
        <div class="text-3xl font-bold text-cocoa-900">
          <Loader2 v-if="loading" class="w-6 h-6 animate-spin" />
          <template v-else>{{ schoolTotal }}</template>
        </div>
        <div class="text-xs text-cocoa-400 mt-1">所学校</div>
      </div>
      <div class="stat-card cursor-pointer hover:shadow-soft transition-shadow" @click="router.push('/super/admins')">
        <div class="flex items-center gap-2 text-sm text-cocoa-500 mb-1">
          <Users class="w-4 h-4 text-mint-500" /> 管理员
        </div>
        <div class="text-3xl font-bold text-cocoa-900">
          <Loader2 v-if="loading" class="w-6 h-6 animate-spin" />
          <template v-else>{{ adminTotal }}</template>
        </div>
        <div class="text-xs text-cocoa-400 mt-1">位管理员</div>
      </div>
    </div>

    <!-- Top5 学校规模（按教师数） -->
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