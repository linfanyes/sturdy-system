<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import dayjs from 'dayjs'
import { useAuthStore } from '@/stores/auth'
import { useRoleSwitchStore } from '@/stores/roleSwitch'
import { getParentMe, getParentNotices, getParentExams, getParentHomework, getParentAttendance, changeParentPassword, getParentBehavior, getParentSchedule, getParentCommunications, getParentTeachers, switchStudent, submitStudentUpdateRequest, listStudentUpdateRequests, subscribeParentDemo } from '@/api/parent'
import type { ParentAttendance, ParentBehavior, ParentSchedule, ParentCommunications, ParentMe, StudentUpdateRequest, ParentTeacher } from '@/api/parent'
import { Sparkles, BookOpen, Bell, ChevronRight, Loader2, ClipboardList, CalendarCheck, MessageCircle, Repeat, UserCog, Phone, TrendingUp, TrendingDown } from 'lucide-vue-next'
import WelcomeHero from '@/components/WelcomeHero.vue'
import GradeOverview from './components/GradeOverview.vue'
import BehaviorRecord from './components/BehaviorRecord.vue'
import NoticeList from './components/NoticeList.vue'

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
const teachers = ref<ParentTeacher[]>([])
const selectedExamIndex = ref(0)

// 成绩筛选：学期 / 考试名称 / 科目（均支持「全部」）
const filterTerm = ref('')        // 空 = 全部学期
const filterExamName = ref('')    // 空 = 全部考试
const filterSubject = ref('')     // 空 = 全部科目

// 学期 / 考试名称 / 科目 选项（由 exams 派生，去重）
const termOptions = computed(() => {
  const set = new Set<string>()
  for (const e of exams.value) { if (e.term) set.add(e.term) }
  return Array.from(set)
})
const examNameOptions = computed(() => {
  const set = new Set<string>()
  for (const e of exams.value) { if (e.examName) set.add(e.examName) }
  return Array.from(set)
})
const subjectOptions = computed(() => {
  const set = new Set<string>()
  for (const e of exams.value) {
    for (const s of (e.subjects || [])) { if (s.subject) set.add(s.subject) }
  }
  return Array.from(set)
})

// 按筛选条件过滤的考试列表（用于成绩区展示）
const filteredExams = computed(() => {
  return exams.value.filter(e => {
    if (filterTerm.value && e.term !== filterTerm.value) return false
    if (filterExamName.value && e.examName !== filterExamName.value) return false
    return true
  })
})

// 当前选中的考试（成绩查询区）—— 取筛选后的最近一次
const selectedExam = computed(() => {
  if (!filteredExams.value.length) return null
  const idx = Math.min(selectedExamIndex.value, filteredExams.value.length - 1)
  return filteredExams.value[idx] || filteredExams.value[filteredExams.value.length - 1]
})

// 今日星期（1=周一 … 7=周日），与小程序端 dayOfWeek 约定一致
const todayDow = ((new Date().getDay() + 6) % 7) + 1
const tomorrowDow = (todayDow % 7) + 1
const todaySchedule = computed(() => (schedule.value?.week || []).find((d: any) => d.dayOfWeek === todayDow)?.items || [])
const tomorrowSchedule = computed(() => (schedule.value?.week || []).find((d: any) => d.dayOfWeek === tomorrowDow)?.items || [])

/* ============ 作业状态 ============ */
const DONE_HW_STATUSES = ['已完成', '已批改', '已发还']
const OVERDUE_HW_STATUSES = ['逾期', '已逾期']
function isHwDone(h: any) { return DONE_HW_STATUSES.includes(h.status) }
function isHwOverdue(h: any) {
  if (OVERDUE_HW_STATUSES.includes(h.status)) return true
  if (isHwDone(h) || !h.deadline) return false
  return dayjs(String(h.deadline).slice(0, 10)).isBefore(dayjs().startOf('day'))
}
function hwStatusCls(h: any) {
  if (isHwOverdue(h)) return 'bg-sakura-50 text-sakura-700'
  if (isHwDone(h)) return 'bg-mint-50 text-mint-700'
  if (h.status === '待批改') return 'bg-sky2-50 text-sky2-600'
  return 'bg-butter-50 text-butter-700'
}
/** 截止倒计时：逾期 / 今天截止 / 3 天内截止 才显示醒目提示 */
function deadlineChip(h: any): { text: string; cls: string } | null {
  if (isHwDone(h) || !h.deadline) return null
  const diff = dayjs(String(h.deadline).slice(0, 10)).diff(dayjs().startOf('day'), 'day')
  if (isHwOverdue(h) || diff < 0) return { text: '已逾期', cls: 'bg-sakura-50 text-sakura-700' }
  if (diff === 0) return { text: '今天截止', cls: 'bg-butter-100 text-butter-700' }
  if (diff <= 3) return { text: `${diff} 天后截止`, cls: 'bg-butter-50 text-butter-600' }
  return null
}

/* ============ 考试与变化量 ============ */
const examsByDate = computed(() => [...exams.value].sort((a: any, b: any) => (a.date || '').localeCompare(b.date || '')))
const latestExam = computed<any>(() => examsByDate.value.length ? examsByDate.value[examsByDate.value.length - 1] : null)
const prevExam = computed<any>(() => examsByDate.value.length > 1 ? examsByDate.value[examsByDate.value.length - 2] : null)
function scorePct(e: any): number | null {
  if (!e || e.totalScore == null || !e.totalFullScore) return null
  return Math.round((e.totalScore / e.totalFullScore) * 1000) / 10
}
const latestPct = computed(() => scorePct(latestExam.value))
const pctDelta = computed(() => {
  const a = scorePct(latestExam.value)
  const b = scorePct(prevExam.value)
  if (a == null || b == null) return null
  return Math.round((a - b) * 10) / 10
})
const rankDelta = computed(() => {
  const l = latestExam.value?.classRank
  const p = prevExam.value?.classRank
  if (l == null || p == null) return null
  return p - l // 正数 = 名次上升
})

/* 成绩趋势：按日期取近 8 场考试，得分率 = totalScore/totalFullScore */
const scoreTrend = computed(() => {
  return examsByDate.value
    .filter((e: any) => e.totalScore != null && e.totalFullScore)
    .slice(-8)
    .map((e: any) => ({
      label: (e.examName || '考试').length > 6 ? (e.examName as string).slice(0, 6) + '…' : e.examName,
      value: Math.round((e.totalScore / e.totalFullScore) * 1000) / 10,
    }))
})

/* 月度成长足迹：attendance.byMonth 打卡次数 */
const monthTrend = computed(() => {
  const byMonth = (attendance.value?.byMonth || []) as Array<{ month: string; count: number }>
  if (!byMonth.length) return [{ label: '暂无数据', value: 0 }]
  return byMonth.slice(-6).map((m) => ({ label: m.month, value: m.count }))
})

// 课表 & 值日
const DUTY_TYPE_LABEL: Record<string, string> = { daily: '日常', weekly: '每周' }
const WEEK_LABELS = ['周一', '周二', '周三', '周四', '周五', '周六', '周日']

