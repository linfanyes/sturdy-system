<template>
  <view class="page" :class="{ dark: theme.mode === 'dark' }">
    <!-- 欢迎条 -->
    <view class="header">
      <view class="hi">{{ greeting }}，{{ auth.user?.name || '老师' }}</view>
      <view class="school">{{ auth.user?.school || '未设置学校' }}
        <picker v-if="semesterList.length" :range="semesterList" range-key="name" :value="semesterIdx" @change="onSemesterChange">
          <text class="sem">{{ semesterList[semesterIdx]?.name || semesterName }} ▾</text>
        </picker>
        <text v-else-if="semesterName" class="sem"> · {{ semesterName }}</text>
      </view>
      <view class="bell" @click="openNotifications">
        <text class="bell-icon">🔔</text>
        <text v-if="unreadCount > 0" class="bell-badge">{{ unreadCount > 99 ? '99+' : unreadCount }}</text>
      </view>
      <view class="moods">
        <text class="mood" :class="currentMood === m && 'on'" v-for="(m, i) in moodOptions" :key="m" @click="pickMood(m)">{{ moodEmojis[i] }} {{ m }}</text>
      </view>
    </view>

    <!-- 通知面板 -->
    <view v-if="showNotifications" class="notif-panel">
      <view class="notif-hd">
        <text class="notif-title">🔔 通知</text>
        <text class="notif-act" @click="markAllRead">全部已读</text>
        <text class="notif-act" @click="showNotifications = false">✕</text>
      </view>
      <scroll-view scroll-y class="notif-list">
        <view v-if="!notificationsList.length" class="notif-empty">暂无通知</view>
        <view v-for="n in notificationsList" :key="n.id" class="notif-item" :class="!n.read && 'unread'" @click="markAllRead">
          <view class="notif-icon">{{ n.type === 'notice' ? '📢' : n.type === 'homework' ? '📝' : n.type === 'grade' ? '📊' : 'ℹ️' }}</view>
          <view class="notif-body">
            <text class="notif-title-text">{{ n.title }}</text>
            <text class="notif-content" v-if="n.content">{{ n.content }}</text>
          </view>
        </view>
      </scroll-view>
    </view>

    <!-- 班级切换（任教多个班时） -->
    <view class="class-switcher" v-if="classList.length > 1">
      <picker mode="selector" :range="classList" range-key="name" @change="onClassChange">
        <view class="cs-picker">
          <text class="cs-label">🏫 {{ currentClass?.name || '选择班级' }}</text>
          <text class="cs-arrow">▾</text>
        </view>
      </picker>
    </view>

    <!-- 搜索栏 -->
    <view class="search-bar">
      <input v-model="searchQuery" class="search-inp" placeholder="🔍 搜索学生、教师、班级…" confirm-type="search" @confirm="doSearch" />
      <text v-if="searchQuery" class="search-clear" @click="searchQuery=''; searchResults=null">×</text>
    </view>
    <view v-if="searchResults" class="search-results">
      <view v-if="searchResults.students?.length" class="search-section">
        <text class="search-section-title">学生（{{ searchResults.students.length }}）</text>
        <view class="search-item" v-for="s in searchResults.students" :key="s.id" @click="goStudent(s)">
          <text class="search-name">{{ s.name }}</text>
          <text class="search-meta">{{ s.studentNo }} · {{ s.className || '' }}</text>
        </view>
      </view>
      <view v-if="searchResults.teachers?.length" class="search-section">
        <text class="search-section-title">教师（{{ searchResults.teachers.length }}）</text>
        <view class="search-item" v-for="t in searchResults.teachers" :key="t.id">
          <text class="search-name">{{ t.name }}</text>
          <text class="search-meta">{{ t.username }} · {{ t.subject || '' }}</text>
        </view>
      </view>
      <view v-if="searchResults.classes?.length" class="search-section">
        <text class="search-section-title">班级（{{ searchResults.classes.length }}）</text>
        <view class="search-item" v-for="c in searchResults.classes" :key="c.id" @click="goCrud('students')">
          <text class="search-name">{{ c.name }}</text>
          <text class="search-meta">{{ c.grade || '' }}</text>
        </view>
      </view>
      <view v-if="!searchResults.students?.length && !searchResults.teachers?.length && !searchResults.classes?.length" class="search-empty">
        没有找到匹配结果
      </view>
    </view>

    <!-- 快捷操作工具栏 -->
    <view class="quick-actions">
      <view class="qa-item" @click="goPage('/pages/attendance/attendance')">
        <text class="qa-ic" style="background:#e8f9e8">✅</text>
        <text class="qa-lb">记考勤</text>
      </view>
      <view class="qa-item" @click="goPage('/pages/homework/homework')">
        <text class="qa-ic" style="background:#fff3d6">📝</text>
        <text class="qa-lb">布置作业</text>
      </view>
      <view class="qa-item" @click="goPage('/pages/notice/notice')">
        <text class="qa-ic" style="background:#e8f1fb">📢</text>
        <text class="qa-lb">发通知</text>
      </view>
      <view class="qa-item" @click="goPage('/pages/todos/todos')">
        <text class="qa-ic" style="background:#fde8ea">✅</text>
        <text class="qa-lb">待办</text>
      </view>
      <view class="qa-item" @click="goPage('/pages/behavior-record/behavior-record')">
        <text class="qa-ic" style="background:#f3e8ff">👀</text>
        <text class="qa-lb">行为记录</text>
      </view>
    </view>

    <!-- 学校公告 -->
    <view class="card" v-if="schoolNotices.length">
      <view class="card-h">
        <text class="ch-t">🏫 学校公告 <text class="unread-badge">{{ schoolNotices.length }}</text></text>
      </view>
      <view v-for="n in schoolNotices" :key="n.id" class="li col bord">
        <text class="li-t">{{ n.title }}</text>
        <text class="li-s clamp">{{ n.content }}</text>
      </view>
    </view>

    <!-- 统计卡（2×2 微信风格，4 列太挤） -->
    <view class="ov-grid">
      <view class="ov" @click="goCrud('classes')">
        <view class="ov-ic" style="background:#fff3d6">🏫</view>
        <view class="ov-num">{{ classList.length }}</view>
        <view class="ov-lb">班级</view>
      </view>
      <view class="ov" @click="goCrud('students')">
        <view class="ov-ic" style="background:#e8f9e8">🧒</view>
        <view class="ov-num">{{ studentList.length }}</view>
        <view class="ov-lb">学生</view>
      </view>
      <view class="ov" @click="goCrud('notes')">
        <view class="ov-ic" style="background:#fde8ea">📒</view>
        <view class="ov-num">{{ noteList.length }}</view>
        <view class="ov-lb">笔记</view>
      </view>
      <view class="ov" @click="goPage('/pages/grades/grades')">
        <view class="ov-ic" style="background:#e8f1fb">📊</view>
        <view class="ov-num">{{ gradeList.length }}</view>
        <view class="ov-lb">考试</view>
      </view>
    </view>

    <!-- 今日教学实时指标 -->
    <view class="ov-grid today-stats">
      <view class="ov ts-card">
        <view class="ov-ic" style="background:#e8f1fb">📋</view>
        <view class="ov-num ts-num">{{ todayStats.attendanceRate }}%</view>
        <view class="ov-lb">今日出勤率</view>
      </view>
      <view class="ov ts-card">
        <view class="ov-ic" style="background:#fff3d6">📝</view>
        <view class="ov-num ts-num" :class="todayStats.pendingHomework > 0 && 'warn'">{{ todayStats.pendingHomework }}</view>
        <view class="ov-lb">待批改作业</view>
      </view>
      <view class="ov ts-card">
        <view class="ov-ic" style="background:#e8f9e8">🔔</view>
        <view class="ov-num ts-num">{{ todayStats.lessonCount }}</view>
        <view class="ov-lb">今日课程节数</view>
      </view>
    </view>

    <!-- 班级工作台 -->
    <view class="card">
      <view class="card-h">
        <text class="ch-t">🏫 班级工作台</text>
        <text class="ch-m" @click="goCrud('students')">学生管理 ›</text>
      </view>
      <view class="ww-grid">
        <view class="ww-item" @click="goCrud('attendances')">
          <text class="ww-num">{{ weekAttRate }}%</text>
          <text class="ww-lb">本周出勤</text>
        </view>
        <view class="ww-item" @click="goCrud('homework')">
          <text class="ww-num warn">{{ pendingBySubject.length }}</text>
          <text class="ww-lb">待批科目</text>
        </view>
        <view class="ww-item" @click="goCrud('behavior')">
          <text class="ww-num">{{ weekBehaviorCount }}</text>
          <text class="ww-lb">行为记录</text>
        </view>
        <view class="ww-item" @click="goCrud('grades')">
          <text class="ww-num">{{ gradeList.length }}</text>
          <text class="ww-lb">考试次数</text>
        </view>
      </view>
      <view class="ww-detail" v-if="pendingBySubject.length">
        <text class="ww-detail-title">待批改作业：</text>
        <text class="ww-detail-text">{{ pendingBySubject.slice(0, 4).join('、') }}</text>
      </view>
    </view>

    <!-- 数据趋势：近7日出勤率 -->
    <view class="card" v-if="weekTrend.some(d => d.rate != null)">
      <view class="card-h">
        <text class="ch-t">📈 出勤趋势（近7日）</text>
      </view>
      <view class="trend-chart">
        <view class="trend-bar-col" v-for="(d, i) in weekTrend" :key="i">
          <view class="trend-bar-wrap">
            <view class="trend-bar" :style="{ height: (d.rate ?? 0) + '%' }" :class="i === 6 && 'today'"></view>
          </view>
          <text class="trend-label">{{ d.label }}</text>
          <text class="trend-rate">{{ d.rate != null ? d.rate + '%' : '-' }}</text>
        </view>
      </view>
    </view>

    <!-- 🤖 AI 教务助手 -->
    <view class="card">
      <view class="card-h">
        <text class="ch-t">🤖 AI 教务助手</text>
        <text class="ch-m" @click="showAiHelper = !showAiHelper">{{ showAiHelper ? '收起' : '展开' }}</text>
      </view>
      <view v-if="showAiHelper">
        <view class="ai-msgs" v-if="aiHistory.length">
          <view v-for="(msg, i) in aiHistory" :key="i" class="ai-msg" :class="msg.role">
            <text class="ai-role">{{ msg.role === 'user' ? '🧑‍🏫 我' : '🤖 助手' }}</text>
            <text class="ai-text">{{ msg.text }}</text>
          </view>
        </view>
        <view class="ai-input-row">
          <input v-model="aiQuery" class="ai-inp" placeholder="如：分析本班最近一次考试情况" @confirm="askAi" />
          <text class="ai-send" @click="askAi">发送</text>
        </view>
        <view class="ai-hints">
          <text class="ai-hint" @click="quickAsk('分析本班近7日出勤率变化')">📊 出勤分析</text>
          <text class="ai-hint" @click="quickAsk('列出待批改作业最多的3个科目')">📝 作业情况</text>
          <text class="ai-hint" @click="quickAsk('对本次考试成绩做简要分析')">📈 成绩分析</text>
        </view>
      </view>
    </view>

    <!-- 今日课程 -->
    <view class="card">
      <view class="card-h" @click="goCrud('schedules')">
        <text class="ch-t">🗓️ 今日课程（{{ dow[todayDow] }}）</text><text class="ch-m">课表 ›</text>
      </view>
      <view v-if="todayLessons.length">
        <view v-for="(l, i) in todayLessons" :key="i" class="li">
          <text class="li-pos">{{ l.section || ('第' + l.period + '节') }}</text>
          <text class="li-t">{{ l.subject || '—' }}</text>
          <text class="li-s" v-if="l.teacher">{{ l.teacher }}</text>
        </view>
      </view>
      <view v-else class="empty">今天没有课程安排</view>
    </view>

    <!-- 今日待办（可勾选 / 新增 / 删除） -->
    <view class="card">
      <view class="card-h">
        <text class="ch-t">✅ 今日待办</text>
        <text class="ch-m">{{ doneCount }}/{{ todayTodos.length }} 完成<text v-if="schoolNotices.length" class="unread-badge-dash">{{ schoolNotices.length }}条公告</text></text>
      </view>
      <view class="todo-add">
        <input v-model="newTodo" class="ta-inp" placeholder="添加待办，回车保存" @confirm="addTodo" />
        <text class="ta-btn" @click="addTodo">添加</text>
      </view>
      <view v-if="todayTodos.length">
        <view v-for="t in todayTodos" :key="t.id" class="li todo">
          <view class="cb" :class="t.done && 'on'" @click="toggleTodo(t)"></view>
          <text class="li-t" :class="t.done && 'done'">{{ t.title }}</text>
          <text class="li-del" @click="delTodo(t)">🗑</text>
        </view>
      </view>
      <view v-else class="empty">还没有待办，享受片刻安静</view>
    </view>

    <!-- 最近笔记 -->
    <view class="card" v-if="recentNotes.length">
      <view class="card-h" @click="goCrud('notes')">
        <text class="ch-t">📒 最近笔记</text><text class="ch-m">全部 ›</text>
      </view>
      <view v-for="n in recentNotes" :key="n.id" class="li col">
        <view class="li-top">
          <text class="li-t">{{ n.title }}</text>
          <text class="cat" :class="'c-' + catKey(n.category || '其他')">{{ n.category || '其他' }}</text>
        </view>
        <text class="li-s clamp">{{ n.content }}</text>
      </view>
    </view>

    <!-- 班级公告 -->
    <view class="card" v-if="pinnedNotices.length">
      <view class="card-h" @click="goCrud('notices')">
        <text class="ch-t">📢 班级公告</text><text class="ch-m">全部 ›</text>
      </view>
      <view v-for="n in pinnedNotices" :key="n.id" class="li col bord">
        <text class="li-t">{{ n.title }}</text>
        <text class="li-s clamp">{{ n.content }}</text>
      </view>
    </view>

    <!-- 本周生日 -->
    <view class="card" v-if="weekBirthdays.length">
      <view class="card-h">
        <text class="ch-t">🎂 本周生日（{{ weekBirthdays.length }} 人）</text>
      </view>
      <view v-for="b in weekBirthdays" :key="b.id" class="li bd-li">
        <text class="bd-emoji">🎂</text>
        <text class="li-t">{{ b.name }}</text>
        <text class="bd-date">{{ b.birthLabel }}</text>
        <text v-if="b.daysLeft === 0" class="bd-today">今天</text>
        <text v-else class="bd-days">{{ b.daysLeft }} 天后</text>
        <text class="bd-card" @click.stop="genBirthdayCard(b)">🎉 卡片</text>
      </view>
      <view v-if="showCard" class="mask" @click="showCard=false">
        <view class="bd-card-dialog" @click.stop>
          <view class="bd-card-bg">{{ cardEmoji }}</view>
          <view class="bd-card-title">生日快乐！</view>
          <view class="bd-card-name">{{ cardName }} 同学</view>
          <view class="bd-card-msg">{{ cardMsg }}</view>
          <button class="bd-card-copy" @click="copyBirthdayCard">📋 复制祝福语</button>
          <button class="bd-card-close" @click="showCard=false">关闭</button>
        </view>
      </view>
    </view>

    <!-- 课堂神器（可勾选≤5） -->
    <view class="card">
      <view class="card-h">
        <text class="ch-t">🛠️ 课堂神器</text>
        <text class="ch-m" @click="managing = !managing">{{ managing ? '完成' : '管理' }}</text>
      </view>
      <view v-if="!managing" class="wgrid">
        <view v-for="w in chosenWidgets" :key="w.label" class="wcell" @click="goWidget(w)">
          <view class="wic">{{ w.icon }}</view>
          <view class="wlb">{{ w.label }}</view>
        </view>
        <view v-if="!chosenWidgets.length" class="empty">点「管理」添加常用工具</view>
      </view>
      <view v-else class="wgrid">
        <view v-for="w in widgetCands" :key="w.label" class="wcell" :class="selKeys.includes(w.label) && 'on'" @click="toggleWidget(w)">
          <view class="wic">{{ w.icon }}</view>
          <view class="wlb">{{ w.label }}</view>
        </view>
        <view class="wtip">已选 {{ selKeys.length }}/5，点击切换</view>
      </view>
    </view>

    <!-- 功能入口 -->
    <view class="sec-title">功能入口</view>
    <view class="grid">
      <view v-for="f in features" :key="f.path" class="cell" @click="go(f)">
        <view class="ic">{{ f.icon }}</view>
        <view class="lb">{{ f.label }}</view>
      </view>
    </view>

    <view v-if="loading" class="loadtip">加载中…</view>
  </view>
