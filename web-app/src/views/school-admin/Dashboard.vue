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

    <!-- ─── 关键指标卡片 ─── -->
    <div class="grid grid-cols-1 md:grid-cols-3 gap-4 lg:gap-5">
      <!-- 教师卡片 -->
      <div class="stat-card stat-card--butter" @click="router.push('/school-admin/teachers')">
        <div class="stat-card__glow" aria-hidden="true"></div>
        <div class="stat-card__header">
          <div class="stat-card__icon stat-card__icon--butter">
            <Users class="w-5 h-5" />
          </div>
          <span class="stat-card__label">教师</span>
        </div>
        <div class="stat-card__value text-cocoa-900">
          <Loader2 v-if="loading" class="w-7 h-7 animate-spin text-butter-400" />
          <span v-else class="animate-count">{{ stats.totalTeachers }}</span>
        </div>
        <div class="stat-card__footer">
          <span class="stat-card__hint">在职教师</span>
          <TrendingUp class="w-3.5 h-3.5 text-mint-500 animate-float" />
        </div>
      </div>

      <!-- 班级卡片 -->
      <div class="stat-card stat-card--sky" @click="router.push('/school-admin/classes')">
        <div class="stat-card__glow" aria-hidden="true"></div>
        <div class="stat-card__header">
          <div class="stat-card__icon stat-card__icon--sky">
            <School class="w-5 h-5" />
          </div>
          <span class="stat-card__label">班级</span>
        </div>
        <div class="stat-card__value text-cocoa-900">
          <Loader2 v-if="loading" class="w-7 h-7 animate-spin text-sky2-400" />
          <span v-else class="animate-count">{{ stats.totalClasses }}</span>
        </div>
        <div class="stat-card__footer">
          <span class="stat-card__hint">在读班级</span>
          <BookOpen class="w-3.5 h-3.5 text-sky2-400 animate-float" />
        </div>
      </div>

      <!-- 学生卡片 -->
      <div class="stat-card stat-card--mint" @click="router.push('/school-admin/students')">
        <div class="stat-card__glow" aria-hidden="true"></div>
        <div class="stat-card__header">
          <div class="stat-card__icon stat-card__icon--mint">
            <GraduationCap class="w-5 h-5" />
          </div>
          <span class="stat-card__label">学生</span>
        </div>
        <div class="stat-card__value text-cocoa-900">
          <Loader2 v-if="loading" class="w-7 h-7 animate-spin text-mint-400" />
          <span v-else class="animate-count">{{ stats.totalStudents }}</span>
        </div>
        <div class="stat-card__footer">
          <span class="stat-card__hint">出勤率</span>
          <span class="stat-card__badge stat-card__badge--mint">
            {{ stats.attendanceRate ?? '—' }}%
          </span>
        </div>
      </div>

      <!-- 家长开通率：进度条 -->
      <div v-if="stats.parentEnabled >= 0" class="stat-card stat-card--full stat-card--sakura">
        <div class="stat-card__glow" aria-hidden="true"></div>
        <div class="stat-card__header">
          <div class="stat-card__icon stat-card__icon--sakura">
            <Sparkles class="w-5 h-5" />
          </div>
          <span class="stat-card__label">家长开通率</span>
          <span class="stat-card__badge stat-card__badge--sakura ml-auto">
            {{ stats.totalStudents ? Math.round(stats.parentEnabled / stats.totalStudents * 100) : 0 }}%
          </span>
        </div>
        <div class="mt-4">
          <div class="flex justify-between text-xs text-cocoa-500 mb-2">
            <span>全校已开通</span>
            <span class="tabular-nums">{{ stats.parentEnabled }} / {{ stats.totalStudents }} 人</span>
          </div>
          <div class="w-full bg-cream-100 rounded-full h-3.5 overflow-hidden">
            <div
              class="h-3.5 rounded-full bg-gradient-to-r from-sakura-300 to-sakura-500 transition-all duration-700 ease-out relative overflow-hidden"
              :style="{ width: stats.totalStudents ? Math.round(stats.parentEnabled / stats.totalStudents * 100) + '%' : '0%' }"
            >
              <div class="absolute inset-0 animate-shimmer"></div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- ─── 考试均分趋势（仅教师角色） ─── -->
    <div v-if="gradeAvgTrend.length" class="grid grid-cols-1 gap-4 lg:gap-5">
      <SvgLineChart
        :data="gradeAvgTrend"
        :height="200"
        title="考试均分趋势"
        series1Name="平均分"
        color="#f5b342"
      />
    </div>

    <!-- ─── 出勤趋势 + 资源分布 ─── -->
    <div class="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-5">
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

    <!-- ─── 学科分布 + 核心指标 ─── -->
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-5">
      <SvgBarChart title="学科分布（按教师/班级）" :data="subjectChartData" :height="200" />
      <SvgProgress :data="coreMetrics" title="学校核心指标完成率" />
    </div>

    <!-- ─── 对比图表 ─── -->
    <div class="grid grid-cols-1 md:grid-cols-2 gap-4 lg:gap-5">
      <SvgBarChart title="教师 vs 学生数量" :data="chartTeacherStudent" :height="200" />
      <SvgBarChart title="学校资源总览" :data="chartOverview" :height="200" />
    </div>

  </div>