const weekStrip = computed(() =>
  (schedule.value?.week || []).map((d: any) => ({ ...d, label: WEEK_LABELS[d.dayOfWeek - 1] || '' })),
)
const upcomingDuty = computed(() => schedule.value?.upcomingDuty || [])
function dutyDaysLeft(dateStr: string): number | null {
  if (!dateStr) return null
  const diff = dayjs(String(dateStr).slice(0, 10)).diff(dayjs().startOf('day'), 'day')
  return diff < 0 ? null : diff
}

// 家校沟通
const commTotal = computed(() => communications.value?.total || 0)
const commRecent = computed(() => communications.value?.recent || [])

// 联系老师：展示科任老师联系方式（班主任优先），可直接拨号
const showContactModal = ref(false)
const contactList = computed(() =>
  [...teachers.value].sort((a, b) => (a.role === 'head' ? -1 : 0) - (b.role === 'head' ? -1 : 0)),
)
function contactTeacher() {
  if (!teachers.value.length) {
    toastMsg.value = '暂无老师联系方式，请联系班主任'
    if (toastTimer) clearTimeout(toastTimer)
    toastTimer = setTimeout(() => { toastMsg.value = '' }, 2500)
    return
  }
  showContactModal.value = true
}

const toastMsg = ref('')
let toastTimer: ReturnType<typeof setTimeout> | null = null

/** 师兼家：切换到教师端 */
const canSwitchToTeacher = computed(() => !!roleSwitchStore.parentToken)
async function switchToTeacher() {
  if (!await confirm('确定切换到教师端？')) return
  roleSwitchStore.switchTo('teacher', auth.setAuth)
  await auth.fetchMe()
  router.push('/teacher')
}

const studentName = computed(() => me.value?.studentName || auth.user?.studentName || '')
const className = computed(() => me.value?.className || '')

const pendingNotices = computed(() => notices.value.filter(n => !n.ended).length)
const pendingHomework = computed(() => homework.value.filter(h => !isHwDone(h)).length)

// 考勤看板
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

/* ============ 孩子在校健康度总览（彩色卡片，可点击跳转） ============ */
type HealthTone = 'green' | 'yellow' | 'red'
const HEALTH_TONE_CLS: Record<HealthTone, string> = {
  green: 'bg-mint-50 border-mint-300/50',
  yellow: 'bg-butter-50 border-butter-300/60',
  red: 'bg-sakura-50 border-sakura-300/60',
}
const HEALTH_TONE_TEXT: Record<HealthTone, string> = {
  green: 'text-mint-700',
  yellow: 'text-butter-700',
  red: 'text-sakura-700',
}
const HEALTH_TONE_LABEL: Record<HealthTone, string> = { green: '良好', yellow: '需关注', red: '预警' }
const healthOverview = computed(() => {
  const att: any = attendance.value
  const attRecent = (att && att.recent) || []
  const attNegative = attRecent.some((r: any) => /旷课|缺勤|违纪|迟到/.test(r.note || ''))
  const attCount = (att && att.total) || 0
  const subs = (latestExam.value && latestExam.value.subjects) || []
  const weak = subs.filter((s: any) => s.score != null && s.fullScore && s.score / s.fullScore < 0.6).length
  const strong = subs.filter((s: any) => s.score != null && s.fullScore && s.score / s.fullScore >= 0.8).length
  const overdue = homework.value.filter((h: any) => isHwOverdue(h)).length
  const pend = pendingHomework.value
  const beh = (att && att.summary && att.summary.behavior) || 0
  const urgent = notices.value.filter((n: any) => n.pinned).length
  return [
    { key: 'attendance', label: '考勤', icon: '🕒', tone: (attNegative ? 'red' : attCount > 0 ? 'green' : 'yellow') as HealthTone, hint: attNegative ? '有缺勤/违纪' : attCount > 0 ? '打卡正常' : '暂无打卡', target: 'parent-attendance-section' },
    { key: 'exam', label: '成绩', icon: '📈', tone: (weak >= 2 ? 'red' : weak === 1 ? 'yellow' : strong > 0 ? 'green' : 'yellow') as HealthTone, hint: weak >= 2 ? '多科偏弱' : weak === 1 ? '一科偏弱' : strong > 0 ? '发挥稳定' : '暂无数据', target: 'parent-grades-section' },
    { key: 'homework', label: '作业', icon: '✅', tone: (overdue > 0 ? 'red' : pend > 0 ? 'yellow' : 'green') as HealthTone, hint: overdue > 0 ? overdue + ' 项逾期' : pend > 0 ? pend + ' 项待完成' : '全部完成', target: 'parent-homework-section' },
    { key: 'behavior', label: '行为', icon: '⚖️', tone: (beh > 0 ? 'green' : 'yellow') as HealthTone, hint: beh > 0 ? '表现良好' : '暂无记录', target: 'parent-behavior-section' },
    { key: 'comm', label: '沟通', icon: '💬', tone: (urgent > 0 ? 'red' : notices.value.length > 0 ? 'green' : 'yellow') as HealthTone, hint: urgent > 0 ? urgent + ' 条置顶' : notices.value.length > 0 ? '消息正常' : '暂无消息', target: 'parent-comm-section' },
  ]
})
const reminders = computed(() => {
  const list: Array<{ icon: string; text: string; level: 'yellow' | 'red' }> = []
  homework.value.filter((h: any) => isHwOverdue(h)).forEach((h: any) => list.push({ icon: '⏰', text: '作业逾期：' + h.subject + '·' + h.title, level: 'red' }))
  ;((attendance.value as any)?.recent || []).filter((r: any) => /旷课|缺勤|违纪|迟到/.test(r.note || '')).forEach((r: any) => list.push({ icon: '⚠️', text: '考勤预警：' + r.note, level: 'red' }))
  notices.value.filter((n: any) => n.pinned).forEach((n: any) => list.push({ icon: '📢', text: '置顶通知：' + n.title, level: 'yellow' }))
  const pend = homework.value.filter((h: any) => !isHwDone(h) && !isHwOverdue(h))
  if (pend.length) list.push({ icon: '📝', text: pend.length + ' 项作业待完成', level: 'yellow' })
  return list
})

/* ============ 每周小结 ============ */
const weekSummary = computed(() => {
  const dow = (dayjs().day() + 6) % 7 // 0=周一
  const weekStart = dayjs().subtract(dow, 'day').startOf('day')
  const inWeek = (d?: string) => !!d && !dayjs(String(d).slice(0, 10)).isBefore(weekStart)
  const attWeek = ((attendance.value?.recent) || []).filter((r: any) => inWeek(r.date))
  const checkinCount = attWeek.reduce((s: number, r: any) => s + (r.count || 1), 0)
  const behWeek = ((behavior.value?.recent) || []).filter((r: any) => inWeek(r.date))
  const praise = behWeek.filter((b: any) => b.category === 'praise').length
  const violation = behWeek.filter((b: any) => b.category === 'violation').length
  const hwTotal = homework.value.length
  const hwDone = homework.value.filter((h: any) => isHwDone(h)).length
  const hwRate = hwTotal ? Math.round((hwDone / hwTotal) * 100) : null
  const has = checkinCount > 0 || praise > 0 || violation > 0 || hwTotal > 0
  return { checkinCount, praise, violation, hwTotal, hwDone, hwRate, has }
})

