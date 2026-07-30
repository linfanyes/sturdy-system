<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useRoleSwitchStore } from '@/stores/roleSwitch'
import { getParentMe, getParentNotices, getParentExams, getParentHomework, getParentAttendance, changeParentPassword, getParentBehavior, getParentSchedule, getParentCommunications, switchStudent } from '@/api/parent'
import type { ParentAttendance, ParentBehavior, ParentSchedule, ParentCommunications, ParentMe } from '@/api/parent'
import request from '@/api/request'
import { Sparkles, Heart, Star, TrendingUp, BookOpen, Bell, ChevronRight, Loader2, Award, ClipboardList, BarChart3, CalendarCheck, Scale, MessageCircle, Repeat } from 'lucide-vue-next'

const auth = useAuthStore()
const roleSwitchStore = useRoleSwitchStore()
const router = useRouter()

const loading = ref(true)
const loadError = ref(false)
const me = ref<ParentMe | null>(null)
const activeKidId = ref('')
const notices = ref<any[]>([])
const exams = ref<any[]>([])
const homework = ref<any[]>([])
const attendance = ref<ParentAttendance | null>(null)
const behavior = ref<ParentBehavior | null>(null)
const schedule = ref<ParentSchedule | null>(null)
const communications = ref<ParentCommunications | null>(null)
const selectedExamIndex = ref(0)

// 今日星期（1=周一 … 7=周日），与小程序端 dayOfWeek 约定一致
const todayDow = ((new Date().getDay() + 6) % 7) + 1
const todaySchedule = computed(() => (schedule.value?.week || []).find((d: any) => d.dayOfWeek === todayDow)?.items || [])

// 语义色（与小程序端保持完全一致）
const COLOR = { green: '#07c160', red: '#f56c6c', amber: '#E6A23C', blue: '#1C6FB3' }

// SECTION A — 行为表现
const behaviorChips = computed(() => {
  const s = behavior.value?.summary
  return [
    { label: '表扬', value: s ? s.praise : 0, color: COLOR.green, bg: 'bg-[#07c160]/10' },
    { label: '违纪', value: s ? s.violation : 0, color: COLOR.red, bg: 'bg-[#f56c6c]/10' },
    { label: '其他', value: s ? s.other : 0, color: COLOR.amber, bg: 'bg-[#E6A23C]/10' },
  ]
})
const behaviorByMonth = computed(() => {
  const list = (behavior.value?.byMonth || []) as Array<{ month: string; count: number }>
  const max = Math.max(1, ...list.map((m) => m.count))
  return list.map((m) => ({ ...m, pct: Math.round((m.count / max) * 100), isMax: m.count === max }))
})
const behaviorRecent = computed(() => behavior.value?.recent || [])
const CATEGORY_COLOR: Record<string, string> = { praise: COLOR.green, violation: COLOR.red, other: COLOR.amber }

// SECTION B — 课表 & 值日
const WEEK_LABELS = ['周一', '周二', '周三', '周四', '周五', '周六', '周日']
const weekStrip = computed(() =>
  (schedule.value?.week || []).map((d: any) => ({ ...d, label: WEEK_LABELS[d.dayOfWeek - 1] || '' })),
)
const upcomingDuty = computed(() => schedule.value?.upcomingDuty || [])
const DUTY_TYPE_LABEL: Record<string, string> = { daily: '日常', weekly: '每周' }

// SECTION C — 家校沟通
const commTotal = computed(() => communications.value?.total || 0)
const commRecent = computed(() => communications.value?.recent || [])

// 联系老师：本文件无既有 IM/TIM 逻辑，降级为提示（不新增 IM/TIM）
const toastMsg = ref('')
let toastTimer: ReturnType<typeof setTimeout> | null = null
function contactTeacher() {
  toastMsg.value = '请在「消息」中联系老师'
  if (toastTimer) clearTimeout(toastTimer)
  toastTimer = setTimeout(() => { toastMsg.value = '' }, 2500)
}

/** 师兼家：切换到教师端（仅当 roleSwitchStore 有 parentToken 时启用） */
const canSwitchToTeacher = computed(() => !!roleSwitchStore.parentToken)
function switchToTeacher() {
  if (!window.confirm('确定切换到教师端？')) return
  roleSwitchStore.switchTo('teacher', auth.setAuth)
  router.push('/teacher')
}

// 微信绑定
const isBound = ref(false)
function bindWechat() {
  alert('请在微信小程序中打开"家长端"完成微信绑定。\n或使用教师端-学生管理-开通家长登录功能。')
}

const greeting = computed(() => {
  const h = new Date().getHours()
  return h < 6 ? '夜深了' : h < 9 ? '早上好' : h < 12 ? '上午好' : h < 14 ? '中午好' : h < 18 ? '下午好' : '晚上好'
})

const studentName = computed(() => me.value?.studentName || auth.user?.studentName || '')
const className = computed(() => me.value?.className || '')

// 最近一次考试（用于概览卡「最新排名」）
const latestExam = computed(() => exams.value.length ? exams.value[exams.value.length - 1] : null)
// 当前选中的考试（成绩查询区）
const selectedExam = computed(() => exams.value[selectedExamIndex.value] || null)

// 待处理：未读通知 + 未完成作业
const pendingNotices = computed(() => notices.value.filter(n => !n.ended).length)
const pendingHomework = computed(() => homework.value.filter(h => h.status !== '已完成').length)