</template>

<script setup>
import { ref, computed } from 'vue'
import { onShow, onPullDownRefresh } from '@dcloudio/uni-app'
import api from '../../common/request'
import { auth, theme, flushTabBarStyle } from '../../common/store'
import { copyText } from '../../common/print'

// 生日卡片
const showCard = ref(false), cardName = ref(''), cardMsg = ref(''), cardEmoji = ref('🎂')
const greetings = ['愿你健康快乐，学习进步！🌟','愿你像小树一样茁壮成长！🌱','新的一岁，新的精彩，加油！💪','愿你每天都有阳光般的笑容！☀️','祝聪明可爱的你生日快乐！🎈']
function genBirthdayCard(b) {
  cardName.value = b.name
  cardEmoji.value = b.daysLeft === 0 ? '🎂🎉' : '🎂'
  cardMsg.value = greetings[Math.floor(Math.random() * greetings.length)]
  showCard.value = true
}
function copyBirthdayCard() {
  copyText(`🎂 亲爱的${cardName.value}同学：\n\n生日快乐！${cardMsg.value}\n\n——${auth.user?.name||'老师'} ${new Date().toLocaleDateString('zh-CN')}`)
}

// 笔记分类色块：将中文分类映射为 ASCII 类名，规避 WXSS 不支持中文类名的 \XXXX Unicode 转义
const catKeyMap = { '教学反思': 'reflection', '班会记录': 'meeting', '学习资料': 'material' }
function catKey(cat) {
  return catKeyMap[cat] || 'other'
}