// 公告/作业「查看全部」展开
const showAllNotices = ref(false)
const showAllHomework = ref(false)

// 看板卡片点击跳转
const showExamListModal = ref(false)
function scrollToSection(id: string) {
  const el = document.getElementById(id)
  if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
}
function clickNoticeCard() { scrollToSection('parent-notices-section') }
function clickHomeworkCard() { scrollToSection('parent-homework-section') }
function clickExamCountCard() { showExamListModal.value = true }
function clickRankCard() { scrollToSection('parent-grades-section') }
/** 从考试列表弹窗选择某次考试 */
function pickExam(indexInAll: number) {
  filterTerm.value = ''
  filterExamName.value = ''
  filterSubject.value = ''
  selectedExamIndex.value = indexInAll
  showExamListModal.value = false
  scrollToSection('parent-grades-section')
}

// 科任老师信息弹窗
const showTeacherModal = ref(false)
const teacherModalInfo = ref<{ name: string; subject?: string; section?: string; className?: string } | null>(null)
function openTeacherModal(it: any) {
  if (!it || !it.teacher) return
  teacherModalInfo.value = {
    name: it.teacher,
    subject: it.subject,
    section: it.section || ('第' + it.period + '节'),
    className: className.value,
  }
  showTeacherModal.value = true
}