// 优弱势学科（前端据所选考试各科得分率计算，与小程序端逻辑一致）
const EXCELLENT_RATIO = 0.8
interface RankedSubject { subject: string; score: number; fullScore: number; pct: number }
const rankedSubjects = computed<RankedSubject[]>(() => {
  const subs = (selectedExam.value?.subjects || []) as Array<{ subject: string; score: number | null; fullScore: number }>
  return subs
    .filter((s) => s.score != null && s.fullScore)
    .map((s) => ({ subject: s.subject, score: s.score as number, fullScore: s.fullScore, pct: (s.score as number) / s.fullScore }))
    .sort((a, b) => b.pct - a.pct)
})
const strengths = computed(() => rankedSubjects.value.filter((s) => s.pct >= EXCELLENT_RATIO).map((s) => s.subject))
const weaknesses = computed(() => {
  const below = rankedSubjects.value.filter((s) => s.pct < EXCELLENT_RATIO).sort((a, b) => a.pct - b.pct)
  return below.slice(0, 3).map((s) => s.subject)
})

// 总分分布直方图（后端已带 isStudent 标记学生所在段）
const histogram = computed(() => selectedExam.value?.distribution || [])

// 考勤看板：打卡类型元信息 + 汇总卡片（与小程序端保持一致的类型/图标）
const ATTENDANCE_TYPE_META: Record<string, { label: string; icon: string; color: string }> = {
  reading: { label: '阅读', icon: '📚', color: 'bg-sky2-50 text-sky2-700' },
  sport: { label: '运动', icon: '🏃', color: 'bg-mint-50 text-mint-700' },
  behavior: { label: '行为', icon: '⭐', color: 'bg-butter-50 text-butter-700' },
  homework: { label: '作业', icon: '📝', color: 'bg-sakura-50 text-sakura-700' },
}
const ATTENDANCE_ORDER = ['reading', 'sport', 'behavior', 'homework'] as const
const attendanceChips = computed(() => {
  const s = attendance.value?.summary
  return ATTENDANCE_ORDER.map((t) => ({ ...ATTENDANCE_TYPE_META[t], type: t, count: s ? s[t] : 0 }))
})
const attendanceRecent = computed(() => attendance.value?.recent || [])
const attendanceByMonth = computed(() => {
  const list = attendance.value?.byMonth || []
  const max = Math.max(1, ...list.map((m) => m.count))
  return list.map((m) => ({ ...m, pct: Math.round((m.count / max) * 100) }))
})

// 孩子在校健康度总览（5 维状态灯）+ 提醒中心（聚合已有数据，各维逐步点亮）
const healthOverview = computed(() => {
  const att: any = attendance.value
  const attRecent = (att && att.recent) || []
  const attNegative = attRecent.some((r: any) => /旷课|缺勤|违纪|迟到/.test(r.note || ''))
  const attCount = (att && att.total) || 0
  const subs = (latestExam.value && latestExam.value.subjects) || []
  const weak = subs.filter((s: any) => s.score != null && s.fullScore && s.score / s.fullScore < 0.6).length
  const strong = subs.filter((s: any) => s.score != null && s.fullScore && s.score / s.fullScore >= 0.8).length
  const overdue = homework.value.filter((h: any) => h.status === '逾期' || h.status === '已逾期').length
  const pend = pendingHomework.value
  const beh = (att && att.summary && att.summary.behavior) || 0
  const urgent = notices.value.filter((n: any) => n.pinned).length
  return [
    { key: 'attendance', label: '考勤', icon: '🕒', status: attNegative ? 'red' : attCount > 0 ? 'green' : 'yellow', hint: attNegative ? '有缺勤/违纪' : attCount > 0 ? '打卡正常' : '暂无打卡' },
    { key: 'exam', label: '成绩', icon: '📈', status: weak >= 2 ? 'red' : weak === 1 ? 'yellow' : strong > 0 ? 'green' : 'yellow', hint: weak >= 2 ? '多科偏弱' : strong > 0 ? '发挥稳定' : '关注薄弱' },
    { key: 'homework', label: '作业', icon: '✅', status: overdue > 0 ? 'red' : pend > 0 ? 'yellow' : 'green', hint: overdue > 0 ? overdue + ' 项逾期' : pend > 0 ? pend + ' 项待完成' : '全部完成' },
    { key: 'behavior', label: '行为', icon: '⚖️', status: beh > 0 ? 'green' : 'yellow', hint: beh > 0 ? '表现良好' : '暂无记录' },
    { key: 'comm', label: '沟通', icon: '💬', status: urgent > 0 ? 'red' : notices.value.length > 0 ? 'green' : 'yellow', hint: urgent > 0 ? urgent + ' 条置顶' : notices.value.length > 0 ? '消息已读' : '暂无消息' },
  ]
})
const reminders = computed(() => {
  const list: Array<{ icon: string; text: string; level: 'green' | 'yellow' | 'red' }> = []
  homework.value.filter((h: any) => h.status === '逾期' || h.status === '已逾期').forEach((h: any) => list.push({ icon: '⏰', text: '作业逾期：' + h.subject + '·' + h.title, level: 'red' }))
  ;((attendance.value as any)?.recent || []).filter((r: any) => /旷课|缺勤|违纪|迟到/.test(r.note || '')).forEach((r: any) => list.push({ icon: '⚠️', text: '考勤预警：' + r.note, level: 'red' }))
  notices.value.filter((n: any) => n.pinned).forEach((n: any) => list.push({ icon: '📢', text: '置顶通知：' + n.title, level: 'yellow' }))
  const pend = homework.value.filter((h: any) => h.status !== '已完成' && h.status !== '逾期' && h.status !== '已逾期')
  if (pend.length) list.push({ icon: '📝', text: pend.length + ' 项作业待完成', level: 'yellow' })
  return list
})

// 公告/作业「查看全部」展开（与小程序端一致的交互）
const showAllNotices = ref(false)
const showAllHomework = ref(false)
const visibleNotices = computed(() => showAllNotices.value ? notices.value : notices.value.slice(0, 5))
const visibleHomework = computed(() => showAllHomework.value ? homework.value : homework.value.slice(0, 5))

