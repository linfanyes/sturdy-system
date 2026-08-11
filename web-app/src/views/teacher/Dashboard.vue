<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { listMyClasses, listAllStudents, listGrades, type TeacherClass } from '@/api/teacher'
import { crudList } from '@/api/teacher'
import { getUnreadCount } from '@/api/notification'
import {
  Sparkles, School, GraduationCap, BookOpen, Bell, ChevronRight, Loader2,
  Users, ClipboardList, BarChart3, PieChart, CalendarDays, Trophy,
} from 'lucide-vue-next'
import WelcomeHero from '@/components/WelcomeHero.vue'
import EmptyState from '@/components/EmptyState.vue'
import SvgLineChart from '@/components/SvgLineChart.vue'

const auth = useAuthStore()
const router = useRouter()
const loading = ref(true)
const classes = ref<TeacherClass[]>([])
const unreadCount = ref(0)

// —— 图表数据 ——
const chartLoading = ref(true)
const students = ref<any[]>([])
const recentExams = ref<any[]>([])
const awards = ref<any[]>([])
const homeworkList = ref<any[]>([])
const attendanceList = ref<any[]>([])

function unwrap(res: any): any[] {
  return Array.isArray(res) ? res : (res?.items || [])
}

const todayStr = new Date().toISOString().slice(0, 10)

async function load() {
  loading.value = true
  try {
    const list = await listMyClasses() as any
    classes.value = unwrap(list)
    const res = await getUnreadCount()
    unreadCount.value = res?.count ?? 0
  } catch { classes.value = [] } finally { loading.value = false }
}

async function loadCharts() {
  chartLoading.value = true
  const [stu, exams, aw, hw, att] = await Promise.allSettled([
    listAllStudents({ take: 500 }),
    crudList('/exams', { take: 5 }),
    crudList('/award-records', { take: 200 }),
    crudList('/homework', { take: 200 }),
    crudList('/attendances', { params: { date: todayStr } }),
  ])
  if (stu.status === 'fulfilled') students.value = unwrap(stu.value)
  if (exams.status === 'fulfilled') recentExams.value = unwrap(exams.value)
  if (aw.status === 'fulfilled') awards.value = unwrap(aw.value)
  if (hw.status === 'fulfilled') homeworkList.value = unwrap(hw.value)
  if (att.status === 'fulfilled') attendanceList.value = unwrap(att.value)
  loadGradeTrend()
  chartLoading.value = false
}

