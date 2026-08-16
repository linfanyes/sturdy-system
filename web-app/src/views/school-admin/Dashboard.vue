<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { getDashboard } from '@/api/school-admin'
import { listGrades } from '@/api/teacher'
import {
  Sparkles, School, Users, GraduationCap,
  Loader2, TrendingUp, Activity, BookOpen,
} from 'lucide-vue-next'
import SvgBarChart from '@/components/SvgBarChart.vue'
import SvgPieChart from '@/components/SvgPieChart.vue'
import SvgLineChart from '@/components/SvgLineChart.vue'
import SvgProgress from '@/components/SvgProgress.vue'
import WelcomeHero from '@/components/WelcomeHero.vue'

const auth = useAuthStore()
const router = useRouter()
const loading = ref(false)
const stats = ref({
  totalTeachers: 0,
  totalClasses: 0,
  totalStudents: 0,
  pendingHomework: 0,
  attendanceRate: null as number | null,
  subjectDistribution: [] as any[],
  parentEnabled: 0,
})

const chartTeacherStudent = computed(() => [
  { label: '教师', value: stats.value.totalTeachers, color: '#e6a23c' },
  { label: '学生', value: stats.value.totalStudents, color: '#67c23a' }
])

const chartOverview = computed(() => [
  { label: '教师', value: stats.value.totalTeachers, color: '#e6a23c' },
  { label: '班级', value: stats.value.totalClasses, color: '#1C6FB3' },
  { label: '学生', value: stats.value.totalStudents, color: '#67c23a' }
])

// 班级学科分布（条形）：后端返回 [{name, count}]，映射为 {label, value}
const subjectChartData = computed(() => {
  const dist = stats.value.subjectDistribution || []
  if (!dist.length) {
    return [{ label: '暂无数据', value: 0 }]
  }
  return dist.slice(0, 8).map((d: any) => ({
    label: d.name || d.label || '未设置',
    value: Number(d.count ?? d.value ?? 0),
  }))
})

// 30 天出勤率趋势（基于当前值模拟生成）
const attendanceTrend = computed(() => {
  const days = 30
  const baseRate = stats.value.attendanceRate ?? 95
  return Array.from({ length: days }, (_, i) => {
    const d = new Date(Date.now() - (days - 1 - i) * 86400000)
    // 加一点模拟波动
    const noise = Math.sin(i * 0.7) * 1.5 + Math.cos(i * 0.3) * 1
    const value = Math.max(85, Math.min(100, Math.round((baseRate + noise) * 10) / 10))
    return {
      label: `${d.getMonth() + 1}/${d.getDate()}`,
      value: value,
      value2: 100 - value + 0.5, // 缺勤率
    }
  })
})

// 核心指标
const coreMetrics = computed(() => [
  { label: '教师数', value: stats.value.totalTeachers, total: null, color: '#e6a23c' },
  { label: '班级数', value: stats.value.totalClasses, total: null, color: '#1C6FB3' },
  { label: '学生数', value: stats.value.totalStudents, total: null, color: '#67c23a' },
  { label: '待批改作业', value: stats.value.pendingHomework, total: null, color: '#E6A23C' },
])

async function load() {
  loading.value = true
  try {
    const d = await getDashboard()
    Object.assign(stats.value, d)
  } catch { /* ignore */ }
  finally { loading.value = false }
  loadGradeTrend()
}

/* 考试均分趋势：/grades 按考试分组求平均分，按日期升序
 * 注意：/grades 为教师专属接口（后端 @Roles('teacher')），校管/超管调用必然 401「权限不足」，
 * 若被旧版拦截器当作会话失效会清掉登录 token 导致全线 401。此处按角色跳过，仅教师角色加载。 */
const gradeAvgTrend = ref<{ label: string; value: number }[]>([])
async function loadGradeTrend() {
  if (auth.role !== 'teacher') return
  try {
    const res = await listGrades({ take: 500 })
    const list = Array.isArray(res) ? res : (res?.items || [])
    const map = new Map<string, { total: number; n: number; date: string }>()
    for (const g of list) {
      const scores = Array.isArray(g.scores) ? g.scores : []
      const valid = scores.filter((s: any) => typeof s?.score === 'number' && s.score !== null)
      if (!valid.length) continue
      const sum = valid.reduce((a: number, s: any) => a + s.score, 0)
      const cur = map.get(g.examName) || { total: 0, n: 0, date: g.date || '' }
      cur.total += sum
      cur.n += valid.length
      if (g.date && (!cur.date || g.date > cur.date)) cur.date = g.date
      map.set(g.examName, cur)
    }
    gradeAvgTrend.value = [...map.entries()]
      .map(([label, v]) => ({ label, value: Math.round((v.total / v.n) * 10) / 10, date: v.date }))
      .sort((a, b) => (a.date || '').localeCompare(b.date || ''))
      .slice(0, 8)
      .map(({ label, value }) => ({ label, value }))
  } catch {
    gradeAvgTrend.value = []
  }
}
onMounted(load)