// 看板卡片点击跳转：滚动到对应区块或打开弹窗
const showExamListModal = ref(false)
function scrollToSection(id: string) {
  const el = document.getElementById(id)
  if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
}
function clickNoticeCard() { scrollToSection('parent-notices-section') }
function clickHomeworkCard() { scrollToSection('parent-homework-section') }
function clickExamCountCard() { showExamListModal.value = true }
function clickRankCard() { scrollToSection('parent-grades-section') }

// 修改密码（后端 change-password 已存在，补 Web 入口）
const showPwdModal = ref(false)
const oldPwd = ref('')
const newPwd = ref('')
const pwdLoading = ref(false)
const pwdError = ref('')
const pwdOk = ref(false)
async function switchToKid(studentId: string) {
  if (studentId === activeKidId.value) return
  try {
    const result = await switchStudent(studentId)
    // 替换 token
    auth.setAuth(result.token, auth.user!)
    // 更新 me（走服务端）
    const freshMe = await getParentMe()
    if (freshMe) {
      me.value = freshMe
      activeKidId.value = freshMe.studentId
      // 重载所有看板数据
      load()
    }
  } catch (e) {
    console.error('切换孩子失败', e)
  }
}

async function submitChangePwd() {
  pwdError.value = ''
  pwdOk.value = false
  if (!oldPwd.value || !newPwd.value) { pwdError.value = '请填写原密码与新密码'; return }
  if (newPwd.value.length < 8) { pwdError.value = '新密码至少 8 位'; return }
  pwdLoading.value = true
  try {
    await changeParentPassword(oldPwd.value, newPwd.value)
    pwdOk.value = true
    oldPwd.value = ''
    newPwd.value = ''
    setTimeout(() => { showPwdModal.value = false; pwdOk.value = false }, 1200)
  } catch (e: any) {
    pwdError.value = e?.response?.data?.message || e?.message || '修改失败，请重试'
  } finally {
    pwdLoading.value = false
  }
}

async function load() {
  loading.value = true
  try {
    const [meData, noticeData, examData, hwData, attData, behData, schData, commData] = await Promise.allSettled([
      getParentMe(),
      getParentNotices(),
      getParentExams(),
      getParentHomework(),
      getParentAttendance(),
      getParentBehavior(),
      getParentSchedule(),
      getParentCommunications(),
    ])
    if (meData.status === 'fulfilled') {
      me.value = meData.value
      activeKidId.value = meData.value.studentId || ''
    }
    if (noticeData.status === 'fulfilled') notices.value = Array.isArray(noticeData.value) ? noticeData.value : []
    if (examData.status === 'fulfilled') exams.value = (examData.value && examData.value.exams) || []
    if (hwData.status === 'fulfilled') homework.value = Array.isArray(hwData.value) ? hwData.value : []
    if (attData.status === 'fulfilled') attendance.value = attData.value as ParentAttendance
    if (behData.status === 'fulfilled') behavior.value = behData.value as ParentBehavior
    if (schData.status === 'fulfilled') schedule.value = schData.value as ParentSchedule
    if (commData.status === 'fulfilled') communications.value = commData.value as ParentCommunications
    // 身份/核心数据拉取失败 → 标记为可重试错误态（其余分项失败仅显示各自空态）
    loadError.value = meData.status !== 'fulfilled'
    // 默认选中最近一次考试
    selectedExamIndex.value = Math.max(0, exams.value.length - 1)
  } catch (e) {
    console.error('[parent] load error:', e)
  } finally {
    loading.value = false
  }
}

onMounted(load)

const subscribeStatus = ref<'none' | 'loading' | 'done'>('none')

async function subscribeNotifications() {
  subscribeStatus.value = 'loading'
  try {
    await request.post('/parent-auth/subscribe', { code: 'demo_subscribe' })
    subscribeStatus.value = 'done'
    setTimeout(() => { subscribeStatus.value = 'none' }, 3000)
  } catch (e) {
    subscribeStatus.value = 'none'
    console.error('订阅失败', e)
  }
}
</script>