</template>

<style scoped>
/* ═══════════════════════════════════════════
   统计卡片增强：主题色 + 光晕 + 微动效
   ═══════════════════════════════════════════ */

/* 基础卡片已继承 .stat-card（全局），此处叠加主题色 */
.stat-card {
  /* 提升为相对定位以容纳内部绝对元素 */
  position: relative;
  overflow: hidden;
  /* 更柔和的圆角 */
  border-radius: 1.25rem;
  padding: 1.5rem;
  /* 左侧主题色accent条 */
  border-left: 4px solid transparent;
  background-clip: padding-box;
}

/* 主题色：左侧 accent 条 + 微光晕背景 */
.stat-card--butter {
  border-left-color: #e6a23c;
}
.stat-card--butter .stat-card__glow {
  background: radial-gradient(ellipse 80% 60% at 100% 0%, rgba(255, 216, 122, 0.18), transparent);
}

.stat-card--sky {
  border-left-color: #1C6FB3;
}
.stat-card--sky .stat-card__glow {
  background: radial-gradient(ellipse 80% 60% at 100% 0%, rgba(156, 200, 245, 0.20), transparent);
}

.stat-card--mint {
  border-left-color: #67c23a;
}
.stat-card--mint .stat-card__glow {
  background: radial-gradient(ellipse 80% 60% at 100% 0%, rgba(155, 224, 168, 0.18), transparent);
}

.stat-card--sakura {
  border-left-color: #ffb8cc;
}
.stat-card--sakura .stat-card__glow {
  background: radial-gradient(ellipse 80% 60% at 100% 0%, rgba(255, 184, 204, 0.15), transparent);
}

/* 全宽卡片 */
.stat-card--full {
  grid-column: 1 / -1;
}

/* 光晕层 */
.stat-card__glow {
  position: absolute;
  inset: 0;
  pointer-events: none;
  z-index: 0;
}

/* 头部：图标 + 标签 */
.stat-card__header {
  position: relative;
  z-index: 1;
  display: flex;
  align-items: center;
  gap: 0.625rem;
  margin-bottom: 0.75rem;
}

