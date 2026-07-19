<template>
  <view class="page" :class="{ dark: theme.mode === 'dark' }">
    <!-- 欢迎条 -->
    <view class="header">
      <view class="hi">{{ greeting }}，{{ auth.user?.name || '老师' }}</view>
      <view class="school">{{ auth.user?.school || '未设置学校' }}</view>
      <view class="moods">
        <text class="mood" :class="currentMood === m && 'on'" v-for="(m, i) in moodOptions" :key="m" @click="pickMood(m)">{{ moodEmojis[i] }} {{ m }}</text>
      </view>
    </view>

    <!-- 统计卡 -->
    <view class="ov-grid">
      <view class="ov" @click="goCrud('classes')">
        <view class="ov-ic" style="background:#fff3d6">🏫</view>
        <view class="ov-num">{{ classList.length }}</view>
        <view class="ov-lb">班级数</view>
      </view>
      <view class="ov" @click="goCrud('students')">
        <view class="ov-ic" style="background:#e8f9e8">🧒</view>
        <view class="ov-num">{{ studentList.length }}</view>
        <view class="ov-lb">学生数</view>
      </view>
      <view class="ov" @click="goCrud('notes')">
        <view class="ov-ic" style="background:#fde8ea">📒</view>
        <view class="ov-num">{{ noteList.length }}</view>
        <view class="ov-lb">笔记数</view>
      </view>
      <view class="ov" @click="goPage('/pages/grades/grades')">
        <view class="ov-ic" style="background:#e8f1fb">📊</view>
        <view class="ov-num">{{ gradeList.length }}</view>
        <view class="ov-lb">考试数</view>
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
        <text class="ch-m">{{ doneCount }}/{{ todayTodos.length }} 完成</text>
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
          <text class="cat" :class="'c-' + (n.category || '其他')">{{ n.category || '其他' }}</text>
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
import { auth, theme } from '../../common/store'

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
const studentList = ref([])
const noteList = ref([])
const gradeList = ref([])
const todoList = ref([])
const todayLessons = ref([])
const noticeList = ref([])

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

// 今日心情（本地持久化）
const moodOptions = ['元气满满', '有些小累', '需要鼓励', '灵感爆棚']
const moodEmojis = ['🌟', '🥱', '🤗', '💡']
const currentMood = ref('')
function pickMood(m) {
  currentMood.value = m
  uni.setStorageSync('mood_' + todayStr, m)
  uni.showToast({ title: '已记录：' + m, icon: 'none' })
}

async function loadAll() {
  loading.value = true
  try {
    const [classes, students, notes, grades, todos, schedules, notices] = await Promise.all([
      api.get('/classes').catch(() => []),
      api.get('/students').catch(() => []),
      api.get('/notes').catch(() => []),
      api.get('/grades').catch(() => []),
      api.get('/todos').catch(() => []),
      api.get('/schedules').catch(() => []),
      api.get('/notices').catch(() => []),
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
function goCrud(type) { uni.navigateTo({ url: '/pages/crud/crud?type=' + encodeURIComponent(type) }) }
</script>

<style scoped>
.page { padding: 30rpx; background: var(--c-bg); min-height: 100vh; box-sizing: border-box; }
.header { padding: 10rpx 6rpx 20rpx; }
.hi { font-size: 44rpx; font-weight: 700; color: var(--c-title); }
.school { color: var(--c-sub); margin-top: 8rpx; }
.moods { display: flex; flex-wrap: wrap; gap: 12rpx; margin-top: 18rpx; }
.mood { font-size: 22rpx; padding: 10rpx 18rpx; border-radius: 30rpx; background: var(--c-card); color: var(--c-sub); }
.mood.on { background: var(--c-accent); color: #fff; }
.ov-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 18rpx; margin: 10rpx 0 20rpx; }
.ov { background: var(--c-card); border-radius: 22rpx; padding: 22rpx 8rpx; display: flex; flex-direction: column; align-items: center; box-shadow: 0 4rpx 16rpx var(--c-shadow); }
.ov-ic { width: 56rpx; height: 56rpx; border-radius: 16rpx; text-align: center; line-height: 56rpx; font-size: 32rpx; }
.ov-num { font-size: 40rpx; font-weight: 800; color: var(--c-accent); margin: 6rpx 0; }
.ov-lb { font-size: 20rpx; color: var(--c-sub); }
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
.c-教学反思 { background: #fde8ea; color: #e06c75; }
.c-班会记录 { background: #e8f9e8; color: #07c160; }
.c-学习资料 { background: #e8f1fb; color: #409eff; }
.c-其他 { background: #f7f1e6; color: #a07b3b; }
.bord { border-left: 6rpx solid var(--c-danger); padding-left: 14rpx; }
/* 待办 */
.todo-add { display: flex; gap: 12rpx; margin-bottom: 12rpx; }
.ta-inp { flex: 1; background: var(--c-input); border-radius: 12rpx; padding: 14rpx 18rpx; font-size: 26rpx; }
.ta-btn { font-size: 26rpx; color: #fff; background: var(--c-accent); padding: 0 28rpx; border-radius: 12rpx; display: flex; align-items: center; }
.todo { gap: 14rpx; }
.cb { width: 36rpx; height: 36rpx; border-radius: 50%; border: 3rpx solid var(--c-sub); flex-shrink: 0; }
.cb.on { background: var(--c-primary); border-color: var(--c-primary); }
.li-del { font-size: 26rpx; color: var(--c-danger); flex-shrink: 0; margin-left: 10rpx; }
.empty { text-align: center; color: var(--c-sub); padding: 30rpx 0; font-size: 24rpx; }
.sec-title { font-size: 30rpx; font-weight: 700; color: var(--c-title); margin: 30rpx 6rpx 18rpx; }
.grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 24rpx; }
.wgrid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 18rpx; }
.wcell { display: flex; flex-direction: column; align-items: center; padding: 18rpx 6rpx; border-radius: 16rpx; background: var(--c-input); }
.wcell.on { outline: 3rpx solid var(--c-accent); }
.wic { font-size: 44rpx; }
.wlb { margin-top: 8rpx; font-size: 22rpx; color: var(--c-title); }
.wtip { grid-column: 1 / 5; text-align: center; font-size: 22rpx; color: var(--c-sub); }
.cell { background: var(--c-card); border-radius: 24rpx; padding: 40rpx 20rpx; display: flex; flex-direction: column; align-items: center; box-shadow: 0 6rpx 20rpx var(--c-shadow); }
.ic { font-size: 70rpx; }
.lb { margin-top: 16rpx; color: var(--c-title); font-size: 30rpx; }
.loadtip { text-align: center; color: var(--c-sub); font-size: 24rpx; padding: 20rpx 0; }
</style>