const features = [
  { label: '班级管理', icon: '🏫', path: '/pages/classes/classes', tab: true },
  { label: '学生管理', icon: '👧', path: '/pages/students/students', tab: true },
  { label: '考试管理', icon: '📝', path: '/pages/exams/exams' },
  { label: '成绩管理', icon: '📊', path: '/pages/grades/grades' },
  { label: '座位表', icon: '💺', path: '/pages/seats/seats' },
  { label: 'AI 助手', icon: '🤖', path: '/pages/ai/ai' },
  { label: '工具箱', icon: '🧰', path: '/pages/toolbox/toolbox', tab: true },
  { label: '消息中心', icon: '📥', path: '/pages/messages/messages' },
  { label: '设置', icon: '⚙️', path: '/pages/config/config', tab: true },
]

const widgetCands = [
  { label: '计时器', icon: '⏱️', path: '/pages/tools/timer' },
  { label: '抽签', icon: '🎲', path: '/pages/tools/picker' },
  { label: '计算器', icon: '🧮', path: '/pages/tools/calc' },
  { label: '口算', icon: '➗', path: '/pages/tools/math' },
  { label: '错题本', icon: '📕', path: '/pages/tools/mistakes' },
  { label: '决策器', icon: '🔀', path: '/pages/tools/decider' },
  { label: '随机分组', icon: '👥', path: '/pages/group/group' },
  { label: '座位表', icon: '💺', path: '/pages/seats/seats' },
]
const selKeys = ref([])
const managing = ref(false)
const chosenWidgets = computed(() => widgetCands.filter((w) => selKeys.value.includes(w.label)))
function toggleWidget(w) {
  const i = selKeys.value.indexOf(w.label)
  if (i >= 0) selKeys.value.splice(i, 1)
  else {
    if (selKeys.value.length >= 5) return uni.showToast({ title: '最多勾选 5 个', icon: 'none' })
    selKeys.value.push(w.label)
  }
  uni.setStorageSync('dash_widgets', selKeys.value)
}
function goWidget(w) { uni.navigateTo({ url: w.path }) }