<template>
  <div class="space-y-6">
    <!-- 孩子选择条 -->
    <div v-if="me?.kids && me.kids.length > 1" class="flex gap-2 px-4 py-2 overflow-x-auto bg-white border-b shrink-0 -mx-4 -mt-6">
      <div
        v-for="kid in me.kids" :key="kid.studentId"
        @click="switchToKid(kid.studentId)"
        class="shrink-0 px-3 py-1.5 rounded-full text-sm cursor-pointer transition-colors"
        :class="kid.studentId === activeKidId ? 'bg-[#07c160] text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'"
      >
        {{ kid.studentName }}
      </div>
      <!-- 跨娃比对入口（>=2娃时显示） -->
      <router-link
        to="/parent/compare"
        class="shrink-0 px-3 py-1.5 rounded-full text-sm bg-[#E6A23C] text-white ml-auto"
      >
        📊 跨娃比对
      </router-link>
    </div>

    <!-- 错误/重试态（与小程序端一致） -->
    <div
      v-if="loadError"
      class="flex cursor-pointer items-center justify-center gap-2 rounded-xl bg-[#E6A23C]/15 px-4 py-2 text-sm font-medium text-[#E6A23C]"
      @click="load()"
    >⚠️ 数据加载失败，点击重试</div>
    <!-- 欢迎横幅 -->
    <div class="welcome-banner">
      <div class="relative z-10 flex items-center gap-4">
        <div class="w-14 h-14 rounded-2xl bg-sakura-300/30 backdrop-blur flex items-center justify-center">
          <Heart class="w-7 h-7 text-sakura-600" />
        </div>
        <div class="flex-1">
          <div class="text-xl font-bold text-cocoa-900">
            {{ studentName || '家长' }}<span class="text-sm text-cocoa-600/80 ml-1">的成长看板</span>
          </div>
          <div class="text-sm text-cocoa-600/80 mt-0.5">
            <template v-if="className">班级：{{ className }}</template>
            <template v-else>家长中心</template>
          </div>
        </div>
        <div class="flex items-center gap-2">
          <button
            v-if="canSwitchToTeacher"
            class="shrink-0 text-sm rounded-xl border border-[#07c160]/30 bg-[#07c160]/10 px-3 py-1.5 text-[#07c160] hover:bg-[#07c160] hover:text-white transition-colors flex items-center gap-1"
            @click="switchToTeacher"
          >
            <Repeat class="w-3.5 h-3.5" /> 切换至教师端
          </button>
          <button
            class="shrink-0 text-sm rounded-xl border border-white/40 bg-white/20 px-3 py-1.5 text-cocoa-800 hover:bg-white/30"
            @click="showPwdModal = true"
          >⚙️ 修改密码</button>
        </div>
      </div>
    </div>

    <!-- 孩子卡片（与小程序端 kids 展示对齐） -->
    <div v-if="!loading && me?.kids?.length" class="flex flex-wrap gap-3">
      <div
        v-for="k in me.kids"
        :key="k.studentId"
        class="bg-white rounded-2xl px-4 py-3 shadow-softer border border-transparent flex items-center gap-3"
      >
        <div class="w-10 h-10 rounded-xl bg-butter-100 flex items-center justify-center text-butter-600 font-bold">
          {{ (k.studentName || '?').slice(0, 1) }}
        </div>
        <div>
          <div class="font-semibold text-cocoa-900 text-sm">
            {{ k.studentName }}
            <span v-if="k.studentNo" class="text-cocoa-400 font-normal"> · {{ k.studentNo }}</span>
          </div>
          <div class="text-xs text-cocoa-500 mt-0.5 flex items-center gap-2">
            <span>{{ k.className || ('班级 ' + k.classId) }}</span>
            <span v-if="k.nickName" class="text-mint-600 bg-mint-50 px-2 py-0.5 rounded-full">已微信绑 {{ k.nickName }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- 微信绑定提示（仅演示模式或无绑定时显示） -->
    <div v-if="me?.kids?.some(k => !k.nickName)" class="quick-card !py-3 !px-4">
      <div class="flex items-center justify-between">
        <span class="text-sm text-cocoa-600">微信绑定后可接收通知提醒</span>
        <button @click="bindWechat" class="text-sm text-[#07c160] underline font-medium">
          📱 绑定微信
        </button>
      </div>
    </div>

    <!-- 概览卡片（点击跳转详情） -->
    <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
      <div class="stat-card cursor-pointer hover:shadow-lg hover:-translate-y-0.5 transition-all" @click="clickNoticeCard">
        <div class="flex items-center gap-2 text-sm text-cocoa-500 mb-1"><Bell class="w-4 h-4 text-sakura-500" /> 待读通知</div>
        <div class="text-3xl font-bold text-cocoa-900"><Loader2 v-if="loading" class="w-6 h-6 animate-spin" /><template v-else>{{ pendingNotices }}</template></div>
        <div class="text-xs text-sakura-400 mt-1 flex items-center gap-0.5">查看通知 <ChevronRight class="w-3 h-3" /></div>
      </div>
      <div class="stat-card cursor-pointer hover:shadow-lg hover:-translate-y-0.5 transition-all" @click="clickHomeworkCard">
        <div class="flex items-center gap-2 text-sm text-cocoa-500 mb-1"><ClipboardList class="w-4 h-4 text-butter-500" /> 待完成作业</div>
        <div class="text-3xl font-bold text-cocoa-900"><Loader2 v-if="loading" class="w-6 h-6 animate-spin" /><template v-else>{{ pendingHomework }}</template></div>
        <div class="text-xs text-butter-500 mt-1 flex items-center gap-0.5">查看作业 <ChevronRight class="w-3 h-3" /></div>
      </div>
      <div class="stat-card cursor-pointer hover:shadow-lg hover:-translate-y-0.5 transition-all" @click="clickExamCountCard">
        <div class="flex items-center gap-2 text-sm text-cocoa-500 mb-1"><Award class="w-4 h-4 text-mint-500" /> 考试次数</div>
        <div class="text-3xl font-bold text-cocoa-900"><Loader2 v-if="loading" class="w-6 h-6 animate-spin" /><template v-else>{{ exams.length }}</template></div>
        <div class="text-xs text-mint-500 mt-1 flex items-center gap-0.5">查看考试详情 <ChevronRight class="w-3 h-3" /></div>
      </div>
      <div class="stat-card cursor-pointer hover:shadow-lg hover:-translate-y-0.5 transition-all" @click="clickRankCard">
        <div class="flex items-center gap-2 text-sm text-cocoa-500 mb-1"><Star class="w-4 h-4 text-sky2-500" /> 最新排名</div>
        <div class="text-3xl font-bold text-cocoa-900">
          <Loader2 v-if="loading" class="w-6 h-6 animate-spin" />
          <template v-else-if="latestExam && latestExam.classRank">第 {{ latestExam.classRank }} 名</template>
          <template v-else>--</template>
        </div>
        <div class="text-xs text-sky2-500 mt-1 flex items-center gap-0.5">查看成绩 <ChevronRight class="w-3 h-3" /></div>
      </div>
    </div>

    <!-- 孩子在校健康度总览（5 维状态灯）+ 提醒中心 -->
    <div v-if="!loading && healthOverview.length" class="quick-card">
      <div class="flex items-center gap-2 mb-3">
        <Sparkles class="w-5 h-5 text-mint-400" />
        <h2 class="text-lg font-semibold text-cocoa-900">孩子在校健康度总览</h2>
      </div>
      <div class="grid grid-cols-5 gap-2">
        <div v-for="h in healthOverview" :key="h.key" class="flex flex-col items-center text-center gap-1">
          <span class="w-3 h-3 rounded-full" :style="{ background: h.status === 'green' ? '#07c160' : h.status === 'yellow' ? '#E6A23C' : '#f56c6c' }"></span>
          <span class="text-lg leading-none">{{ h.icon }}</span>
          <span class="text-xs font-semibold text-cocoa-900">{{ h.label }}</span>
          <span class="text-[10px] text-cocoa-500 leading-tight">{{ h.hint }}</span>
        </div>
      </div>
      <div v-if="reminders.length" class="mt-4 pt-3 border-t border-cream-200">
        <div class="text-sm font-semibold text-cocoa-900 mb-2 flex items-center gap-2"><Bell class="w-4 h-4 text-sakura-400" /> 今日需关注</div>
        <div class="space-y-1.5">
          <div v-for="(r, i) in reminders" :key="i" class="flex items-center gap-2 text-sm" :class="r.level === 'red' ? 'text-sakura-700' : 'text-cocoa-700'">
            <span>{{ r.icon }}</span><span>{{ r.text }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- 消息订阅 -->
    <div class="mt-4 px-4" v-if="subscribeStatus !== 'done'">
      <button @click="subscribeNotifications"
        class="w-full py-2 rounded-lg text-sm text-white bg-[#07c160] disabled:opacity-50"
        :disabled="subscribeStatus === 'loading'">
        {{ subscribeStatus === 'loading' ? '订阅中…' : '🔔 开启通知订阅' }}
      </button>
    </div>
    <div v-else class="mt-4 px-4 text-center text-xs text-[#07c160]">
      ✅ 订阅成功，将及时收到通知
    </div>

    <!-- 成绩查询（历史切换 + 分布 + 优弱势，与小程序端对齐） -->
    <div v-if="!loading && selectedExam" id="parent-grades-section">
      <div class="flex items-center gap-2 mb-3">
        <BarChart3 class="w-5 h-5 text-mint-400" />
        <h2 class="text-lg font-semibold text-cocoa-900">成绩查询</h2>
        <select
          v-if="exams.length > 0"
          v-model.number="selectedExamIndex"
          class="ml-auto text-sm rounded-xl border border-cream-200 bg-white px-3 py-1.5 text-cocoa-700 focus:outline-none focus:border-butter-400"
        >
          <option v-for="(e, i) in exams" :key="e.examId || i" :value="i">
            {{ e.examName }}（{{ e.date }}）
          </option>
        </select>
      </div>

      <div class="quick-card">
        <div class="flex items-center justify-between mb-3">
          <div>
            <div class="font-semibold text-cocoa-900 text-lg">{{ selectedExam.examName }}</div>
            <div class="text-xs text-cocoa-500 mt-1">{{ selectedExam.date }} · 总分 {{ selectedExam.totalScore ?? '--' }} / {{ selectedExam.totalFullScore ?? '--' }}</div>
          </div>
          <div v-if="selectedExam.classRank || selectedExam.gradeRank" class="text-right space-y-1">
            <div v-if="selectedExam.classRank" class="text-right">
              <div class="text-2xl font-bold text-mint-600">第 {{ selectedExam.classRank }} 名</div>
              <div class="text-xs text-cocoa-500">班级排名</div>
            </div>
            <div v-if="selectedExam.gradeRank" class="text-right">
              <div class="text-2xl font-bold text-butter-600">第 {{ selectedExam.gradeRank }} 名</div>
              <div class="text-xs text-cocoa-500">年级排名</div>
            </div>
          </div>
        </div>

        <div class="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <div v-for="s in selectedExam.subjects" :key="s.subject" class="bg-cocoa-50 rounded-lg p-3">
            <div class="text-xs text-cocoa-500">{{ s.subject }}</div>
            <div class="text-lg font-bold text-cocoa-900 mt-1">{{ s.score ?? '--' }} <span class="text-xs font-normal text-cocoa-400">/ {{ s.fullScore }}</span></div>
            <div v-if="s.classRank" class="text-xs text-mint-600 mt-1">班级第 {{ s.classRank }} 名</div>
          </div>
        </div>

        <!-- 优弱势学科 -->
        <div v-if="strengths.length || weaknesses.length" class="flex flex-wrap gap-2 mt-3">
          <span v-for="s in strengths" :key="'s-' + s" class="text-xs px-2 py-1 rounded-full bg-mint-50 text-mint-700">⬆️ {{ s }}</span>
          <span v-for="s in weaknesses" :key="'w-' + s" class="text-xs px-2 py-1 rounded-full bg-sakura-50 text-sakura-700">⬇️ {{ s }}</span>
        </div>

        <!-- 总分分布直方图（学生所在段高亮） -->
        <div v-if="histogram.length" class="mt-4">
          <div class="text-xs text-cocoa-500 mb-2">总分分布（共 {{ histogram.length }} 段）</div>
          <div class="flex items-end gap-1.5 h-32">
            <div v-for="seg in histogram" :key="seg.label" class="flex-1 flex flex-col items-center justify-end h-full">
              <div
                class="w-full rounded-t-md transition-all"
                :style="{ height: Math.max(4, seg.pct) + '%', background: seg.isStudent ? '#07c160' : '#c8e6c9' }"
              ></div>
              <div class="text-[10px] text-cocoa-400 mt-1 leading-none">{{ seg.label }}</div>
              <div class="text-[10px] text-cocoa-400 leading-none">{{ seg.count }}人</div>
            </div>
          </div>
        </div>

        <div v-if="selectedExam.analysisNote" class="mt-3 text-sm text-cocoa-600 bg-butter-50 rounded-lg p-3">
          📝 {{ selectedExam.analysisNote }}
        </div>
      </div>
    </div>

    <!-- 考勤看板（打卡/考勤汇总，与小程序端对齐） -->
    <div v-if="!loading && attendance">
      <h2 class="text-lg font-semibold text-cocoa-900 mb-3 flex items-center gap-2">
        <CalendarCheck class="w-5 h-5 text-mint-400" /> 考勤看板
      </h2>
      <div class="quick-card">
        <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
          <div v-for="c in attendanceChips" :key="c.type" class="rounded-xl p-3 flex flex-col items-center gap-1" :class="c.color">
            <div class="text-2xl leading-none">{{ c.icon }}</div>
            <div class="text-xl font-bold">{{ c.count }}</div>
            <div class="text-xs">{{ c.label }}</div>
          </div>
        </div>

        <!-- 近 6 个月打卡趋势 -->
        <div v-if="attendanceByMonth.length" class="mb-4">
          <div class="text-xs text-cocoa-500 mb-2">近 6 个月打卡趋势</div>
          <div class="space-y-1.5">
            <div v-for="m in attendanceByMonth" :key="m.month" class="flex items-center gap-2">
              <div class="text-[11px] text-cocoa-500 w-14 shrink-0">{{ m.month }}</div>
              <div class="flex-1 h-3 bg-cocoa-50 rounded-full overflow-hidden">
                <div class="h-full rounded-full" :style="{ width: Math.max(4, m.pct) + '%', background: '#07c160' }"></div>
              </div>
              <div class="text-[11px] text-cocoa-500 w-10 text-right shrink-0">{{ m.count }}次</div>
            </div>
          </div>
        </div>

        <!-- 最近打卡记录 -->
        <div v-if="attendanceRecent.length">
          <div class="text-xs text-cocoa-500 mb-2">最近打卡</div>
          <div class="space-y-2">
            <div v-for="r in attendanceRecent.slice(0, 8)" :key="r.id" class="flex items-center gap-3">
              <div class="w-9 h-9 rounded-lg flex items-center justify-center text-lg shrink-0" :class="(ATTENDANCE_TYPE_META[r.type] || {}).color || 'bg-cocoa-50'">
                {{ (ATTENDANCE_TYPE_META[r.type] || {}).icon || '📌' }}
              </div>
              <div class="flex-1 min-w-0">
                <div class="text-sm text-cocoa-900 font-medium">{{ (ATTENDANCE_TYPE_META[r.type] || {}).label || r.type }} · {{ r.count }} 次</div>
                <div v-if="r.note" class="text-xs text-cocoa-500 truncate">{{ r.note }}</div>
              </div>
              <div class="text-xs text-cocoa-400 shrink-0">{{ r.date }}</div>
            </div>
          </div>
        </div>
        <div v-else class="text-sm text-cocoa-500">暂无打卡记录</div>
      </div>
    </div>

    <!-- 行为表现（与小程序端对齐） -->
    <div v-if="!loading && behavior">
      <h2 class="text-lg font-semibold text-cocoa-900 mb-3 flex items-center gap-2">
        <Scale class="w-5 h-5 text-mint-400" /> 行为表现
      </h2>
      <div class="quick-card">
        <!-- 汇总 chips -->
        <div class="grid grid-cols-3 gap-3 mb-4">
          <div v-for="c in behaviorChips" :key="c.label" class="rounded-xl p-3 flex flex-col items-center gap-1" :class="c.bg">
            <div class="text-2xl font-bold" :style="{ color: c.color }">{{ c.value }}</div>
            <div class="text-xs" :style="{ color: c.color }">{{ c.label }}</div>
          </div>
        </div>

        <!-- 近 6 月趋势（复用考勤 byMonth 横向条形样式，最高值高亮绿） -->
        <div v-if="behaviorByMonth.length" class="mb-4">
          <div class="text-xs text-cocoa-500 mb-2">近 6 月趋势</div>
          <div class="space-y-1.5">
            <div v-for="m in behaviorByMonth" :key="m.month" class="flex items-center gap-2">
              <div class="text-[11px] text-cocoa-500 w-14 shrink-0">{{ m.month }}</div>
              <div class="flex-1 h-3 bg-cocoa-50 rounded-full overflow-hidden">
                <div class="h-full rounded-full" :style="{ width: Math.max(4, m.pct) + '%', background: m.isMax ? COLOR.green : '#c8e6c9' }"></div>
              </div>
              <div class="text-[11px] text-cocoa-500 w-10 text-right shrink-0">{{ m.count }}次</div>
            </div>
          </div>
        </div>

        <!-- 最近记录 -->
        <div v-if="behaviorRecent.length">
          <div class="text-xs text-cocoa-500 mb-2">最近记录</div>
          <div class="space-y-2">
            <div v-for="r in behaviorRecent.slice(0, 8)" :key="r.id" class="flex items-start gap-3">
              <span class="w-2.5 h-2.5 rounded-full mt-1.5 shrink-0" :style="{ background: CATEGORY_COLOR[r.category] || COLOR.amber }"></span>
              <div class="flex-1 min-w-0">
                <div class="text-sm text-cocoa-900 font-medium">{{ r.behavior }}</div>
                <div v-if="r.note" class="text-xs text-cocoa-500 truncate">{{ r.note }}</div>
              </div>
              <div class="text-xs text-cocoa-400 shrink-0">{{ r.date }}</div>
            </div>
          </div>
        </div>
        <div v-else class="text-sm text-cocoa-500">暂无行为记录</div>
      </div>
    </div>

    <!-- 课表 & 值日（与小程序端对齐） -->
    <div v-if="!loading && schedule">
      <h2 class="text-lg font-semibold text-cocoa-900 mb-3 flex items-center gap-2">
        <CalendarCheck class="w-5 h-5 text-mint-400" /> 课表 &amp; 值日
      </h2>
      <div class="quick-card">
        <!-- 7 天条 -->
        <div class="grid grid-cols-7 gap-1.5 mb-4">
          <div
            v-for="d in weekStrip"
            :key="d.dayOfWeek"
            class="text-center py-2 rounded-lg text-xs font-medium"
            :class="d.dayOfWeek === todayDow ? 'bg-mint-500 text-white' : 'bg-cocoa-50 text-cocoa-400'"
          >
            {{ d.label }}
          </div>
        </div>

        <!-- 今日课表 -->
        <div class="mb-4">
          <div class="text-xs text-cocoa-500 mb-2">今日课表</div>
          <div v-if="todaySchedule.length" class="space-y-2">
            <div v-for="(it, i) in todaySchedule" :key="i" class="flex items-center gap-3 bg-cocoa-50 rounded-lg p-3">
              <div class="w-12 text-center text-xs font-semibold text-cocoa-700 shrink-0">{{ it.section || ('第' + it.period + '节') }}</div>
              <div class="flex-1 min-w-0">
                <div class="text-sm text-cocoa-900 font-medium">{{ it.subject }}</div>
                <div v-if="it.teacher" class="text-xs text-cocoa-500">{{ it.teacher }}</div>
              </div>
            </div>
          </div>
          <div v-else class="text-sm text-cocoa-500">今天没有排课</div>
        </div>

        <!-- 本周值日 -->
        <div>
          <div class="text-xs text-cocoa-500 mb-2">本周值日</div>
          <div v-if="upcomingDuty.length" class="space-y-2">
            <div v-for="(du, i) in upcomingDuty" :key="i" class="flex items-center gap-3 bg-cocoa-50 rounded-lg p-3">
              <span class="text-lg shrink-0">🧹</span>
              <div class="flex-1 min-w-0">
                <div class="text-sm text-cocoa-900 font-medium">{{ du.name }}</div>
                <div class="text-xs text-cocoa-500">{{ du.date }} · {{ DUTY_TYPE_LABEL[du.type] || du.type }}</div>
              </div>
            </div>
          </div>
          <div v-else class="text-sm text-cocoa-500">近期没有值日安排</div>
        </div>
      </div>
    </div>

    <!-- 家校沟通（与小程序端对齐） -->
    <div v-if="!loading && communications">
      <h2 class="text-lg font-semibold text-cocoa-900 mb-3 flex items-center gap-2">
        <MessageCircle class="w-5 h-5 text-mint-400" /> 家校沟通
      </h2>
      <div class="quick-card">
        <!-- 次数 chip -->
        <div class="mb-4">
          <span class="inline-flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-full text-white" :style="{ background: COLOR.blue }">
            💬 沟通 {{ commTotal }} 次
          </span>
        </div>

        <!-- 最近沟通 -->
        <div v-if="commRecent.length">
          <div class="text-xs text-cocoa-500 mb-2">最近沟通</div>
          <div class="space-y-3">
            <div v-for="r in commRecent.slice(0, 8)" :key="r.id" class="border-b border-cream-100 pb-3 last:border-0 last:pb-0">
              <div class="flex items-center gap-2 mb-1">
                <span class="text-[11px] px-2 py-0.5 rounded-full bg-sky2-50 text-sky2-700">{{ r.method }}</span>
                <span class="text-xs text-cocoa-400">{{ r.date }}</span>
              </div>
              <div v-if="r.content" class="text-sm text-cocoa-800">{{ r.content }}</div>
              <div v-if="r.followUp" class="text-xs text-cocoa-500 mt-1">跟进：{{ r.followUp }}</div>
              <div class="text-xs text-cocoa-400 mt-1">{{ r.parentName }} · {{ r.relation }}</div>
            </div>
          </div>
        </div>
        <div v-else class="text-sm text-cocoa-500">暂无沟通记录</div>

        <!-- 联系老师 -->
        <button
          class="mt-4 w-full rounded-xl bg-mint-500 text-white font-semibold py-2.5 hover:bg-mint-600"
          @click="contactTeacher"
        >💬 联系老师</button>
      </div>
    </div>

    <!-- 轻提示 -->
    <div v-if="toastMsg" class="fixed inset-x-0 bottom-10 z-50 flex justify-center px-4 pointer-events-none">
      <div class="bg-cocoa-900/90 text-white text-sm rounded-xl px-4 py-2 shadow-lg">{{ toastMsg }}</div>
    </div>

    <!-- 班级公告 -->
    <div v-if="!loading && notices.length > 0" id="parent-notices-section">
      <h2 class="text-lg font-semibold text-cocoa-900 mb-3 flex items-center gap-2"><Bell class="w-5 h-5 text-sakura-400" /> 班级公告</h2>
      <div class="space-y-3">
        <div v-for="n in visibleNotices" :key="n.id" class="quick-card">
          <div class="flex items-center justify-between mb-1">
            <div class="font-medium text-cocoa-900">{{ n.title }}</div>
            <span v-if="n.pinned" class="text-xs bg-butter-100 text-butter-700 px-2 py-0.5 rounded-full">置顶</span>
          </div>
          <div class="text-sm text-cocoa-600 line-clamp-2">{{ n.content }}</div>
          <div class="text-xs text-cocoa-400 mt-2">{{ n.createdAt }}</div>
        </div>
        <div v-if="notices.length > 5" class="text-center">
          <button class="text-sm text-sakura-500 hover:text-sakura-600" @click="showAllNotices = !showAllNotices">
            {{ showAllNotices ? '收起' : ('查看全部 ' + notices.length + ' 条公告') }} →
          </button>
        </div>
      </div>
    </div>

    <!-- 作业列表 -->
    <div v-if="!loading && homework.length > 0" id="parent-homework-section">
      <h2 class="text-lg font-semibold text-cocoa-900 mb-3 flex items-center gap-2"><BookOpen class="w-5 h-5 text-butter-400" /> 作业</h2>
      <div class="space-y-3">
        <div v-for="h in visibleHomework" :key="h.id" class="quick-card">
          <div class="flex items-center justify-between mb-1">
            <div class="font-medium text-cocoa-900">{{ h.subject }} · {{ h.title }}</div>
            <span class="text-xs px-2 py-0.5 rounded-full" :class="h.status === '已完成' ? 'bg-mint-50 text-mint-700' : 'bg-sakura-50 text-sakura-700'">{{ h.status || '待完成' }}</span>
          </div>
          <div class="text-sm text-cocoa-600 line-clamp-2">{{ h.content }}</div>
          <div class="text-xs text-cocoa-400 mt-2">截止：{{ h.deadline || h.startDate || '--' }}</div>
        </div>
        <div v-if="homework.length > 5" class="text-center">
          <button class="text-sm text-sakura-500 hover:text-sakura-600" @click="showAllHomework = !showAllHomework">
            {{ showAllHomework ? '收起' : ('查看全部 ' + homework.length + ' 条作业') }} →
          </button>
        </div>
      </div>
    </div>

    <!-- 空状态 -->
    <div v-if="!loading && !notices.length && !exams.length && !homework.length && !attendance" class="empty-state">
      <div class="icon">🌟</div>
      <div class="title">欢迎来到家长中心</div>
      <div class="desc">老师尚未发布通知、作业或成绩，请稍后再来</div>
    </div>

    <!-- 修改密码弹窗 -->
    <div v-if="showPwdModal" class="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4" @click.self="showPwdModal = false">
      <div class="w-full max-w-sm bg-white rounded-2xl p-5 shadow-xl">
        <div class="flex items-center justify-between mb-4">
          <div class="text-lg font-semibold text-cocoa-900">修改登录密码</div>
          <button class="text-cocoa-400 hover:text-cocoa-600" @click="showPwdModal = false">✕</button>
        </div>
        <div v-if="pwdOk" class="mb-3 text-sm text-mint-700 bg-mint-50 rounded-lg p-3">✅ 密码修改成功</div>
        <div v-if="pwdError" class="mb-3 text-sm text-sakura-700 bg-sakura-50 rounded-lg p-3">{{ pwdError }}</div>
        <label class="block text-sm text-cocoa-600 mb-1">原密码</label>
        <input v-model="oldPwd" type="password" placeholder="请输入当前密码" class="w-full rounded-xl border border-cream-200 px-3 py-2 mb-3 text-cocoa-800 focus:outline-none focus:border-butter-400" />
        <label class="block text-sm text-cocoa-600 mb-1">新密码（至少 8 位）</label>
        <input v-model="newPwd" type="password" placeholder="请输入新密码" class="w-full rounded-xl border border-cream-200 px-3 py-2 mb-4 text-cocoa-800 focus:outline-none focus:border-butter-400" />
        <button
          class="w-full rounded-xl bg-mint-500 text-white font-semibold py-2.5 hover:bg-mint-600 disabled:opacity-60"
          :disabled="pwdLoading"
          @click="submitChangePwd"
        >
          <Loader2 v-if="pwdLoading" class="w-4 h-4 inline animate-spin" /> {{ pwdLoading ? '提交中…' : '确认修改' }}
        </button>
      </div>
    </div>

    <!-- 考试详情弹窗（点击「考试次数」卡片打开） -->
    <div v-if="showExamListModal" class="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4" @click.self="showExamListModal = false">
      <div class="w-full max-w-2xl bg-white rounded-2xl p-5 shadow-xl max-h-[80vh] overflow-auto">
        <div class="flex items-center justify-between mb-4">
          <div class="text-lg font-semibold text-cocoa-900">考试详情（共 {{ exams.length }} 次）</div>
          <button class="text-cocoa-400 hover:text-cocoa-600" @click="showExamListModal = false">✕</button>
        </div>
        <div v-if="!exams.length" class="text-sm text-cocoa-400 text-center py-6">暂无考试记录</div>
        <div v-else class="space-y-3">
          <div
            v-for="(e, i) in exams"
            :key="e.examId || i"
            class="border border-cream-200 rounded-xl p-3 cursor-pointer hover:border-butter-300 transition-colors"
            @click="selectedExamIndex = i; showExamListModal = false; scrollToSection('parent-grades-section')"
          >
            <div class="flex items-center justify-between mb-2">
              <div class="font-semibold text-cocoa-900">{{ e.examName }}</div>
              <span class="text-xs text-cocoa-400">{{ e.date }}</span>
            </div>
            <div class="grid grid-cols-4 gap-2 text-xs">
              <div class="bg-cocoa-50 rounded-lg p-2 text-center">
                <div class="text-cocoa-400">总分</div>
                <div class="font-bold text-cocoa-900 mt-0.5">{{ e.totalScore ?? '--' }}/{{ e.totalFullScore ?? '--' }}</div>
              </div>
              <div v-if="e.classRank" class="bg-mint-50 rounded-lg p-2 text-center">
                <div class="text-mint-500">班级排名</div>
                <div class="font-bold text-mint-600 mt-0.5">第{{ e.classRank }}名</div>
              </div>
              <div v-if="e.gradeRank" class="bg-butter-50 rounded-lg p-2 text-center">
                <div class="text-butter-500">年级排名</div>
                <div class="font-bold text-butter-600 mt-0.5">第{{ e.gradeRank }}名</div>
              </div>
              <div class="bg-sky2-50 rounded-lg p-2 text-center">
                <div class="text-sky2-500">科目数</div>
                <div class="font-bold text-sky2-600 mt-0.5">{{ (e.subjects || []).length }}科</div>
              </div>
            </div>
            <!-- 各科成绩 -->
            <div v-if="e.subjects?.length" class="mt-2 flex flex-wrap gap-1.5">
              <span
                v-for="s in e.subjects"
                :key="s.subject"
                class="text-xs px-2 py-1 rounded-full"
                :class="s.score != null && s.fullScore && s.score / s.fullScore >= 0.8 ? 'bg-mint-50 text-mint-600' : s.score != null && s.fullScore && s.score / s.fullScore < 0.6 ? 'bg-sakura-50 text-sakura-600' : 'bg-cream-100 text-cocoa-600'"
              >{{ s.subject }}: {{ s.score ?? '缺考' }}/{{ s.fullScore }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