/* 图标容器 */
.stat-card__icon {
  width: 2.25rem;
  height: 2.25rem;
  border-radius: 0.625rem;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  color: #fff;
  box-shadow: 0 4px 10px rgba(0, 0, 0, 0.08);
}
.stat-card__icon--butter {
  background: linear-gradient(135deg, #f5c84e, #e6a23c);
}
.stat-card__icon--sky {
  background: linear-gradient(135deg, #5b9fd4, #1C6FB3);
}
.stat-card__icon--mint {
  background: linear-gradient(135deg, #8fd977, #67c23a);
}
.stat-card__icon--sakura {
  background: linear-gradient(135deg, #ffb8cc, #f494b0);
}

/* 标签文字 */
.stat-card__label {
  font-size: 0.875rem;
  font-weight: 500;
  color: rgb(var(--cocoa-500));
}

/* 大数字 */
.stat-card__value {
  position: relative;
  z-index: 1;
  font-family: 'Familjen Grotesk', 'SF Pro Display', system-ui, sans-serif;
  font-size: 2.5rem;
  font-weight: 700;
  line-height: 1.1;
  letter-spacing: -0.02em;
  margin-bottom: 0.5rem;
  /* 数字渐变效果 */
  background: linear-gradient(135deg, rgb(var(--cocoa-900)) 0%, rgb(var(--cocoa-700)) 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

/* 底部信息 */
.stat-card__footer {
  position: relative;
  z-index: 1;
  display: flex;
  align-items: center;
  gap: 0.375rem;
}
.stat-card__hint {
  font-size: 0.75rem;
  color: rgb(var(--cocoa-400));
}

/* 徽章 */
.stat-card__badge {
  display: inline-flex;
  align-items: center;
  font-size: 0.75rem;
  font-weight: 600;
  padding: 0.125rem 0.5rem;
  border-radius: 9999px;
  line-height: 1.4;
}
.stat-card__badge--mint {
  background: rgba(103, 194, 58, 0.12);
  color: #4a9a2e;
}
.stat-card__badge--sakura {
  background: rgba(244, 148, 176, 0.15);
  color: #c45a7a;
}

/* Hover 增强：上浮 + 阴影 + 图标微旋转 */
.stat-card:hover {
  transform: translateY(-6px) scale(1.01);
  box-shadow: 0 4px 8px rgba(174, 140, 90, 0.08), 0 12px 28px rgba(174, 140, 90, 0.12), 0 24px 48px rgba(190, 140, 80, 0.08);
}
.stat-card:hover .stat-card__icon {
  transform: rotate(-6deg) scale(1.08);
  transition: transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
}
.stat-card:not(:hover) .stat-card__icon {
  transition: transform 0.3s ease;
}

/* 数字入场动画 */
@keyframes countUp {
  from {
    opacity: 0;
    transform: translateY(8px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
.animate-count {
  animation: countUp 0.5s cubic-bezier(0.22, 1, 0.36, 1) both;
}

/* 浮动小图标 */
@keyframes float {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-3px); }
}
.animate-float {
  animation: float 3s ease-in-out infinite;
}

/* ═══════════════════════════════════════════
   暗色模式适配
   ═══════════════════════════════════════════ */
.dark .stat-card {
  border-left-width: 4px;
  background: rgb(var(--cream-200) / 0.85);
}
.dark .stat-card__value {
  background: linear-gradient(135deg, rgb(var(--cocoa-800)) 0%, rgb(var(--cocoa-600)) 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}
.dark .stat-card__badge--mint {
  background: rgba(103, 194, 58, 0.2);
  color: #8fd977;
}
.dark .stat-card__badge--sakura {
  background: rgba(244, 148, 176, 0.2);
  color: #ffb8cc;
}
.dark .stat-card:hover {
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15), 0 12px 28px rgba(0, 0, 0, 0.2), 0 24px 48px rgba(0, 0, 0, 0.12);
}

/* 暗色模式：光晕减弱 */
.dark .stat-card--butter .stat-card__glow {
  background: radial-gradient(ellipse 80% 60% at 100% 0%, rgba(255, 216, 122, 0.08), transparent);
}
.dark .stat-card--sky .stat-card__glow {
  background: radial-gradient(ellipse 80% 60% at 100% 0%, rgba(156, 200, 245, 0.08), transparent);
}
.dark .stat-card--mint .stat-card__glow {
  background: radial-gradient(ellipse 80% 60% at 100% 0%, rgba(155, 224, 168, 0.08), transparent);
}
.dark .stat-card--sakura .stat-card__glow {
  background: radial-gradient(ellipse 80% 60% at 100% 0%, rgba(255, 184, 204, 0.06), transparent);
}

/* 减少动态效果偏好 */
@media (prefers-reduced-motion: reduce) {
  .animate-count,
  .animate-float,
  .stat-card:hover .stat-card__icon {
    animation: none !important;
    transition: none !important;
  }
}
</style>