const dow = ['周一', '周二', '周三', '周四', '周五', '周六', '周日']
const todayDow = (() => { const d = new Date().getDay(); return d === 0 ? 7 : d })()
const todayStr = new Date().toISOString().slice(0, 10)

const greeting = computed(() => {
  const h = new Date().getHours()
  return h < 11 ? '早上好' : h < 14 ? '中午好' : h < 18 ? '下午好' : '晚上好'
})

const loading = ref(false)
const classList = ref([])
const currentClassIdx = ref(0)
const currentClass = computed(() => classList.value[currentClassIdx.value] || null)
function onClassChange(e) { currentClassIdx.value = e.detail.value }
const studentList = ref([])
const noteList = ref([])
const gradeList = ref([])
const todoList = ref([])
const todayLessons = ref([])
const noticeList = ref([])
const schoolNotices = ref([])
const searchQuery = ref('')
const searchResults = ref(null)
let searchTimer = null

async function doSearch() {
  const q = searchQuery.value.trim()
  if (!q) { searchResults.value = null; return }
  try {
    const r = await api.get('/school-admin/search?q=' + encodeURIComponent(q))
    searchResults.value = r || { students: [], teachers: [], classes: [] }
  } catch { searchResults.value = { students: [], teachers: [], classes: [] } }
}
function goStudent(s) { goPage('/pages/students/students?classId=' + s.classId) }

// AI 教务助手
const showAiHelper = ref(false)
const aiQuery = ref('')
const aiHistory = ref([])
const aiLoading = ref(false)
async function askAi() {
  const q = aiQuery.value.trim()
  if (!q || aiLoading.value) return
  aiHistory.value.push({ role: 'user', text: q })
  aiQuery.value = ''
  aiLoading.value = true
  try {
    const r = await api.post('/ai/chat-sync', {
      messages: [{ role: 'user', content: '你是小学班主任的AI助手，请用中文简要回答：' + q }],
    })
    aiHistory.value.push({ role: 'assistant', text: r.content || '抱歉，我暂时无法回答这个问题。' })
  } catch {
    aiHistory.value.push({ role: 'assistant', text: 'AI 服务暂时不可用，请稍后再试。' })
  }
  aiLoading.value = false
}
function quickAsk(q) { aiQuery.value = q; askAi() }