// 修改密码
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
    auth.setAuth(result.token, auth.user!)
    const freshMe = await getParentMe()
    if (freshMe) {
      me.value = freshMe
      activeKidId.value = freshMe.studentId
      load()
    }
  } catch (e) {
    // 切换失败保持当前孩子，静默处理
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

// 学生信息查看 / 申请修改
const studentInfo = computed(() => me.value?.studentInfo)
const showStudentInfoModal = ref(false)
const showStudentRequestsModal = ref(false)
const studentRequests = ref<StudentUpdateRequest[]>([])
const studentRequestsLoading = ref(false)
const editForm = ref({
  parentPhone: '',
  studentPhone: '',
  address: '',
  birthDate: '',
  parentName: '',
  note: '',
})
const editSubmitting = ref(false)
const editError = ref('')
const editOk = ref(false)

const REQUEST_STATUS_META: Record<string, { label: string; cls: string }> = {
  pending: { label: '待审核', cls: 'bg-butter-50 text-butter-700' },
  approved: { label: '已通过', cls: 'bg-mint-50 text-mint-700' },
  rejected: { label: '已拒绝', cls: 'bg-sakura-50 text-sakura-700' },
}

function openEditStudentInfo() {
  const si = me.value?.studentInfo || {}
  editForm.value = {
    parentPhone: si.parentPhone || '',
    studentPhone: si.studentPhone || '',
    address: si.address || '',
    birthDate: si.birthDate || '',
    parentName: si.parentName || me.value?.parentName || '',
    note: si.note || '',
  }
  editError.value = ''
  editOk.value = false
  showStudentInfoModal.value = true
}

async function submitStudentInfo() {
  editError.value = ''
  editOk.value = false
  editSubmitting.value = true
  try {
    await submitStudentUpdateRequest({ ...editForm.value })
    editOk.value = true
    setTimeout(() => { showStudentInfoModal.value = false; editOk.value = false }, 1200)
  } catch (e: any) {
    editError.value = e?.message || '提交失败，请重试'
  } finally {
    editSubmitting.value = false
  }
}

async function openStudentRequests() {
  showStudentRequestsModal.value = true
  studentRequestsLoading.value = true
  try {
    const list = await listStudentUpdateRequests()
    studentRequests.value = Array.isArray(list) ? list : []
  } catch (e) {
    studentRequests.value = []
  } finally {
    studentRequestsLoading.value = false
  }
}

async function load() {
  loading.value = true
  loadError.value = false
  try {
    const [meData, noticeData, examData, hwData, attData, behData, schData, commData, tchData] = await Promise.allSettled([
      getParentMe(),
      getParentNotices(),
      getParentExams(),
      getParentHomework(),
      getParentAttendance(),
      getParentBehavior(),
      getParentSchedule(),
      getParentCommunications(),
      getParentTeachers(),
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
    if (tchData.status === 'fulfilled') teachers.value = Array.isArray(tchData.value) ? tchData.value : []
    loadError.value = meData.status !== 'fulfilled'
    selectedExamIndex.value = Math.max(0, exams.value.length - 1)
  } catch (e) {
    loadError.value = true
  } finally {
    loading.value = false
  }
}

onMounted(load)

// 消息订阅（弱化展示，可关闭；关闭状态本地记忆）
const SUBSCRIBE_DISMISS_KEY = 'g_parent_subscribe_dismissed'
const subscribeStatus = ref<'none' | 'loading' | 'done'>('none')
const subscribeDismissed = ref(localStorage.getItem(SUBSCRIBE_DISMISS_KEY) === '1')

async function subscribeNotifications() {
  subscribeStatus.value = 'loading'
  try {
    await subscribeParentDemo()
    subscribeStatus.value = 'done'
    setTimeout(() => {
      subscribeStatus.value = 'none'
      subscribeDismissed.value = true
      localStorage.setItem(SUBSCRIBE_DISMISS_KEY, '1')
    }, 2000)
  } catch (e) {
    subscribeStatus.value = 'none'
  }
}
function dismissSubscribe() {
  subscribeDismissed.value = true
  localStorage.setItem(SUBSCRIBE_DISMISS_KEY, '1')
}
</script>

<template>
  <div class="space-y-6">
    <!-- 孩子选择条 -->
    <div v-if="me?.kids && me.kids.length > 1" class="flex gap-2 px-4 py-2 overflow-x-auto bg-surface border-b shrink-0 -mx-4 -mt-6">
      <div
        v-for="kid in me.kids" :key="kid.studentId"
        @click="switchToKid(kid.studentId)"
        class="shrink-0 px-3 py-1.5 rounded-full text-sm cursor-pointer transition-colors"
        :class="kid.studentId === activeKidId ? 'bg-mint-500 text-white' : 'bg-cream-100 text-cocoa-600 hover:bg-cream-200'"
      >
        {{ kid.studentName }}
      </div>
      <router-link
        to="/parent/compare"
        class="shrink-0 px-3 py-1.5 rounded-full text-sm bg-butter-500 text-white ml-auto"
      >
        📊 跨娃比对
      </router-link>
    </div>

    <!-- 错误/重试态 -->
    <div
      v-if="loadError"
      class="flex cursor-pointer items-center justify-center gap-2 rounded-xl bg-butter-100 px-4 py-2 text-sm font-medium text-butter-700"
      @click="load()"
    >⚠️ 数据加载失败，点击重试</div>

    <!-- 欢迎横幅 -->
    <div class="welcome-banner">
      <WelcomeHero
        :name="studentName ? studentName + '同学家长' : '家长'"
        role-label="的成长看板"
        :subtitle="className ? '班级：' + className : '家长中心'"
        badge="家长中心"
        avatar="👪"
        accent="sakura"
      >
        <template #actions>
          <button
            v-if="canSwitchToTeacher"
            class="shrink-0 text-sm rounded-xl border border-mint-300 bg-mint-50 px-3 py-1.5 text-mint-700 hover:bg-mint-100 transition-colors flex items-center gap-1"
            @click="switchToTeacher"
          >
            <Repeat class="w-3.5 h-3.5" /> 切换至教师端
          </button>
          <button
            class="shrink-0 text-sm rounded-xl border border-white/40 bg-surface/20 px-3 py-1.5 text-cocoa-800 hover:bg-surface/30"
            @click="showPwdModal = true"
          >⚙️ 修改密码</button>
        </template>
      </WelcomeHero>
    </div>

    <!-- 加载骨架屏 -->
    <div v-if="loading" class="space-y-4" role="status" aria-live="polite">
      <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div v-for="i in 4" :key="i" class="h-24 rounded-2xl bg-cream-100 animate-pulse"></div>
      </div>
      <div class="h-40 rounded-2xl bg-cream-100 animate-pulse"></div>
      <div class="h-56 rounded-2xl bg-cream-100 animate-pulse"></div>
      <div class="h-40 rounded-2xl bg-cream-100 animate-pulse"></div>
      <span class="sr-only">加载中…</span>
    </div>

    <template v-else>
      <!-- 今日需关注（置顶提醒卡） -->
      <div v-if="reminders.length" class="rounded-2xl border-l-4 border-sakura-400 bg-surface p-4 shadow-softer">
        <div class="text-sm font-bold text-cocoa-900 mb-2 flex items-center gap-2">
          <Bell class="w-4 h-4 text-sakura-500" /> 今日需关注
          <span class="text-xs font-normal text-cocoa-400">{{ reminders.length }} 项</span>
        </div>
        <div class="space-y-1.5">
          <div v-for="(r, i) in reminders" :key="i" class="flex items-center gap-2 text-sm" :class="r.level === 'red' ? 'text-sakura-700' : 'text-cocoa-700'">
            <span>{{ r.icon }}</span><span>{{ r.text }}</span>
          </div>
        </div>
      </div>

      <!-- 概览卡片 -->
      <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div class="stat-card cursor-pointer hover:shadow-lg hover:-translate-y-0.5 transition-all" @click="clickNoticeCard">
          <div class="flex items-center gap-2 text-sm text-cocoa-500 mb-1"><Bell class="w-4 h-4 text-sakura-500" /> 待读通知</div>
          <div class="text-3xl font-bold text-cocoa-900">{{ pendingNotices }}</div>
          <div class="text-xs text-sakura-400 mt-1 flex items-center gap-0.5">查看通知 <ChevronRight class="w-3 h-3" /></div>
        </div>
        <div class="stat-card cursor-pointer hover:shadow-lg hover:-translate-y-0.5 transition-all" @click="clickHomeworkCard">
          <div class="flex items-center gap-2 text-sm text-cocoa-500 mb-1"><ClipboardList class="w-4 h-4 text-butter-500" /> 待完成作业</div>
          <div class="text-3xl font-bold text-cocoa-900">{{ pendingHomework }}</div>
          <div class="text-xs text-butter-500 mt-1 flex items-center gap-0.5">查看作业 <ChevronRight class="w-3 h-3" /></div>
        </div>
        <div class="stat-card cursor-pointer hover:shadow-lg hover:-translate-y-0.5 transition-all" @click="clickExamCountCard">
          <div class="flex items-center gap-2 text-sm text-cocoa-500 mb-1"><Sparkles class="w-4 h-4 text-mint-500" /> 最近考试</div>
          <div class="text-3xl font-bold text-cocoa-900">
            <template v-if="latestPct != null">{{ latestPct }}<span class="text-base font-semibold text-cocoa-400">%</span></template>
            <template v-else>--</template>
          </div>
          <div class="text-xs mt-1 flex items-center gap-1">
            <template v-if="pctDelta != null && pctDelta !== 0">
              <span :class="pctDelta > 0 ? 'text-mint-600' : 'text-sakura-500'" class="flex items-center gap-0.5">
                <component :is="pctDelta > 0 ? TrendingUp : TrendingDown" class="w-3 h-3" />
                较上次 {{ pctDelta > 0 ? '+' : '' }}{{ pctDelta }}%
              </span>
            </template>
            <span class="text-mint-500 flex items-center gap-0.5">得分率详情 <ChevronRight class="w-3 h-3" /></span>
          </div>
        </div>
        <div class="stat-card cursor-pointer hover:shadow-lg hover:-translate-y-0.5 transition-all" @click="clickRankCard">
          <div class="flex items-center gap-2 text-sm text-cocoa-500 mb-1"><TrendingUp class="w-4 h-4 text-sky2-500" /> 最新排名</div>
          <div class="text-3xl font-bold text-cocoa-900">
            <template v-if="latestExam && latestExam.classRank">第 {{ latestExam.classRank }} 名</template>
            <template v-else>--</template>
          </div>
          <div class="text-xs mt-1 flex items-center gap-1">
            <template v-if="rankDelta != null && rankDelta !== 0">
              <span :class="rankDelta > 0 ? 'text-mint-600' : 'text-sakura-500'">较上次 {{ rankDelta > 0 ? '上升' : '下降' }} {{ Math.abs(rankDelta) }} 名</span>
            </template>
            <span class="text-sky2-500 flex items-center gap-0.5">查看成绩 <ChevronRight class="w-3 h-3" /></span>
          </div>
        </div>
      </div>

      <!-- 学习工具快捷入口 -->
      <div class="flex flex-wrap gap-2">
        <router-link
          to="/parent/textbook"
          class="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-surface border border-cream-200 text-sm font-medium text-cocoa-700 hover:bg-cream-50 transition-colors"
        >
          📖 教材知识点
        </router-link>
        <router-link
          to="/parent/resources"
          class="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-surface border border-cream-200 text-sm font-medium text-cocoa-700 hover:bg-cream-50 transition-colors"
        >
          🧰 专项资源库
        </router-link>
        <router-link
          v-if="me?.kids && me.kids.length > 1"
          to="/parent/compare"
          class="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-surface border border-cream-200 text-sm font-medium text-cocoa-700 hover:bg-cream-50 transition-colors"
        >
          📊 跨娃比对
        </router-link>
      </div>

      <!-- 作业（上移：家长最关心的待办） -->
      <div v-if="homework.length > 0" id="parent-homework-section">
        <h2 class="section-title"><BookOpen class="w-5 h-5 text-butter-400" /> 作业</h2>
        <div class="space-y-3">
          <div v-for="h in (showAllHomework ? homework : homework.slice(0, 5))" :key="h.id" class="quick-card" :class="isHwOverdue(h) ? 'border-l-4 border-l-sakura-400' : ''">
            <div class="flex items-center justify-between mb-1 gap-2">
              <div class="font-medium text-cocoa-900">{{ h.subject }} · {{ h.title }}</div>
              <div class="flex items-center gap-1.5 shrink-0">
                <span v-if="deadlineChip(h)" class="text-xs px-2 py-0.5 rounded-full font-medium" :class="deadlineChip(h)!.cls">{{ deadlineChip(h)!.text }}</span>
                <span class="text-xs px-2 py-0.5 rounded-full" :class="hwStatusCls(h)">{{ h.status || '待完成' }}</span>
              </div>
            </div>
            <div class="text-sm text-cocoa-600 line-clamp-2">{{ h.content }}</div>
            <div class="text-xs text-cocoa-400 mt-2">截止：{{ h.deadline || '未设置' }}</div>
          </div>
          <div v-if="homework.length > 5" class="text-center">
            <button class="text-sm text-sakura-500 hover:text-sakura-600" @click="showAllHomework = !showAllHomework">
              {{ showAllHomework ? '收起' : ('查看全部 ' + homework.length + ' 条作业') }} →
            </button>
          </div>
        </div>
      </div>

      <!-- 班级公告（上移） -->
      <NoticeList :loading="loading" :notices="notices" @toggle-show-all="showAllNotices = !showAllNotices" />

      <!-- 消息订阅（弱化、可关闭） -->
      <div v-if="!subscribeDismissed && subscribeStatus !== 'done'" class="flex items-center gap-3 rounded-2xl border border-cream-200 bg-surface px-4 py-3">
        <span class="text-xl">🔔</span>
        <div class="flex-1 min-w-0">
          <div class="text-sm font-medium text-cocoa-800">开启通知订阅</div>
          <div class="text-xs text-cocoa-500">作业提醒、新公告、成绩发布及时推送</div>
        </div>
        <button
          class="shrink-0 text-sm rounded-xl border border-mint-300 bg-mint-50 px-3 py-1.5 text-mint-700 hover:bg-mint-100 disabled:opacity-50"
          :disabled="subscribeStatus === 'loading'"
          @click="subscribeNotifications"
        >{{ subscribeStatus === 'loading' ? '订阅中…' : '去开启' }}</button>
        <button class="shrink-0 text-cocoa-300 hover:text-cocoa-500 text-lg leading-none" title="不再提示" @click="dismissSubscribe">×</button>
      </div>
      <div v-else-if="subscribeStatus === 'done'" class="rounded-2xl border border-mint-300 bg-mint-50 px-4 py-3 text-center text-sm text-mint-700">
        ✅ 订阅成功，将及时收到通知
      </div>

      <!-- 孩子在校健康度总览（彩色状态卡） -->
      <div v-if="healthOverview.length" class="quick-card">
        <div class="section-title">
          <Sparkles class="w-5 h-5 text-mint-400" />
          <h2>孩子在校健康度总览</h2>
        </div>
        <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
          <button
            v-for="h in healthOverview" :key="h.key"
            class="flex flex-col items-center text-center gap-1.5 rounded-2xl border p-3 transition-all hover:shadow-md hover:-translate-y-0.5"
            :class="HEALTH_TONE_CLS[h.tone]"
            @click="scrollToSection(h.target)"
          >
            <span class="text-2xl leading-none">{{ h.icon }}</span>
            <span class="text-sm font-bold text-cocoa-900">{{ h.label }}</span>
            <span class="text-xs font-semibold px-2 py-0.5 rounded-full bg-surface/70" :class="HEALTH_TONE_TEXT[h.tone]">{{ HEALTH_TONE_LABEL[h.tone] }}</span>
            <span class="text-xs text-cocoa-500 leading-tight">{{ h.hint }}</span>
          </button>
        </div>
      </div>

      <!-- 每周小结 -->
      <div v-if="weekSummary.has" class="quick-card">
        <div class="section-title">
          <CalendarCheck class="w-5 h-5 text-butter-400" />
          <h2>每周小结</h2>
          <span class="ml-auto text-xs text-cocoa-400">本周一至今</span>
        </div>
        <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div class="rounded-xl bg-mint-50 p-3 text-center">
            <div class="text-2xl font-bold text-mint-600">{{ weekSummary.checkinCount }}</div>
            <div class="text-xs text-cocoa-500 mt-1">本周打卡（次）</div>
          </div>
          <div class="rounded-xl bg-butter-50 p-3 text-center">
            <div class="text-2xl font-bold text-butter-600">{{ weekSummary.praise }}</div>
            <div class="text-xs text-cocoa-500 mt-1">本周表扬（次）</div>
          </div>
          <div class="rounded-xl p-3 text-center" :class="weekSummary.violation > 0 ? 'bg-sakura-50' : 'bg-cream-50'">
            <div class="text-2xl font-bold" :class="weekSummary.violation > 0 ? 'text-sakura-600' : 'text-cocoa-400'">{{ weekSummary.violation }}</div>
            <div class="text-xs text-cocoa-500 mt-1">本周违纪（次）</div>
          </div>
          <div class="rounded-xl bg-sky2-50 p-3 text-center">
            <div class="text-2xl font-bold text-sky2-600">
              <template v-if="weekSummary.hwRate != null">{{ weekSummary.hwRate }}%</template>
              <template v-else>--</template>
            </div>
            <div class="text-xs text-cocoa-500 mt-1">作业完成率（{{ weekSummary.hwDone }}/{{ weekSummary.hwTotal }}）</div>
          </div>
        </div>
      </div>

      <!-- 成绩概览子组件 -->
      <GradeOverview
        :loading="loading"
        :exams="exams"
        :selected-exam="selectedExam"
        :filter-term="filterTerm"
        :filter-exam-name="filterExamName"
        :filter-subject="filterSubject"
        :term-options="termOptions"
        :exam-name-options="examNameOptions"
        :subject-options="subjectOptions"
        :score-trend="scoreTrend"
        :month-trend="monthTrend"
        @update:filter-term="filterTerm = $event"
        @update:filter-exam-name="filterExamName = $event"
        @update:filter-subject="filterSubject = $event"
      />

      <!-- 考勤看板 -->
      <div v-if="attendance" id="parent-attendance-section">
        <h2 class="section-title">
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
          <div v-if="attendanceByMonth.length" class="mb-4">
            <div class="text-xs text-cocoa-500 mb-2">近 6 个月打卡趋势</div>
            <div class="space-y-1.5">
              <div v-for="m in attendanceByMonth" :key="m.month" class="flex items-center gap-2">
                <div class="text-xs text-cocoa-500 w-14 shrink-0">{{ m.month }}</div>
                <div class="flex-1 h-3 bg-cocoa-50 rounded-full overflow-hidden">
                  <div class="h-full rounded-full bg-mint-500" :style="{ width: Math.max(4, m.pct) + '%' }"></div>
                </div>
                <div class="text-xs text-cocoa-500 w-10 text-right shrink-0">{{ m.count }}次</div>
              </div>
            </div>
          </div>
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

      <!-- 行为表现子组件 -->
      <div id="parent-behavior-section">
        <BehaviorRecord :loading="loading" :behavior="behavior" />
      </div>

      <!-- 课表 & 值日 -->
      <div v-if="schedule" id="parent-schedule-section">
        <h2 class="section-title">
          <CalendarCheck class="w-5 h-5 text-mint-400" /> 课表 &amp; 值日
        </h2>
        <div class="quick-card">
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
          <div class="mb-4">
            <div class="text-xs text-cocoa-500 mb-2">今日课表</div>
            <div v-if="todaySchedule.length" class="space-y-2">
              <div v-for="(it, i) in todaySchedule" :key="i" class="flex items-center gap-3 bg-cocoa-50 rounded-lg p-3">
                <div class="w-12 text-center text-xs font-semibold text-cocoa-700 shrink-0">{{ it.section || ('第' + it.period + '节') }}</div>
                <div class="flex-1 min-w-0">
                  <div class="text-sm text-cocoa-900 font-medium">{{ it.subject }}</div>
                  <button
                    v-if="it.teacher"
                    class="text-xs text-mint-600 hover:text-mint-700 hover:underline transition-colors"
                    @click="openTeacherModal(it)"
                  >{{ it.teacher }}</button>
                </div>
              </div>
            </div>
            <div v-else class="text-sm text-cocoa-500">今天没有排课</div>
          </div>
          <!-- 明日课程预览 -->
          <div class="mb-4">
            <div class="text-xs text-cocoa-500 mb-2">明日课程预览</div>
            <div v-if="tomorrowSchedule.length" class="flex flex-wrap gap-2">
              <span v-for="(it, i) in tomorrowSchedule" :key="i" class="text-xs px-2.5 py-1.5 rounded-lg bg-cream-50 border border-cream-200 text-cocoa-700">
                {{ it.section || ('第' + it.period + '节') }} · {{ it.subject }}
              </span>
            </div>
            <div v-else class="text-sm text-cocoa-500">明天没有排课</div>
          </div>
          <div>
            <div class="text-xs text-cocoa-500 mb-2">本周值日</div>
            <div v-if="upcomingDuty.length" class="space-y-2">
              <div v-for="(du, i) in upcomingDuty" :key="i" class="flex items-center gap-3 bg-cocoa-50 rounded-lg p-3">
                <span class="text-lg shrink-0">🧹</span>
                <div class="flex-1 min-w-0">
                  <div class="text-sm text-cocoa-900 font-medium">{{ du.name }}</div>
                  <div class="text-xs text-cocoa-500">{{ du.date }} · {{ DUTY_TYPE_LABEL[du.type] || du.type }}</div>
                </div>
                <span
                  v-if="dutyDaysLeft(du.date) != null"
                  class="shrink-0 text-xs px-2 py-1 rounded-full"
                  :class="dutyDaysLeft(du.date) === 0 ? 'bg-butter-100 text-butter-700 font-semibold' : 'bg-cream-100 text-cocoa-500'"
                >{{ dutyDaysLeft(du.date) === 0 ? '今天值日' : ('还有 ' + dutyDaysLeft(du.date) + ' 天') }}</span>
              </div>
            </div>
            <div v-else class="text-sm text-cocoa-500">近期没有值日安排</div>
          </div>
        </div>
      </div>

      <!-- 科任老师 -->
      <div v-if="teachers.length">
        <h2 class="section-title">
          <UserCog class="w-5 h-5 text-mint-400" /> 科任老师
        </h2>
        <div class="quick-card">
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div v-for="t in teachers" :key="t.teacherId" class="flex items-center gap-3 p-3 rounded-xl bg-cream-50 border border-cream-100">
              <div class="w-10 h-10 rounded-full bg-butter-100 flex items-center justify-center text-butter-600 font-semibold shrink-0">
                {{ t.name ? t.name.charAt(0) : '师' }}
              </div>
              <div class="flex-1 min-w-0">
                <div class="text-sm font-medium text-cocoa-900 flex items-center gap-1.5 flex-wrap">
                  {{ t.name }}
                  <span class="text-xs px-1.5 py-0.5 rounded-full" :class="t.role === 'head' ? 'bg-butter-100 text-butter-700' : 'bg-sky2-50 text-sky2-600'">{{ t.roleLabel }}</span>
                </div>
                <div class="text-xs text-cocoa-500 mt-0.5">
                  <span v-if="t.subjects && t.subjects.length">任教：{{ t.subjects.join('、') }}</span>
                  <span v-else-if="t.subject">任教：{{ t.subject }}</span>
                  <a v-if="t.phone" :href="'tel:' + t.phone" class="ml-2 text-mint-600 hover:underline">📞 {{ t.phone }}</a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 家校沟通 -->
      <div v-if="communications" id="parent-comm-section">
        <h2 class="section-title">
          <MessageCircle class="w-5 h-5 text-mint-400" /> 家校沟通
        </h2>
        <div class="quick-card">
          <div class="mb-4">
            <span class="inline-flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-full bg-sky2-50 text-sky2-600 font-medium">
              💬 沟通 {{ commTotal }} 次
            </span>
          </div>
          <div v-if="commRecent.length">
            <div class="text-xs text-cocoa-500 mb-2">最近沟通</div>
            <div class="space-y-3">
              <div v-for="r in commRecent.slice(0, 8)" :key="r.id" class="border-b border-cream-100 pb-3 last:border-0 last:pb-0">
                <div class="flex items-center gap-2 mb-1">
                  <span class="text-xs px-2 py-0.5 rounded-full bg-sky2-50 text-sky2-700">{{ r.method }}</span>
                  <span class="text-xs text-cocoa-400">{{ r.date }}</span>
                </div>
                <div v-if="r.content" class="text-sm text-cocoa-800">{{ r.content }}</div>
                <div v-if="r.followUp" class="text-xs text-cocoa-500 mt-1">跟进：{{ r.followUp }}</div>
                <div class="text-xs text-cocoa-400 mt-1">{{ r.parentName }} · {{ r.relation }}</div>
              </div>
            </div>
          </div>
          <div v-else class="text-sm text-cocoa-500">暂无沟通记录</div>
          <button
            class="mt-4 w-full rounded-xl bg-mint-500 text-white font-semibold py-2.5 hover:bg-mint-600 flex items-center justify-center gap-1.5"
            @click="contactTeacher"
          ><Phone class="w-4 h-4" /> 联系老师</button>
        </div>
      </div>

      <!-- 学生信息 -->
      <div v-if="studentInfo" class="quick-card">
        <div class="section-title">
          <UserCog class="w-5 h-5 text-mint-400" />
          <h2>学生信息</h2>
          <div class="ml-auto flex items-center gap-2">
            <button
              class="text-sm rounded-xl border border-mint-300 bg-mint-50 px-3 py-1.5 text-mint-700 hover:bg-mint-100 transition-colors"
              @click="openEditStudentInfo"
            >修改信息</button>
            <button
              class="text-sm rounded-xl border border-cream-200 bg-surface px-3 py-1.5 text-cocoa-600 hover:bg-cocoa-50 transition-colors"
              @click="openStudentRequests"
            >查看申请记录</button>
          </div>
        </div>
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
          <div class="flex items-center justify-between bg-cocoa-50 rounded-lg px-3 py-2">
            <span class="text-cocoa-500">家长姓名</span>
            <span class="font-medium text-cocoa-900">{{ studentInfo.parentName || '--' }}</span>
          </div>
          <div class="flex items-center justify-between bg-cocoa-50 rounded-lg px-3 py-2">
            <span class="text-cocoa-500">家长电话</span>
            <span class="font-medium text-cocoa-900">{{ studentInfo.parentPhone || '--' }}</span>
          </div>
          <div class="flex items-center justify-between bg-cocoa-50 rounded-lg px-3 py-2">
            <span class="text-cocoa-500">学生电话</span>
            <span class="font-medium text-cocoa-900">{{ studentInfo.studentPhone || '--' }}</span>
          </div>
          <div class="flex items-center justify-between bg-cocoa-50 rounded-lg px-3 py-2">
            <span class="text-cocoa-500">出生日期</span>
            <span class="font-medium text-cocoa-900">{{ studentInfo.birthDate || '--' }}</span>
          </div>
          <div class="flex items-center justify-between bg-cocoa-50 rounded-lg px-3 py-2 sm:col-span-2">
            <span class="text-cocoa-500">地址</span>
            <span class="font-medium text-cocoa-900 text-right">{{ studentInfo.address || '--' }}</span>
          </div>
          <div v-if="studentInfo.note" class="flex items-start justify-between bg-cocoa-50 rounded-lg px-3 py-2 sm:col-span-2">
            <span class="text-cocoa-500 shrink-0">备注</span>
            <span class="font-medium text-cocoa-900 text-right">{{ studentInfo.note }}</span>
          </div>
        </div>
      </div>

      <!-- 空状态 -->
      <div v-if="!notices.length && !exams.length && !homework.length && !attendance" class="empty-state">
        <div class="icon">🌟</div>
        <div class="title">欢迎来到家长中心</div>
        <div class="desc">老师尚未发布通知、作业或成绩，请稍后再来</div>
      </div>
    </template>

    <!-- 轻提示 -->
    <div v-if="toastMsg" class="fixed inset-x-0 bottom-10 z-50 flex justify-center px-4 pointer-events-none">
      <div class="bg-cocoa-900/90 text-white text-sm rounded-xl px-4 py-2 shadow-lg">{{ toastMsg }}</div>
    </div>

    <!-- 修改密码弹窗 -->
    <div v-if="showPwdModal" class="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4" @click.self="showPwdModal = false">
      <div class="w-full max-w-sm bg-surface rounded-2xl p-5 shadow-xl">
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

    <!-- 考试详情弹窗 -->
    <div v-if="showExamListModal" class="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4" @click.self="showExamListModal = false">
      <div class="w-full max-w-2xl bg-surface rounded-2xl p-5 shadow-xl max-h-[80vh] overflow-auto">
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
            @click="pickExam(i)"
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

    <!-- 联系老师弹窗 -->
    <div v-if="showContactModal" class="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4" @click.self="showContactModal = false">
      <div class="w-full max-w-sm bg-surface rounded-2xl p-5 shadow-xl max-h-[80vh] overflow-auto">
        <div class="flex items-center justify-between mb-4">
          <div class="text-lg font-semibold text-cocoa-900">联系老师</div>
          <button class="text-cocoa-400 hover:text-cocoa-600" @click="showContactModal = false">✕</button>
        </div>
        <p class="text-xs text-cocoa-400 mb-3">点击电话号码可直接拨号；请尽量在工作时间联系。</p>
        <div class="space-y-3">
          <div v-for="t in contactList" :key="t.teacherId" class="flex items-center gap-3 p-3 rounded-xl bg-cream-50 border border-cream-100">
            <div class="w-10 h-10 rounded-full bg-butter-100 flex items-center justify-center text-butter-600 font-semibold shrink-0">
              {{ t.name ? t.name.charAt(0) : '师' }}
            </div>
            <div class="flex-1 min-w-0">
              <div class="text-sm font-medium text-cocoa-900 flex items-center gap-1.5">
                {{ t.name }}
                <span class="text-xs px-1.5 py-0.5 rounded-full" :class="t.role === 'head' ? 'bg-butter-100 text-butter-700' : 'bg-sky2-50 text-sky2-600'">{{ t.roleLabel }}</span>
              </div>
              <div class="text-xs text-cocoa-500 mt-0.5">
                <span v-if="t.subjects && t.subjects.length">{{ t.subjects.join('、') }}</span>
                <span v-else-if="t.subject">{{ t.subject }}</span>
              </div>
            </div>
            <a
              v-if="t.phone"
              :href="'tel:' + t.phone"
              class="shrink-0 flex items-center gap-1 text-sm rounded-xl bg-mint-500 text-white px-3 py-1.5 hover:bg-mint-600"
            ><Phone class="w-3.5 h-3.5" /> 拨号</a>
            <span v-else class="shrink-0 text-xs text-cocoa-400">未留电话</span>
          </div>
        </div>
        <button
          class="mt-4 w-full rounded-xl bg-cocoa-100 text-cocoa-700 font-semibold py-2.5 hover:bg-cocoa-200"
          @click="showContactModal = false"
        >关闭</button>
      </div>
    </div>

    <!-- 科任老师信息弹窗 -->
    <div v-if="showTeacherModal && teacherModalInfo" class="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4" @click.self="showTeacherModal = false">
      <div class="w-full max-w-sm bg-surface rounded-2xl p-5 shadow-xl">
        <div class="flex items-center justify-between mb-4">
          <div class="text-lg font-semibold text-cocoa-900">老师信息</div>
          <button class="text-cocoa-400 hover:text-cocoa-600" @click="showTeacherModal = false">✕</button>
        </div>
        <div class="flex items-center gap-3 mb-4">
          <div class="w-12 h-12 rounded-xl bg-butter-100 text-butter-600 flex items-center justify-center text-xl font-bold">
            {{ (teacherModalInfo.name || '?').slice(0, 1) }}
          </div>
          <div>
            <div class="font-semibold text-cocoa-900">{{ teacherModalInfo.name }}</div>
            <div v-if="teacherModalInfo.subject" class="text-xs text-cocoa-500 mt-0.5">任教学科：{{ teacherModalInfo.subject }}</div>
          </div>
        </div>
        <div class="space-y-2 text-sm">
          <div v-if="teacherModalInfo.subject" class="flex items-center justify-between bg-cocoa-50 rounded-lg px-3 py-2">
            <span class="text-cocoa-500">科目</span>
            <span class="font-medium text-cocoa-900">{{ teacherModalInfo.subject }}</span>
          </div>
          <div v-if="teacherModalInfo.section" class="flex items-center justify-between bg-cocoa-50 rounded-lg px-3 py-2">
            <span class="text-cocoa-500">节次</span>
            <span class="font-medium text-cocoa-900">{{ teacherModalInfo.section }}</span>
          </div>
          <div v-if="teacherModalInfo.className" class="flex items-center justify-between bg-cocoa-50 rounded-lg px-3 py-2">
            <span class="text-cocoa-500">班级</span>
            <span class="font-medium text-cocoa-900">{{ teacherModalInfo.className }}</span>
          </div>
        </div>
        <p class="text-xs text-cocoa-400 mt-3">如需了解更多，可点击下方按钮查看老师联系方式。</p>
        <button
          class="mt-4 w-full rounded-xl bg-mint-500 text-white font-semibold py-2.5 hover:bg-mint-600"
          @click="showTeacherModal = false; contactTeacher()"
        >联系老师</button>
      </div>
    </div>

    <!-- 修改学生信息弹窗 -->
    <div v-if="showStudentInfoModal" class="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4" @click.self="showStudentInfoModal = false">
      <div class="w-full max-w-md bg-surface rounded-2xl p-5 shadow-xl max-h-[85vh] overflow-auto">
        <div class="flex items-center justify-between mb-2">
          <div class="text-lg font-semibold text-cocoa-900">修改学生信息</div>
          <button class="text-cocoa-400 hover:text-cocoa-600" @click="showStudentInfoModal = false">✕</button>
        </div>
        <div class="text-xs text-cocoa-400 mb-3">提交后需老师审核通过才会更新</div>
        <div v-if="editOk" class="mb-3 text-sm text-mint-700 bg-mint-50 rounded-lg p-3">✅ 已提交，等待老师审核</div>
        <div v-if="editError" class="mb-3 text-sm text-sakura-700 bg-sakura-50 rounded-lg p-3">{{ editError }}</div>
        <div class="space-y-3">
          <div>
            <label class="block text-sm text-cocoa-600 mb-1">家长姓名</label>
            <input v-model="editForm.parentName" class="w-full rounded-xl border border-cream-200 px-3 py-2 text-cocoa-800 focus:outline-none focus:border-butter-400" placeholder="请输入家长姓名" />
          </div>
          <div>
            <label class="block text-sm text-cocoa-600 mb-1">家长电话</label>
            <input v-model="editForm.parentPhone" class="w-full rounded-xl border border-cream-200 px-3 py-2 text-cocoa-800 focus:outline-none focus:border-butter-400" placeholder="请输入家长电话" />
          </div>
          <div>
            <label class="block text-sm text-cocoa-600 mb-1">学生电话</label>
            <input v-model="editForm.studentPhone" class="w-full rounded-xl border border-cream-200 px-3 py-2 text-cocoa-800 focus:outline-none focus:border-butter-400" placeholder="请输入学生电话" />
          </div>
          <div>
            <label class="block text-sm text-cocoa-600 mb-1">出生日期</label>
            <input v-model="editForm.birthDate" type="date" class="w-full rounded-xl border border-cream-200 px-3 py-2 text-cocoa-800 focus:outline-none focus:border-butter-400" />
          </div>
          <div>
            <label class="block text-sm text-cocoa-600 mb-1">地址</label>
            <input v-model="editForm.address" class="w-full rounded-xl border border-cream-200 px-3 py-2 text-cocoa-800 focus:outline-none focus:border-butter-400" placeholder="请输入家庭住址" />
          </div>
          <div>
            <label class="block text-sm text-cocoa-600 mb-1">备注</label>
            <textarea v-model="editForm.note" rows="2" class="w-full rounded-xl border border-cream-200 px-3 py-2 text-cocoa-800 focus:outline-none focus:border-butter-400 resize-none" placeholder="如有其他说明请填写"></textarea>
          </div>
        </div>
        <button
          class="mt-4 w-full rounded-xl bg-mint-500 text-white font-semibold py-2.5 hover:bg-mint-600 disabled:opacity-60"
          :disabled="editSubmitting"
          @click="submitStudentInfo"
        >
          <Loader2 v-if="editSubmitting" class="w-4 h-4 inline animate-spin" /> {{ editSubmitting ? '提交中…' : '提交申请' }}
        </button>
      </div>
    </div>

    <!-- 申请记录弹窗 -->
    <div v-if="showStudentRequestsModal" class="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4" @click.self="showStudentRequestsModal = false">
      <div class="w-full max-w-lg bg-surface rounded-2xl p-5 shadow-xl max-h-[80vh] overflow-auto">
        <div class="flex items-center justify-between mb-4">
          <div class="text-lg font-semibold text-cocoa-900">申请记录</div>
          <button class="text-cocoa-400 hover:text-cocoa-600" @click="showStudentRequestsModal = false">✕</button>
        </div>
        <div v-if="studentRequestsLoading" class="text-sm text-cocoa-400 text-center py-6 flex items-center justify-center gap-2">
          <Loader2 class="w-4 h-4 animate-spin" /> 加载中…
        </div>
        <div v-else-if="!studentRequests.length" class="text-sm text-cocoa-400 text-center py-6">暂无申请记录</div>
        <div v-else class="space-y-3">
          <div v-for="r in studentRequests" :key="r.id" class="border border-cream-200 rounded-xl p-3">
            <div class="flex items-center justify-between mb-2">
              <span class="font-medium text-cocoa-900 text-sm">{{ r.studentName || '学生' }}</span>
              <span class="text-xs px-2 py-0.5 rounded-full" :class="(REQUEST_STATUS_META[r.status] || {}).cls">
                {{ (REQUEST_STATUS_META[r.status] || {}).label || r.status }}
              </span>
            </div>
            <div class="text-xs text-cocoa-500 mb-2">提交于 {{ r.createdAt }}</div>
            <div v-if="r.payload" class="text-xs text-cocoa-600 bg-cocoa-50 rounded-lg p-2 mb-2 space-y-0.5">
              <div v-if="r.payload.parentName">家长姓名：{{ r.payload.parentName }}</div>
              <div v-if="r.payload.parentPhone">家长电话：{{ r.payload.parentPhone }}</div>
              <div v-if="r.payload.studentPhone">学生电话：{{ r.payload.studentPhone }}</div>
              <div v-if="r.payload.birthDate">出生日期：{{ r.payload.birthDate }}</div>
              <div v-if="r.payload.address">地址：{{ r.payload.address }}</div>
              <div v-if="r.payload.note">备注：{{ r.payload.note }}</div>
            </div>
            <div v-if="r.reviewNote" class="text-xs text-sakura-700 bg-sakura-50 rounded-lg p-2 mt-2">审核备注：{{ r.reviewNote }}</div>
            <div v-if="r.reviewedAt" class="text-xs text-cocoa-400 mt-1">审核于 {{ r.reviewedAt }}</div>
          </div>
        </div>
        <button
          class="mt-4 w-full rounded-xl bg-cocoa-100 text-cocoa-700 font-semibold py-2.5 hover:bg-cocoa-200"
          @click="showStudentRequestsModal = false"
        >关闭</button>
      </div>
    </div>
  </div>
</template>
