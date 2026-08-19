/**
 * useDashboard - 仪表盘共享数据层
 * P2-12：从 dashboard.vue 抽离数据逻辑，使组件可以共享状态
 */
import { ref, computed } from 'vue'
import { onShow, onPullDownRefresh, onHide } from '@dcloudio/uni-app'
import api from '../../../common/request'
import {
  globalSearch, getUnreadCount, listSemesters,
  listDashboardClasses, listDashboardStudents, listNotes, listDashboardGrades,
  listTodos, listSchedules, listNotices, listAttendances, listHomework,
  listSchoolNotices, listBehaviorRecords,
} from '@/api/dashboard'
import { auth } from '../../../common/store'

const todayDow = (() => { const d = new Date().getDay(); return d === 0 ? 7 : d })()
const todayStr = new Date().toISOString().slice(0, 10)

// P0修复：PII 缓存加密
const OBFUSCATE_KEY = 0x5A
function obfuscate(obj) {
  const str = JSON.stringify(obj)
  let result = ''
  for (let i = 0; i < str.length; i++) {
    result += String.fromCharCode(str.charCodeAt(i) ^ OBFUSCATE_KEY)
  }
  return result
}
function deobfuscate(str) {
  let result = ''
  for (let i = 0; i < str.length; i++) {
    result += String.fromCharCode(str.charCodeAt(i) ^ OBFUSCATE_KEY)
  }
  return JSON.parse(result)
}

const DASHBOARD_CACHE_KEY = 'g_dashboard_cache'
const DASHBOARD_CACHE_TTL = 2 * 60 * 1000

// 单例状态（跨组件共享）
const loading = ref(false)
const classList = ref([])
const currentClassIdx = ref(0)
const studentList = ref([])
const noteList = ref([])
const gradeList = ref([])
const todoList = ref([])
const todayLessons = ref([])
const noticeList = ref([])
const schoolNotices = ref([])
const attendanceList = ref([])
const homeworkList = ref([])
const behaviorList = ref([])
const semesterName = ref('')
const semesterList = ref([])
const semesterIdx = ref(0)
const unreadCount = ref(0)
const searchQuery = ref('')
const searchResults = ref(null)

let searchTimer = null
let notifTimer = null