// 通知中心
const showNotifications = ref(false)
const unreadCount = ref(0)
const notificationsList = ref([])
async function loadNotifications() {
  try {
    const r = await api.get('/notifications/unread-count')
    unreadCount.value = r?.count || 0
  } catch {}
}
async function openNotifications() {
  showNotifications.value = !showNotifications.value
  if (showNotifications.value) {
    try {
      const r = await api.get('/notifications')
      notificationsList.value = r?.items || []
    } catch { notificationsList.value = [] }
  }
}
async function markAllRead() {
  try {
    await api.post('/notifications/mark-all-read')
    unreadCount.value = 0
    notificationsList.value.forEach(n => n.read = true)
    uni.showToast({ title: '全部已读', icon: 'success' })
  } catch {}
}
const attendanceList = ref([])
const homeworkList = ref([])
const semesterName = ref('')
const semesterList = ref([])
const semesterIdx = ref(0)

async function loadSemester() {
  try {
    const arr = await api.get('/semesters')
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

const recentNotes = computed(() =>
  [...noteList.value].sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0)).slice(0, 4)
)
const pinnedNotices = computed(() =>
  noticeList.value.filter((n) => n.pinned).slice(0, 3)
)
const todayTodos = computed(() =>
  todoList.value
    .filter((t) => !t.date || t.date === todayStr)
    .sort((a, b) => Number(a.done) - Number(b.done))
)
const doneCount = computed(() => todayTodos.value.filter((t) => t.done).length)

// P1-4: 本周生日（7 天内过生日的学生，按 birthDate 月日匹配，忽略年份）
const weekBirthdays = computed(() => {
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const list = []
  studentList.value.forEach((s) => {
    if (!s.birthDate) return
    // 兼容 YYYY-MM-DD / YYYY/MM/DD
    const m = String(s.birthDate).match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/)
    if (!m) return
    const mm = +m[2]
    const dd = +m[3]
    if (mm < 1 || mm > 12 || dd < 1 || dd > 31) return
    // 今年生日
    let birthThisYear = new Date(now.getFullYear(), mm - 1, dd)
    // 如果今年生日已过，看明年；这里允许"今天"算 0 天
    const diffDays = Math.round((birthThisYear - today) / 86400000)
    let daysLeft = diffDays
    if (diffDays < 0) {
      // 已过，看明年
      birthThisYear = new Date(now.getFullYear() + 1, mm - 1, dd)
      daysLeft = Math.round((birthThisYear - today) / 86400000)
    }
    if (daysLeft < 0 || daysLeft > 7) return
    list.push({
      id: s.id,
      name: s.name,
      birthLabel: (mm < 10 ? '0' + mm : mm) + '-' + (dd < 10 ? '0' + dd : dd),
      daysLeft,
    })
  })
  return list.sort((a, b) => a.daysLeft - b.daysLeft)
})

// 今日心情（本地持久化）
const moodOptions = ['元气满满', '有些小累', '需要鼓励', '灵感爆棚']
const moodEmojis = ['🌟', '🥱', '🤗', '💡']
const currentMood = ref('')
function pickMood(m) {
  currentMood.value = m
  uni.setStorageSync('mood_' + todayStr, m)
  uni.showToast({ title: '已记录：' + m, icon: 'none' })
}

// 班级工作台计算属性
const weekAttRate = computed(() => {
  const now = new Date()
  const weekAgo = new Date(now.getTime() - 7 * 86400000).toISOString().slice(0, 10)
  const weekAtts = attendanceList.value.filter(a => a.date >= weekAgo)
  if (!weekAtts.length) return 100
  const present = weekAtts.filter(a => a.records?.some(r => r.status === 'present' || r.status === '出勤')).length
  return Math.round((present / weekAtts.length) * 100)
})
const pendingBySubject = computed(() => {
  const hws = homeworkList.value.filter(h => h.status === '待批改')
  const subjects = [...new Set(hws.map(h => h.subject).filter(Boolean))]
  return subjects
})
const weekBehaviorCount = computed(() => {
  // 使用已有 behaviorList 或返回 0
  return 0
}

// 数据趋势：近7日出勤
const weekTrend = computed(() => {
  const days = []
  for (let i = 6; i >= 0; i--) {
    const d = new Date(Date.now() - i * 86400000)
    const dateStr = d.toISOString().slice(0, 10)
    const dayAtts = attendanceList.value.filter(a => a.date === dateStr)
    const present = dayAtts.filter(a => a.records?.some(r => r.status === 'present' || r.status === '出勤')).length
    const total = dayAtts.length
    days.push({
      label: ['日','一','二','三','四','五','六'][d.getDay()],
      date: dateStr,
      rate: total > 0 ? Math.round((present / total) * 100) : null,
      total,
    })
  }
  return days
}))