/* 考试均分趋势：/grades 按考试分组求平均分，按日期升序 */
const gradeAvgTrend = ref<{ label: string; value: number }[]>([])
async function loadGradeTrend() {
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
onMounted(() => { load(); loadCharts() })

/* —— 概览统计 —— */
const totalStudents = computed(() => students.value.length)
const totalClasses = computed(() => classes.value.length)
const totalExams = computed(() => recentExams.value.length)

/* 待批改作业数 */
const pendingHomeworkCount = computed(() => {
  if (!homeworkList.value.length) return 0
  return homeworkList.value.filter((h: any) => h.status !== '已批改' && h.status !== '已发还').length
})

/* 今日出勤率 */
const todayAttendanceRate = computed(() => {
  if (!attendanceList.value.length) return null
  let total = 0
  let present = 0
  attendanceList.value.forEach((a: any) => {
    const recs = Array.isArray(a.records) ? a.records : []
    recs.forEach((r: any) => {
      total++
      if (r.status === '出勤' || r.status === 'present') present++
    })
  })
  return total ? Math.round((present / total) * 100) : null
})

/* —— 图表 1：各班学生分布（横向条形） —— */
const classDist = computed(() => {
  if (!classes.value.length || !students.value.length) return []
  const map = new Map<string, number>()
  for (const s of students.value) {
    const key = s.classId || ''
    map.set(key, (map.get(key) || 0) + 1)
  }
  const max = Math.max(1, ...map.values())
  return classes.value.map((c) => {
    const count = map.get(c.id) || 0
    return { name: c.name, count, pct: Math.round((count / max) * 100) }
  })
})

/* —— 图表 2：性别构成（SVG 环形） —— */
const genderDist = computed(() => {
  let male = 0, female = 0, other = 0
  for (const s of students.value) {
    const g = String(s.gender || '').trim()
    if (g === '男' || g === 'M' || g === 'male' || g === '1') male++
    else if (g === '女' || g === 'F' || g === 'female' || g === '2') female++
    else other++
  }
  const total = Math.max(1, male + female + other)
  const C = 2 * Math.PI * 40 // 周长
  return {
    male, female, other, total,
    malePct: (male / total) * 100,
    femalePct: (female / total) * 100,
    maleLen: (male / total) * C,
    femaleLen: (female / total) * C,
    otherLen: (other / total) * C,
  }
})

/* —— 图表 3：考试均分趋势（见 loadGradeTrend / gradeAvgTrend） —— */

/* —— 图表 4：家长开通率 —— */
const parentEnabled = computed(() => {
  return students.value.filter((s: any) => s.parentEnabled || s.parentLogin === '已开通' || s.parentLogin === true || s.parentId).length
})
const parentEnabledPct = computed(() => {
  return students.value.length ? Math.round((parentEnabled.value / students.value.length) * 100) : 0
})

/* —— 各班家长开通率 —— */
const classParentRates = computed(() => {
  if (!classes.value.length || !students.value.length) return []
  return classes.value.map(c => {
    const classStudents = students.value.filter((s: any) => s.classId === c.id)
    const enabled = classStudents.filter((s: any) => s.parentEnabled || s.parentLogin === '已开通' || s.parentLogin === true || s.parentId).length
    return { name: c.name, count: enabled, total: classStudents.length, pct: classStudents.length ? Math.round((enabled / classStudents.length) * 100) : 0 }
  }).filter(c => c.total > 0)
})

const shortcutTools = [
  { label: '记考勤', icon: '✅', to: '/teacher/attendance', color: '#e8f9e8' },
  { label: '布置作业', icon: '📝', to: '/teacher/homework', color: '#fff3d6' },
  { label: '发通知', icon: '📢', to: '/teacher/notices', color: '#e8f1fb' },
  { label: 'AI 对话', icon: '🤖', to: '/teacher/ai-chat', color: '#f0e8fb' },
]
</script>

<template>
  <div class="space-y-6">
    <!-- 欢迎横幅 -->
    <WelcomeHero
      :name="auth.user?.name || '老师'"
      :badge="auth.user?.position || ''"
      :subtitle="`${auth.user?.schoolName || '学校'}${auth.user?.teacherNo ? ' · 编号：' + auth.user.teacherNo : ''}`"
      avatar="🍎"
      accent="mint"
    >
      <template #actions>
        <button class="relative p-2 rounded-xl bg-surface/60 hover:bg-surface/90 transition-colors" @click="router.push('/teacher/notifications')">
          <Bell class="w-5 h-5 text-cocoa-600" />
          <span v-if="unreadCount > 0" class="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-sakura-500 text-white text-xs font-semibold flex items-center justify-center">{{ unreadCount > 99 ? '99+' : unreadCount }}</span>
        </button>
      </template>
    </WelcomeHero>

    <!-- 概览卡片（可点击跳转） -->
    <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
      <div class="stat-card cursor-pointer hover:shadow-soft transition-shadow" @click="router.push('/teacher/classes')">
        <div class="flex items-center gap-2 text-sm text-cocoa-500 mb-1"><GraduationCap class="w-4 h-4 text-butter-500" /> 班级</div>
        <div class="text-3xl font-bold text-cocoa-900">
          <template v-if="loading"><div class="h-8 w-16 bg-cream-100 rounded-lg animate-pulse"></div></template>
          <template v-else>{{ classes.length }}</template>
        </div>
      </div>
      <div class="stat-card cursor-pointer hover:shadow-soft transition-shadow" @click="router.push('/teacher/students')">
        <div class="flex items-center gap-2 text-sm text-cocoa-500 mb-1"><Users class="w-4 h-4 text-mint-500" /> 学生</div>
        <div class="text-3xl font-bold text-cocoa-900">
          <template v-if="loading"><div class="h-8 w-16 bg-cream-100 rounded-lg animate-pulse"></div></template>
          <template v-else>{{ totalStudents }}</template>
        </div>
      </div>
      <div class="stat-card cursor-pointer hover:shadow-soft transition-shadow" @click="router.push('/teacher/exams')">
        <div class="flex items-center gap-2 text-sm text-cocoa-500 mb-1"><CalendarDays class="w-4 h-4 text-sky2-500" /> 考试</div>
        <div class="text-3xl font-bold text-cocoa-900">
          <template v-if="loading"><div class="h-8 w-16 bg-cream-100 rounded-lg animate-pulse"></div></template>
          <template v-else>{{ totalExams }}</template>
        </div>
      </div>
      <div class="stat-card cursor-pointer hover:shadow-soft transition-shadow" @click="router.push('/teacher/rewards')">
        <div class="flex items-center gap-2 text-sm text-cocoa-500 mb-1"><Trophy class="w-4 h-4 text-sakura-500" /> 奖励记录</div>
        <div class="text-3xl font-bold text-cocoa-900">
          <template v-if="loading"><div class="h-8 w-16 bg-cream-100 rounded-lg animate-pulse"></div></template>
          <template v-else>{{ awards.length }}</template>
        </div>
        <div class="text-xs text-cocoa-400 mt-1">条奖励记录</div>
      </div>
      <div class="stat-card cursor-pointer hover:shadow-soft transition-shadow" @click="router.push('/teacher/homework')">
        <div class="flex items-center gap-2 text-sm text-cocoa-500 mb-1"><BookOpen class="w-4 h-4 text-butter-500" /> 待批作业</div>
        <div class="text-3xl font-bold text-cocoa-900">
          <template v-if="chartLoading"><div class="h-8 w-16 bg-cream-100 rounded-lg animate-pulse"></div></template>
          <template v-else>{{ pendingHomeworkCount }}</template>
        </div>
        <div class="text-xs text-cocoa-400 mt-1">份待批改</div>
      </div>
      <div class="stat-card">
        <div class="flex items-center gap-2 text-sm text-cocoa-500 mb-1"><CalendarDays class="w-4 h-4 text-mint-500" /> 今日出勤</div>
        <div class="text-3xl font-bold text-cocoa-900">
          <template v-if="chartLoading"><div class="h-8 w-12 bg-cream-100 rounded-lg animate-pulse"></div></template>
          <template v-else>{{ todayAttendanceRate ?? '—' }}<span v-if="todayAttendanceRate !== null" class="text-lg">%</span></template>
        </div>
        <div class="text-xs text-cocoa-400 mt-1">出勤率</div>
      </div>
    </div>

    <!-- 📊 数据一览（可视化图表区） -->
    <div>
      <h2 class="section-title"><BarChart3 class="w-5 h-5 text-butter-400" /> 数据一览</h2>
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <!-- 图表 1：各班学生分布 -->
        <div class="stat-card">
          <div class="flex items-center justify-between mb-3">
            <div class="flex items-center gap-2 text-sm font-medium text-cocoa-700"><Users class="w-4 h-4 text-butter-500" /> 各班学生分布</div>
            <span class="text-xs text-cocoa-400">{{ totalStudents }} 人</span>
          </div>
          <div v-if="chartLoading" class="space-y-2.5 py-2">
            <div v-for="i in 3" :key="i" class="h-5 rounded-lg bg-cream-100 animate-pulse" :style="{ width: `${90 - i * 15}%` }" />
          </div>
          <div v-else-if="classDist.length" class="space-y-2.5">
            <div v-for="c in classDist" :key="c.name" class="flex items-center gap-2">
              <span class="w-16 shrink-0 truncate text-xs text-cocoa-600">{{ c.name }}</span>
              <div class="flex-1 h-5 rounded-full bg-cream-100 overflow-hidden">
                <div
                  class="h-full rounded-full bg-gradient-to-r from-butter-300 to-butter-500 transition-all duration-700"
                  :style="{ width: c.pct + '%' }"
                />
              </div>
              <span class="w-8 shrink-0 text-right text-xs font-semibold text-cocoa-700">{{ c.count }}</span>
            </div>
          </div>
          <EmptyState v-else icon="📊" title="暂无班级数据" desc="分配班级后这里会展示学生分布" />
        </div>

        <!-- 图表 2：性别构成（SVG 环形） -->
        <div class="stat-card">
          <div class="flex items-center justify-between mb-3">
            <div class="flex items-center gap-2 text-sm font-medium text-cocoa-700"><PieChart class="w-4 h-4 text-mint-500" /> 性别构成</div>
            <span class="text-xs text-cocoa-400">{{ genderDist.total }} 人</span>
          </div>
          <div v-if="chartLoading" class="flex items-center justify-center py-4">
            <div class="w-24 h-24 rounded-full bg-cream-100 animate-pulse" />
          </div>
          <div v-else-if="genderDist.total > 1" class="flex items-center gap-6">
            <!-- 环形图 -->
            <svg viewBox="0 0 100 100" class="w-28 h-28 shrink-0 -rotate-90">
              <circle cx="50" cy="50" r="40" fill="none" stroke="#f2ecdf" stroke-width="12" />
              <circle
                v-if="genderDist.male > 0" cx="50" cy="50" r="40" fill="none"
                stroke="#4AAE7A" stroke-width="12" stroke-linecap="round"
                :stroke-dasharray="`${genderDist.maleLen} ${2 * Math.PI * 40 - genderDist.maleLen}`"
              />
              <circle
                v-if="genderDist.female > 0" cx="50" cy="50" r="40" fill="none"
                stroke="#E7698C" stroke-width="12"
                :stroke-dasharray="`${genderDist.femaleLen} ${2 * Math.PI * 40 - genderDist.femaleLen}`"
                :stroke-dashoffset="-genderDist.maleLen"
              />
            </svg>
            <!-- 图例 -->
            <div class="space-y-2.5">
              <div class="flex items-center gap-2">
                <span class="w-3 h-3 rounded-full" style="background:#4AAE7A" />
                <span class="text-xs text-cocoa-600">男生</span>
                <span class="ml-auto text-sm font-bold text-cocoa-800">{{ genderDist.male }}</span>
                <span class="w-10 text-right text-xs text-cocoa-400">{{ genderDist.malePct.toFixed(1) }}%</span>
              </div>
              <div class="flex items-center gap-2">
                <span class="w-3 h-3 rounded-full" style="background:#E7698C" />
                <span class="text-xs text-cocoa-600">女生</span>
                <span class="ml-auto text-sm font-bold text-cocoa-800">{{ genderDist.female }}</span>
                <span class="w-10 text-right text-xs text-cocoa-400">{{ genderDist.femalePct.toFixed(1) }}%</span>
              </div>
              <div v-if="genderDist.other > 0" class="flex items-center gap-2">
                <span class="w-3 h-3 rounded-full bg-cream-300" />
                <span class="text-xs text-cocoa-600">未设置</span>
                <span class="ml-auto text-sm font-bold text-cocoa-800">{{ genderDist.other }}</span>
              </div>
            </div>
          </div>
          <EmptyState v-else icon="🧑‍🤝‍🧑" title="暂无学生数据" desc="导入学生后展示性别比例" />
        </div>

        <!-- 图表 3：考试均分趋势（真实成绩聚合折线） -->
        <div class="stat-card">
          <div class="flex items-center justify-between mb-3">
            <div class="flex items-center gap-2 text-sm font-medium text-cocoa-700"><CalendarDays class="w-4 h-4 text-sky2-500" /> 考试均分趋势</div>
            <span class="text-xs text-cocoa-400">按考试聚合平均分</span>
          </div>
          <div v-if="chartLoading" class="py-2 h-24">
            <div class="h-full rounded-lg bg-cream-100 animate-pulse" />
          </div>
          <div v-else-if="gradeAvgTrend.length">
            <SvgLineChart :data="gradeAvgTrend" :height="200" title="" series1Name="平均分" color="#f5b342" />
          </div>
          <EmptyState v-else icon="📈" title="暂无成绩数据" desc="录入成绩后这里展示均分变化趋势" />
        </div>

        <!-- 图表 5：家长开通率 -->
        <div class="stat-card">
          <div class="flex items-center justify-between mb-3">
            <div class="flex items-center gap-2 text-sm font-medium text-cocoa-700"><Users class="w-4 h-4 text-butter-500" /> 家长开通率</div>
            <span class="text-xs text-cocoa-400">{{ parentEnabled }} / {{ students.length }} 人</span>
          </div>
          <div v-if="chartLoading" class="py-2">
            <div class="h-6 rounded-lg bg-cream-100 animate-pulse" />
          </div>
          <div v-else-if="students.length > 0" class="space-y-3">
            <div class="flex items-center gap-3">
              <div class="flex-1">
                <div class="w-full bg-cream-100 rounded-full h-4 overflow-hidden">
                  <div class="h-4 rounded-full bg-gradient-to-r from-butter-300 to-butter-500 transition-all duration-700"
                    :style="{ width: parentEnabledPct + '%' }"></div>
                </div>
              </div>
              <span class="text-sm font-bold text-cocoa-800 whitespace-nowrap">{{ parentEnabledPct }}%</span>
            </div>
            <div class="text-xs text-cocoa-400">
              已开通 {{ parentEnabled }} 人，共 {{ students.length }} 名学生
              <span v-if="parentEnabledPct >= 80" class="text-mint-500 ml-1">✅ 开通率良好</span>
              <span v-else-if="parentEnabledPct >= 50" class="text-butter-500 ml-1">⚠️ 建议提升</span>
              <span v-else class="text-sakura-500 ml-1">❗ 需关注</span>
            </div>
          </div>
          <EmptyState v-else icon="👨‍👩‍👧" title="暂无学生数据" desc="导入学生后展示家长开通情况" />
        </div>

        <!-- 各班家长开通率明细 -->
        <div v-if="classParentRates.length > 1" class="stat-card">
          <div class="flex items-center justify-between mb-3">
            <div class="flex items-center gap-2 text-sm font-medium text-cocoa-700"><BarChart3 class="w-4 h-4 text-mint-500" /> 各班家长开通率</div>
            <span class="text-xs text-cocoa-400">{{ classParentRates.length }} 个班级</span>
          </div>
          <div class="space-y-2.5">
            <div v-for="c in classParentRates" :key="c.name" class="flex items-center gap-2">
              <span class="w-16 shrink-0 truncate text-xs text-cocoa-600">{{ c.name }}</span>
              <div class="flex-1 h-5 rounded-full bg-cream-100 overflow-hidden">
                <div class="h-full rounded-full bg-gradient-to-r from-mint-300 to-mint-500 transition-all duration-700"
                  :style="{ width: c.pct + '%' }"></div>
              </div>
              <span class="w-20 shrink-0 text-right text-xs font-semibold text-cocoa-700">{{ c.count }}/{{ c.total }} ({{ c.pct }}%)</span>
            </div>
          </div>
        </div>

        <!-- 图表 4：数据速览 -->
        <div class="stat-card">
          <div class="flex items-center justify-between mb-3">
            <div class="flex items-center gap-2 text-sm font-medium text-cocoa-700"><Sparkles class="w-4 h-4 text-sakura-500" /> 今日速览</div>
            <span class="text-xs text-cocoa-400">一键直达</span>
          </div>
          <div class="grid grid-cols-2 gap-3">
            <button class="rounded-xl bg-cream-50 p-3 text-left transition hover:bg-butter-50 hover:shadow-softer" @click="router.push('/teacher/attendance')">
              <div class="text-2xl">✅</div>
              <div class="mt-1 text-sm font-semibold text-cocoa-800">记考勤</div>
              <div class="text-xs text-cocoa-400">今日出勤一键记录</div>
            </button>
            <button class="rounded-xl bg-cream-50 p-3 text-left transition hover:bg-butter-50 hover:shadow-softer" @click="router.push('/teacher/homework')">
              <div class="text-2xl">📝</div>
              <div class="mt-1 text-sm font-semibold text-cocoa-800">布置作业</div>
              <div class="text-xs text-cocoa-400">快速发布今日任务</div>
            </button>
            <button class="rounded-xl bg-cream-50 p-3 text-left transition hover:bg-butter-50 hover:shadow-softer" @click="router.push('/teacher/notices')">
              <div class="text-2xl">📢</div>
              <div class="mt-1 text-sm font-semibold text-cocoa-800">发通知</div>
              <div class="text-xs text-cocoa-400">同步给家长学生</div>
            </button>
            <button class="rounded-xl bg-cream-50 p-3 text-left transition hover:bg-butter-50 hover:shadow-softer" @click="router.push('/teacher/ai-chat')">
              <div class="text-2xl">🤖</div>
              <div class="mt-1 text-sm font-semibold text-cocoa-800">AI 助手</div>
              <div class="text-xs text-cocoa-400">备课答疑随时问</div>
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- 快捷工具 -->
    <div>
      <h2 class="section-title"><Sparkles class="w-5 h-5 text-butter-400" /> 快捷工具</h2>
      <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <button v-for="tool in shortcutTools" :key="tool.to" class="quick-card flex items-center gap-3 !p-4" @click="router.push(tool.to)">
          <span class="w-10 h-10 rounded-xl flex items-center justify-center text-lg" :style="{ background: tool.color }">{{ tool.icon }}</span>
          <span class="font-medium text-cocoa-900 text-sm">{{ tool.label }}</span>
        </button>
      </div>
    </div>

    <!-- 班级列表 -->
    <div v-if="!loading && classes.length > 0">
      <h2 class="section-title"><Users class="w-5 h-5 text-butter-400" /> 我的班级</h2>
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <div v-for="c in classes" :key="c.id" class="quick-card" @click="router.push('/teacher/classes')">
          <div class="flex items-center justify-between mb-2">
            <div class="flex items-center gap-2">
              <School class="w-5 h-5 text-butter-500" />
              <span class="font-semibold text-cocoa-900">{{ c.name }}</span>
            </div>
            <ChevronRight class="w-4 h-4 text-cocoa-300" />
          </div>
          <div class="text-xs text-cocoa-500 space-y-1">
            <div>年级：{{ c.grade || '-' }} · 班主任：{{ c.headTeacher || '-' }}</div>
            <div v-if="c.term">学期：{{ c.term }}</div>
          </div>
        </div>
      </div>
    </div>

    <!-- 空状态 -->
    <div v-if="!loading && classes.length === 0" class="empty-state">
      <div class="icon">📚</div>
      <div class="title">暂无班级</div>
      <div class="desc">你还没有被分配到班级，请联系学校管理员</div>
    </div>
  </div>
</template>