export function useDashboard() {
  const currentClass = computed(() => classList.value[currentClassIdx.value] || null)

  // 班级人数分布
  const classDist = computed(() => {
    if (!classList.value.length || !studentList.value.length) return []
    const map = {}
    studentList.value.forEach((s) => { map[s.classId] = (map[s.classId] || 0) + 1 })
    const max = Math.max(1, ...Object.values(map))
    return classList.value
      .map((c) => ({ name: c.name, count: map[c.id] || 0, pct: Math.round(((map[c.id] || 0) / max) * 100) }))
      .filter((d) => d.count > 0)
  })

  // 今日教学实时指标
  const todayStats = computed(() => {
    const attRecords = attendanceList.value || []
    const todayAtt = attRecords.filter((a) => a.date === todayStr)
    let attendanceRate = 100
    if (todayAtt.length > 0) {
      const present = todayAtt.reduce((sum, a) => {
        const records = a.records || {}
        return sum + Object.values(records).filter((s) => s === '出勤').length
      }, 0)
      const total = todayAtt.reduce((sum, a) => sum + Object.keys(a.records || {}).length, 0)
      attendanceRate = total > 0 ? Math.round((present / total) * 100) : 100
    }
    const pendingHomework = (homeworkList.value || []).filter((h) => h.status !== '已批改' && h.status !== '已发还').length
    return { attendanceRate, pendingHomework, lessonCount: todayLessons.value.length }
  })

  // 最近笔记
  const recentNotes = computed(() =>
    [...noteList.value].sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0)).slice(0, 4)
  )

  // 置顶公告
  const pinnedNotices = computed(() =>
    noticeList.value.filter((n) => n.pinned).slice(0, 3)
  )

  // 今日待办
  const todayTodos = computed(() =>
    todoList.value
      .filter((t) => !t.date || t.date === todayStr)
      .sort((a, b) => Number(a.done) - Number(b.done))
  )
  const doneCount = computed(() => todayTodos.value.filter((t) => t.done).length)

  // 本周生日
  const weekBirthdays = computed(() => {
    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const list = []
    studentList.value.forEach((s) => {
      if (!s.birthDate) return
      const m = String(s.birthDate).match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/)
      if (!m) return
      const mm = +m[2], dd = +m[3]
      if (mm < 1 || mm > 12 || dd < 1 || dd > 31) return
      let birthThisYear = new Date(now.getFullYear(), mm - 1, dd)
      const diffDays = Math.round((birthThisYear - today) / 86400000)
      let daysLeft = diffDays
      if (diffDays < 0) {
        birthThisYear = new Date(now.getFullYear() + 1, mm - 1, dd)
        daysLeft = Math.round((birthThisYear - today) / 86400000)
      }
      if (daysLeft < 0 || daysLeft > 7) return
      list.push({
        id: s.id, name: s.name,
        birthLabel: (mm < 10 ? '0' + mm : mm) + '-' + (dd < 10 ? '0' + dd : dd),
        daysLeft,
      })
    })
    return list.sort((a, b) => a.daysLeft - b.daysLeft)
  })

  // 班级工作台
  const weekAttRate = computed(() => {
    const now = new Date()
    const weekAgo = new Date(now.getTime() - 7 * 86400000).toISOString().slice(0, 10)
    const weekAtts = attendanceList.value.filter(a => a.date >= weekAgo)
    if (!weekAtts.length) return 100
    const present = weekAtts.filter(a => Object.values(a.records || {}).some(s => s === 'present' || s === '出勤')).length
    return Math.round((present / weekAtts.length) * 100)
  })
  const pendingBySubject = computed(() => {
    const hws = homeworkList.value.filter(h => h.status === '待批改')
    return [...new Set(hws.map(h => h.subject).filter(Boolean))]
  })
  const weekBehaviorCount = computed(() => {
    const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10)
    return behaviorList.value.filter(b => (b.createdAt || b.date || '') >= weekAgo).length
  })

  // 近7日出勤趋势
  const weekTrend = computed(() => {
    const days = []
    for (let i = 6; i >= 0; i--) {
      const d = new Date(Date.now() - i * 86400000)
      const dateStr = d.toISOString().slice(0, 10)
      const dayAtts = attendanceList.value.filter(a => a.date === dateStr)
      const present = dayAtts.filter(a => Object.values(a.records || {}).some(s => s === 'present' || s === '出勤')).length
      const total = dayAtts.length
      days.push({
        label: ['日','一','二','三','四','五','六'][d.getDay()],
        date: dateStr,
        rate: total > 0 ? Math.round((present / total) * 100) : null,
        total,
      })
    }
    return days
  })

  // 加载学期
  async function loadSemester() {
    try {
      const arr = await listSemesters()
      if (arr && arr.length) {
        semesterList.value = arr
        const curIdx = arr.findIndex((s) => s.current)
        semesterIdx.value = curIdx >= 0 ? curIdx : 0
        semesterName.value = arr[semesterIdx.value]?.name || ''
      }
    } catch (e) { semesterName.value = '' }
  }

  function onSemesterChange(e) {
    semesterIdx.value = e.detail.value
    semesterName.value = semesterList.value[e.detail.value]?.name || ''
    uni.setStorageSync('active_semester', semesterName.value)
    uni.showToast({ title: '已切换至 ' + semesterName.value, icon: 'none' })
  }

  // 搜索
  async function doSearch() {
    const q = searchQuery.value.trim()
    if (!q) { searchResults.value = null; return }
    if (searchTimer) clearTimeout(searchTimer)
    searchTimer = setTimeout(async () => {
      try {
        const r = await globalSearch(q)
        searchResults.value = r || { students: [], teachers: [], classes: [] }
      } catch { searchResults.value = { students: [], teachers: [], classes: [] } }
    }, 300)
  }

  // 通知
  async function loadNotifications() {
    try {
      const r = await getUnreadCount()
      unreadCount.value = r?.count || 0
    } catch {}
  }

  // 主加载函数
  async function loadAll(force = false) {
    loading.value = true
    loadSemester()
    try {
      if (!force) {
        try {
          const raw = uni.getStorageSync(DASHBOARD_CACHE_KEY)
          if (raw && typeof raw === 'object' && raw.ts && Date.now() - raw.ts < DASHBOARD_CACHE_TTL) {
            const src = raw.data ? deobfuscate(raw.data) : raw
            classList.value = src.classes || []
            studentList.value = src.students || []
            noteList.value = src.notes || []
            gradeList.value = src.grades || []
            todoList.value = src.todos || []
            todayLessons.value = src.todayLessons || []
            noticeList.value = src.notices || []
            attendanceList.value = src.attendances || []
            homeworkList.value = src.homeworks || []
            schoolNotices.value = src.schoolNotices || []
            behaviorList.value = src.behaviors || []
          }
        } catch {}
      }
      const [
        classes, students, notes, grades, todos, schedules, notices,
        attendances, homeworks, schoolNoticesR, behaviors,
      ] = await Promise.all([
        listDashboardClasses().catch(() => []),
        listDashboardStudents().catch(() => []),
        listNotes().catch(() => []),
        listDashboardGrades().catch(() => []),
        listTodos().catch(() => []),
        listSchedules().catch(() => []),
        listNotices().catch(() => []),
        listAttendances().catch(() => []),
        listHomework().catch(() => []),
        listSchoolNotices().catch(() => ({ items: [] })),
        listBehaviorRecords().catch(() => []),
      ])
      classList.value = classes || []
      studentList.value = students || []
      noteList.value = notes || []
      gradeList.value = grades || []
      todoList.value = todos || []
      todayLessons.value = (schedules || [])
        .filter((s) => s.dayOfWeek === todayDow)
        .sort((a, b) => (a.period || 99) - (b.period || 99))
        .slice(0, 6)
      noticeList.value = notices || []
      attendanceList.value = attendances || []
      homeworkList.value = homeworks || []
      schoolNotices.value = (schoolNoticesR && (schoolNoticesR.items || schoolNoticesR)) || []
      behaviorList.value = behaviors || []
      try {
        uni.setStorageSync(DASHBOARD_CACHE_KEY, {
          ts: Date.now(),
          data: obfuscate({
            classes: classList.value,
            students: studentList.value,
            notes: noteList.value,
            grades: gradeList.value,
            todos: todoList.value,
            todayLessons: todayLessons.value,
            notices: noticeList.value,
            attendances: attendanceList.value,
            homeworks: homeworkList.value,
            schoolNotices: schoolNotices.value,
            behaviors: behaviorList.value,
          }),
        })
      } catch {}
      loadNotifications()
    } catch (e) {
      uni.showToast({ title: '首页数据加载失败：' + (e.message || ''), icon: 'none' })
    }
    finally { loading.value = false }
  }

  // 生命周期注册
  function registerLifecycle() {
    onShow(() => {
      if (!auth.token) { uni.reLaunch({ url: '/pages/login/login' }); return }
      loadPrimaryDashboard()
      flushTabBarStyle()
      setTimeout(() => { loadSecondaryDashboard() }, 120)
      // 通知轮询（指数退避）
      if (notifTimer) clearInterval(notifTimer)
      let notifInterval = 60000
      let notifFailCount = 0
      const baseInterval = 60000
      const maxInterval = 240000
      async function pollNotifications() {
        try {
          await loadNotifications()
          if (notifFailCount > 0) {
            notifFailCount = 0
            notifInterval = baseInterval
            clearInterval(notifTimer)
            notifTimer = setInterval(pollNotifications, notifInterval)
          }
        } catch (e) {
          notifFailCount++
          if (notifInterval < maxInterval) {
            notifInterval = Math.min(notifInterval * 2, maxInterval)
            clearInterval(notifTimer)
            notifTimer = setInterval(pollNotifications, notifInterval)
          }
        }
      }
      notifTimer = setInterval(pollNotifications, notifInterval)
    })
    onHide(() => {
      if (notifTimer) { clearInterval(notifTimer); notifTimer = null }
      if (searchTimer) { clearTimeout(searchTimer); searchTimer = null }
    })
    onPullDownRefresh(async () => {
      await loadAll()
      uni.stopPullDownRefresh()
    })
  }

  async function loadPrimaryDashboard() {
    try {
      const [classes, students, schedules, unread] = await Promise.all([
        listDashboardClasses().catch(() => []),
        listDashboardStudents().catch(() => []),
        listSchedules().catch(() => []),
        getUnreadCount().catch(() => ({ unreadCount: 0, notices: [] })),
      ])
      classList.value = classes || []
      studentList.value = students || []
      todayLessons.value = (schedules || [])
        .filter((s) => s.dayOfWeek === todayDow)
        .sort((a, b) => (a.period || 99) - (b.period || 99))
        .slice(0, 6)
      noticeList.value = (unread && (unread.notices || unread.items)) || []
    } catch (e) {
      uni.showToast({ title: '首页关键数据加载失败：' + (e.message || ''), icon: 'none' })
    }
  }

  async function loadSecondaryDashboard() {
    try {
      const [
        notes, grades, todos, notices, attendances, homeworks, schoolNoticesR, behaviors,
      ] = await Promise.all([
        listNotes().catch(() => []),
        listDashboardGrades().catch(() => []),
        listTodos().catch(() => []),
        listNotices().catch(() => []),
        listAttendances().catch(() => []),
        listHomework().catch(() => []),
        listSchoolNotices().catch(() => ({ items: [] })),
        listBehaviorRecords().catch(() => []),
      ])
      noteList.value = notes || []
      gradeList.value = grades || []
      todoList.value = todos || []
      attendanceList.value = attendances || []
      homeworkList.value = homeworks || []
      schoolNotices.value = (schoolNoticesR && (schoolNoticesR.items || schoolNoticesR)) || []
      behaviorList.value = behaviors || []
      loadNotifications()
    } catch (e) {
      uni.showToast({ title: '首页数据加载失败：' + (e.message || ''), icon: 'none' })
    }
  }

  return {
    // 状态
    loading, classList, currentClassIdx, currentClass, studentList, noteList, gradeList,
    todoList, todayLessons, noticeList, schoolNotices, attendanceList, homeworkList,
    behaviorList, semesterName, semesterList, semesterIdx, unreadCount, searchQuery, searchResults,
    // 计算属性
    classDist, todayStats, recentNotes, pinnedNotices, todayTodos, doneCount,
    weekBirthdays, weekAttRate, pendingBySubject, weekBehaviorCount, weekTrend,
    // 方法
    loadSemester, onSemesterChange, doSearch, loadNotifications, loadAll,
    registerLifecycle, loadPrimaryDashboard, loadSecondaryDashboard,
  }
}

export const dashboardState = {
  loading, classList, currentClassIdx, studentList, noteList, gradeList,
  todoList, todayLessons, noticeList, schoolNotices, attendanceList, homeworkList,
  behaviorList, semesterName, semesterList, semesterIdx, unreadCount, searchQuery, searchResults,
  todayDow, todayStr,
}