async function loadAll() {
  loading.value = true
  loadSemester()
  try {
    const [classes, students, notes, grades, todos, schedules, notices, attendances, homeworks, schoolNoticesR] = await Promise.all([
      api.get('/classes').catch(() => []),
      api.get('/students').catch(() => []),
      api.get('/notes').catch(() => []),
      api.get('/grades').catch(() => []),
      api.get('/todos').catch(() => []),
      api.get('/schedules').catch(() => []),
      api.get('/notices').catch(() => []),
      api.get('/attendances').catch(() => []),
      api.get('/homework').catch(() => []),
      api.get('/notices?scope=school').catch(() => ({ items: [] })),
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
    loadNotifications()
  } catch (e) {
    uni.showToast({ title: '首页数据加载失败：' + (e.message || ''), icon: 'none' })
  }
  finally { loading.value = false }
}
onShow(() => {
  if (!auth.token) { uni.reLaunch({ url: '/pages/login/login' }); return }
  currentMood.value = uni.getStorageSync('mood_' + todayStr) || ''
  selKeys.value = uni.getStorageSync('dash_widgets') || widgetCands.slice(0, 4).map((w) => w.label)
  loadAll()
})
// 进入 tabBar 页面时落地待应用的主题/tabBar 样式（非 tabBar 页面修改主题后需此兜底）
onShow(() => flushTabBarStyle())
onPullDownRefresh(async () => {
  await loadAll()
  uni.stopPullDownRefresh()
})

// 待办交互
const newTodo = ref('')
async function addTodo() {
  const t = newTodo.value.trim()
  if (!t) return
  try {
    const r = await api.post('/todos', { title: t, note: '', date: todayStr, done: false })
    todoList.value.push(r)
    newTodo.value = ''
  } catch (e) { uni.showToast({ title: '添加失败', icon: 'none' }) }
}
async function toggleTodo(t) {
  t.done = !t.done
  try { await api.patch('/todos/' + t.id, { done: t.done }) }
  catch (e) {
    // 回滚前给用户明确反馈，避免状态被悄悄撤销造成困惑
    uni.showToast({ title: '更新失败，已回滚', icon: 'none' })
    t.done = !t.done
  }
}
async function delTodo(t) {
  uni.showModal({
    title: '删除待办',
    content: `确定删除「${t.title || '该待办'}」？`,
    confirmColor: '#e64340',
    success: async (r) => {
      if (!r.confirm) return
      try { await api.del('/todos/' + t.id); todoList.value = todoList.value.filter((x) => x.id !== t.id) }
      catch (e) { uni.showToast({ title: '删除失败', icon: 'none' }) }
    },
  })
}

function go(f) {
  if (f.tab) uni.switchTab({ url: f.path })
  else uni.navigateTo({ url: f.path })
}
function goPage(url) { uni.navigateTo({ url }) }
function goCrud(type) {
  const MAP = { classes: '/pages/classes/classes', students: '/pages/students/students' }
  const url = MAP[type]
  if (url) uni.switchTab({ url })  // 班级和学生是 tabBar 页面，用 switchTab
  else uni.navigateTo({ url: '/pages/crud/crud?type=' + encodeURIComponent(type) })
}
</script>

<style scoped>
.page { padding: 30rpx; background: var(--c-bg); min-height: 100vh; box-sizing: border-box; }
.header { padding: 10rpx 6rpx 20rpx; }
.hi { font-size: 44rpx; font-weight: 700; color: var(--c-title); }
.school { color: var(--c-sub); margin-top: 8rpx; }
.sem { color: var(--c-accent); font-weight: 600; }
.moods { display: flex; flex-wrap: wrap; gap: 12rpx; margin-top: 18rpx; }
.mood { font-size: 22rpx; padding: 10rpx 18rpx; border-radius: 30rpx; background: var(--c-card); color: var(--c-sub); }
.mood.on { background: var(--c-accent); color: #fff; }
.ov-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 16rpx; margin: 10rpx 0 20rpx; }
.today-stats { grid-template-columns: repeat(3, 1fr); margin: 6rpx 0 14rpx; }
.ts-card { flex-direction: column; align-items: center; text-align: center; padding: 20rpx 8rpx; gap: 8rpx; }
.ts-card .ov-ic { width: 48rpx; height: 48rpx; line-height: 48rpx; font-size: 26rpx; }
.ts-num { font-size: 36rpx !important; text-align: center !important; }
.ts-num.warn { color: var(--c-danger) !important; }
.ov { background: var(--c-card); border-radius: 22rpx; padding: 24rpx; display: flex; align-items: center; gap: 20rpx; box-shadow: 0 4rpx 16rpx var(--c-shadow); }
.ov-ic { width: 64rpx; height: 64rpx; border-radius: 18rpx; text-align: center; line-height: 64rpx; font-size: 32rpx; flex-shrink: 0; }
.ov-num { font-size: 44rpx; font-weight: 800; color: var(--c-accent); flex: 1; text-align: right; }
.ov-lb { font-size: 22rpx; color: var(--c-sub); }
.card { margin-top: 20rpx; background: var(--c-card); border-radius: 20rpx; padding: 24rpx; box-shadow: 0 2rpx 10rpx var(--c-shadow); }
.card-h { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12rpx; }
.ch-t { font-size: 28rpx; font-weight: 700; color: var(--c-title); }
.ch-m { font-size: 22rpx; color: var(--c-sub); }
.li { display: flex; align-items: center; padding: 14rpx 0; border-bottom: 1px solid var(--c-border); font-size: 26rpx; }
.li:last-child { border-bottom: none; }
.li.col { flex-direction: column; align-items: stretch; }
.li-top { display: flex; align-items: center; justify-content: space-between; }
.li-pos { width: 110rpx; color: var(--c-accent); font-weight: 600; flex-shrink: 0; }
.li-t { flex: 1; color: var(--c-title); }
.li-t.done { color: var(--c-sub); text-decoration: line-through; }
.li-s { color: var(--c-sub); font-size: 22rpx; margin-left: 16rpx; flex-shrink: 0; }
.clamp { display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.cat { font-size: 20rpx; padding: 2rpx 12rpx; border-radius: 16rpx; flex-shrink: 0; }
.c-reflection { background: #fde8ea; color: #e06c75; }
.c-meeting { background: #e8f9e8; color: #07c160; }
.c-material { background: #e8f1fb; color: #409eff; }
.c-other { background: #f7f1e6; color: #a07b3b; }
.bord { border-left: 6rpx solid var(--c-danger); padding-left: 14rpx; }
/* P1-4: 本周生日 */
.bd-li { gap: 12rpx; }
.bd-emoji { font-size: 28rpx; flex-shrink: 0; }
.bd-date { font-size: 24rpx; color: var(--c-sub); margin-left: auto; flex-shrink: 0; }
.bd-today { font-size: 22rpx; color: #fff; background: var(--c-danger); padding: 4rpx 14rpx; border-radius: 20rpx; flex-shrink: 0; }
.bd-days { font-size: 22rpx; color: var(--c-accent); background: rgba(230,162,60,.15); padding: 4rpx 14rpx; border-radius: 20rpx; flex-shrink: 0; }
.bd-card { font-size: 20rpx; color: #fff; background: #e06c75; padding: 4rpx 12rpx; border-radius: 16rpx; flex-shrink: 0; }
.bd-card-dialog { width: 580rpx; background: linear-gradient(135deg, #fff8e1 0%, #ffe0b2 100%); border-radius: 28rpx; padding: 40rpx 30rpx; text-align: center; }
.bd-card-bg { font-size: 72rpx; }
.bd-card-title { font-size: 36rpx; font-weight: 800; color: #e06c75; margin: 10rpx 0; }
.bd-card-name { font-size: 44rpx; font-weight: 800; color: #4a3f35; }
.bd-card-msg { font-size: 28rpx; color: #5a5048; margin: 16rpx 0; line-height: 1.6; }
.bd-card-copy { width: 100%; background: #07c160; color: #fff; border-radius: 50rpx; font-size: 28rpx; margin-top: 10rpx; height: 80rpx; line-height: 80rpx; }
.bd-card-close { width: 100%; background: transparent; color: #999; border-radius: 50rpx; font-size: 26rpx; margin-top: 6rpx; height: 60rpx; line-height: 60rpx; }
/* 待办 */
.todo-add { display: flex; gap: 12rpx; margin-bottom: 12rpx; }
.ta-inp { flex: 1; background: var(--c-input); border-radius: 12rpx; padding: 14rpx 18rpx; font-size: 26rpx; }
.ta-btn { font-size: 26rpx; color: #fff; background: var(--c-accent); padding: 0 28rpx; border-radius: 12rpx; display: flex; align-items: center; }
.todo { gap: 14rpx; }
.cb { width: 36rpx; height: 36rpx; border-radius: 50%; border: 3rpx solid var(--c-sub); flex-shrink: 0; }
.cb.on { background: var(--c-primary); border-color: var(--c-primary); }
.li-del { font-size: 26rpx; color: var(--c-danger); flex-shrink: 0; margin-left: 10rpx; }
.empty { text-align: center; color: var(--c-sub); padding: 30rpx 0; font-size: 24rpx; }
/* 班级切换 */
.class-switcher { margin-bottom: 12rpx; }
.cs-picker { display: flex; align-items: center; justify-content: space-between; background: var(--c-card); border-radius: 12rpx; padding: 14rpx 20rpx; }
.cs-label { font-size: 28rpx; font-weight: 700; color: var(--c-title); }
.cs-arrow { font-size: 24rpx; color: var(--c-sub); }
/* 快捷操作 */
/* 搜索栏 */
.search-bar { position: relative; margin-bottom: 12rpx; }
.search-inp { width: 100%; border: 1px solid var(--c-border); border-radius: 40rpx; padding: 16rpx 60rpx 16rpx 30rpx; font-size: 26rpx; background: var(--c-input); color: var(--c-text); box-sizing: border-box; }
.search-clear { position: absolute; right: 20rpx; top: 50%; transform: translateY(-50%); font-size: 32rpx; color: var(--c-sub); }
.search-results { background: var(--c-card); border-radius: 14rpx; padding: 14rpx 20rpx; margin-bottom: 14rpx; }
.search-section { margin-bottom: 10rpx; }
.search-section-title { font-size: 22rpx; font-weight: 600; color: var(--c-sub); margin-bottom: 6rpx; display: block; }
.search-item { display: flex; align-items: center; gap: 12rpx; padding: 10rpx 0; border-bottom: 1rpx solid var(--c-border); }
.search-item:last-child { border-bottom: none; }
.search-name { font-size: 26rpx; font-weight: 600; color: var(--c-title); }
.search-meta { font-size: 22rpx; color: var(--c-sub); }
.search-empty { text-align: center; padding: 20rpx 0; font-size: 24rpx; color: var(--c-sub); }
/* 趋势图 */
.trend-chart { display: flex; align-items: flex-end; gap: 8rpx; padding: 10rpx 0; height: 200rpx; }
.trend-bar-col { flex: 1; display: flex; flex-direction: column; align-items: center; height: 100%; }
.trend-bar-wrap { flex: 1; width: 100%; display: flex; align-items: flex-end; justify-content: center; }
.trend-bar { width: 36rpx; border-radius: 6rpx 6rpx 0 0; background: #c8e6c9; min-height: 4rpx; transition: height 0.3s; }
.trend-bar.today { background: var(--c-accent, #07c160); }
.trend-label { font-size: 20rpx; color: var(--c-sub); margin-top: 4rpx; }
.trend-rate { font-size: 18rpx; color: var(--c-sub2); }
/* AI 助手 */
.ai-msgs { max-height: 400rpx; overflow-y: auto; margin-bottom: 12rpx; }
.ai-msg { padding: 10rpx 0; border-bottom: 1rpx solid var(--c-border); }
.ai-role { font-size: 22rpx; font-weight: 600; color: var(--c-title); display: block; margin-bottom: 4rpx; }
.ai-text { font-size: 24rpx; color: var(--c-sub); line-height: 1.6; white-space: pre-wrap; }
.ai-input-row { display: flex; gap: 10rpx; margin-bottom: 8rpx; }
.ai-inp { flex: 1; border: 1px solid var(--c-border); border-radius: 30rpx; padding: 14rpx 20rpx; font-size: 24rpx; background: var(--c-input); color: var(--c-text); }
.ai-send { flex-shrink: 0; background: var(--c-primary); color: #fff; border-radius: 30rpx; padding: 0 24rpx; font-size: 24rpx; display: flex; align-items: center; }
.ai-hints { display: flex; gap: 8rpx; flex-wrap: wrap; }
.ai-hint { font-size: 20rpx; color: #409eff; background: rgba(64,158,255,.1); padding: 6rpx 14rpx; border-radius: 20rpx; }
/* 通知中心 */
.bell { position: relative; margin-left: auto; padding: 0 10rpx; }
.bell-icon { font-size: 36rpx; }
.bell-badge { position: absolute; top: -4rpx; right: 0; background: #e64340; color: #fff; font-size: 18rpx; min-width: 28rpx; height: 28rpx; line-height: 28rpx; text-align: center; border-radius: 14rpx; padding: 0 4rpx; }
.notif-panel { position: fixed; top: 0; right: 0; width: 100%; height: 100vh; z-index: 999; background: var(--c-bg); display: flex; flex-direction: column; }
.notif-hd { display: flex; align-items: center; gap: 16rpx; padding: 20rpx 24rpx; background: var(--c-card); border-bottom: 1rpx solid var(--c-border); }
.notif-title { font-size: 32rpx; font-weight: 700; color: var(--c-title); flex: 1; }
.notif-act { font-size: 24rpx; color: #409eff; }
.notif-list { flex: 1; overflow-y: auto; padding: 14rpx 24rpx; }
.notif-empty { text-align: center; padding: 60rpx 0; font-size: 26rpx; color: var(--c-sub); }
.notif-item { display: flex; gap: 14rpx; padding: 16rpx 0; border-bottom: 1rpx solid var(--c-border); }
.notif-item.unread { background: rgba(64,158,255,.04); margin: 0 -24rpx; padding: 16rpx 24rpx; }
.notif-icon { font-size: 28rpx; flex-shrink: 0; }
.notif-body { flex: 1; min-width: 0; }
.notif-title-text { font-size: 26rpx; font-weight: 600; color: var(--c-title); display: block; }
.notif-content { font-size: 22rpx; color: var(--c-sub); margin-top: 4rpx; display: block; }
.quick-actions { display: flex; gap: 12rpx; overflow-x: auto; padding: 0 0 14rpx; }
.qa-item { display: flex; flex-direction: column; align-items: center; gap: 6rpx; flex-shrink: 0; width: 100rpx; }
.qa-ic { width: 60rpx; height: 60rpx; border-radius: 30rpx; display: flex; align-items: center; justify-content: center; font-size: 28rpx; }
.qa-lb { font-size: 20rpx; color: var(--c-sub); text-align: center; }
/* 未读徽标 */
.unread-badge { display: inline-block; font-size: 18rpx; color: #fff; background: #e64340; border-radius: 20rpx; padding: 0 12rpx; margin-left: 6rpx; font-weight: 400; vertical-align: middle; line-height: 28rpx; }
.unread-badge-dash { font-size: 20rpx; color: #e64340; background: rgba(230,67,64,.1); border-radius: 12rpx; padding: 0 12rpx; margin-left: 8rpx; vertical-align: middle; }
/* 班级工作台 */
.ww-grid { display: flex; gap: 12rpx; margin-bottom: 10rpx; }
.ww-item { flex: 1; text-align: center; padding: 14rpx 0; background: var(--c-input); border-radius: 12rpx; }
.ww-num { display: block; font-size: 36rpx; font-weight: 800; color: var(--c-accent); }
.ww-num.warn { color: #e6a23c; }
.ww-lb { display: block; font-size: 20rpx; color: var(--c-sub); margin-top: 4rpx; }
.ww-detail { padding: 8rpx 0 0; border-top: 1rpx solid var(--c-border); }
.ww-detail-title { font-size: 22rpx; color: var(--c-sub); }
.ww-detail-text { font-size: 22rpx; color: var(--c-title); }
.sec-title { font-size: 30rpx; font-weight: 700; color: var(--c-title); margin: 30rpx 6rpx 18rpx; }
.grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16rpx; }
.wgrid { display: grid; grid-template-columns: repeat(5, 1fr); gap: 14rpx; }
.wcell { display: flex; flex-direction: column; align-items: center; padding: 18rpx 6rpx; border-radius: 16rpx; background: var(--c-input); }
.wcell.on { outline: 3rpx solid var(--c-accent); }
.wic { font-size: 44rpx; }
.wlb { margin-top: 8rpx; font-size: 22rpx; color: var(--c-title); }
.wtip { grid-column: 1 / 5; text-align: center; font-size: 22rpx; color: var(--c-sub); }
.cell { background: var(--c-card); border-radius: 20rpx; padding: 28rpx 14rpx; display: flex; flex-direction: column; align-items: center; box-shadow: 0 4rpx 14rpx var(--c-shadow); }
.ic { font-size: 52rpx; }
.lb { margin-top: 12rpx; color: var(--c-title); font-size: 26rpx; }
.loadtip { text-align: center; color: var(--c-sub); font-size: 24rpx; padding: 20rpx 0; }
</style>