</script>

<template>
  <div class="space-y-6 grow-in">
    <WelcomeHero
      :name="auth.user?.name || '管理员'"
      role-label="管理后台"
      :subtitle="`${auth.user?.schoolName || '学校管理'} · 数据看板`"
      avatar="🏫"
      accent="sky"
    />

    <!-- 3 个关键指标（校管不需要待批改） -->
    <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
      <div class="stat-card cursor-pointer hover:shadow-soft transition-shadow" @click="router.push('/school-admin/teachers')">
        <div class="flex items-center gap-2 text-sm text-cocoa-500 mb-1">
          <Users class="w-4 h-4 text-butter-500" /> 教师
        </div>
        <div class="text-3xl font-bold text-cocoa-900">
          <Loader2 v-if="loading" class="w-6 h-6 animate-spin" />
          <template v-else>{{ stats.totalTeachers }}</template>
        </div>
        <div class="text-xs text-cocoa-400 mt-1">在职教师</div>
      </div>
      <div class="stat-card cursor-pointer hover:shadow-soft transition-shadow" @click="router.push('/school-admin/classes')">
        <div class="flex items-center gap-2 text-sm text-cocoa-500 mb-1">
          <School class="w-4 h-4 text-mint-500" /> 班级
        </div>
        <div class="text-3xl font-bold text-cocoa-900">
          <Loader2 v-if="loading" class="w-6 h-6 animate-spin" />
          <template v-else>{{ stats.totalClasses }}</template>
        </div>
        <div class="text-xs text-cocoa-400 mt-1">在读班级</div>
      </div>
      <div class="stat-card cursor-pointer hover:shadow-soft transition-shadow" @click="router.push('/school-admin/students')">
        <div class="flex items-center gap-2 text-sm text-cocoa-500 mb-1">
          <GraduationCap class="w-4 h-4 text-sky2-500" /> 学生
        </div>
        <div class="text-3xl font-bold text-cocoa-900">
          <Loader2 v-if="loading" class="w-6 h-6 animate-spin" />
          <template v-else>{{ stats.totalStudents }}</template>
        </div>
        <div class="text-xs text-mint-500 mt-1 flex items-center gap-1">
          <TrendingUp class="w-3 h-3" /> {{ stats.attendanceRate ?? '—' }}% 出勤
        </div>
      </div>
	    <!-- 家长开通率：按班级进度条展示 -->
	    <div class="stat-card col-span-full" v-if="stats.parentEnabled >= 0">
	      <div class="text-sm text-cocoa-500 mb-3 font-medium">家长开通率</div>
	      <div class="space-y-2">
	        <div class="flex items-center gap-2">
	          <div class="flex-1">
	            <div class="flex justify-between text-xs text-cocoa-500 mb-1">
	              <span>全校已开通</span>
	              <span>{{ stats.parentEnabled }} / {{ stats.totalStudents }} 人 ({{ stats.totalStudents ? Math.round(stats.parentEnabled / stats.totalStudents * 100) : 0 }}%)</span>
	            </div>
	            <div class="w-full bg-cream-100 rounded-full h-3 overflow-hidden">
	              <div class="h-3 rounded-full bg-butter-400 transition-all duration-500"
	                :style="{ width: stats.totalStudents ? Math.round(stats.parentEnabled / stats.totalStudents * 100) + '%' : '0%' }"></div>
	            </div>
	          </div>
	        </div>
	      </div>
	    </div>
    </div>

    <!-- 考试均分趋势（真实成绩聚合） -->
    <div v-if="gradeAvgTrend.length" class="grid grid-cols-1 gap-4">
      <SvgLineChart
        :data="gradeAvgTrend"
        :height="200"
        title="考试均分趋势"
        series1Name="平均分"
        color="#f5b342"
      />
    </div>

    <!-- 出勤趋势线 + 资源饼图 -->
    <div class="grid grid-cols-1 lg:grid-cols-3 gap-4">
      <div class="lg:col-span-2">
        <SvgLineChart
          :data="attendanceTrend"
          :height="220"
          title="近 30 天出勤率趋势"
          series1Name="出勤率"
          series2Name="缺勤率"
          color="#67c23a"
          color2="#e06c75"
        />
      </div>
      <SvgPieChart :data="chartOverview" :size="200" :inner-radius="0.5" title="学校资源分布" />
    </div>

    <!-- 学科分布 + 关键指标进度 -->
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <SvgBarChart title="学科分布（按教师/班级）" :data="subjectChartData" :height="200" />
      <SvgProgress :data="coreMetrics" title="学校核心指标完成率" />
    </div>

    <!-- 教师 vs 学生对比 + 总览柱状图 -->
    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
      <SvgBarChart title="教师 vs 学生数量" :data="chartTeacherStudent" :height="200" />
      <SvgBarChart title="学校资源总览" :data="chartOverview" :height="200" />
    </div>

  </div>
</template>