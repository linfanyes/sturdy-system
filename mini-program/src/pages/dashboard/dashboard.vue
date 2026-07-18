<template>
  <view class="page" :class="{ dark: theme.mode === 'dark' }">
    <view class="header">
      <view class="hi">{{ greeting }}，{{ auth.user?.name || '老师' }}</view>
      <view class="school">{{ auth.user?.school || '未设置学校' }}</view>
    </view>

    <!-- 今日概览 -->
    <view class="sec-title">今日概览</view>
    <view class="ov-grid">
      <view class="ov" :class="{ dot: todoList.length }" @click="goCrud('todos')">
        <view class="ov-ic">✅</view>
        <view class="ov-num">{{ todoList.length }}</view>
        <view class="ov-lb">待办事项</view>
      </view>
      <view class="ov" :class="{ dot: todayLessons.length }" @click="goCrud('schedules')">
        <view class="ov-ic">🗓️</view>
        <view class="ov-num">{{ todayLessons.length }}</view>
        <view class="ov-lb">今日课程</view>
      </view>
      <view class="ov" :class="{ dot: examList.length }" @click="goPage('/pages/exams/exams')">
        <view class="ov-ic">📝</view>
        <view class="ov-num">{{ examList.length }}</view>
        <view class="ov-lb">最近考试</view>
      </view>
      <view class="ov" :class="{ dot: noticeList.length }" @click="goCrud('notices')">
        <view class="ov-ic">📢</view>
        <view class="ov-num">{{ noticeList.length }}</view>
        <view class="ov-lb">通知公告</view>
      </view>
    </view>

    <!-- 成绩待分析 横幅 -->
    <view v-if="pendingExams.length" class="banner" @click="goPage('/pages/ai-exam/ai-exam')">
      <text class="b-ic">📊</text>
      <view class="b-txt">
        <view class="b-t1">{{ pendingExams.length }} 场考试待分析</view>
        <view class="b-t2">{{ pendingExams[0].name }} 等可一键生成分析报告</view>
      </view>
      <text class="b-go">去分析 ›</text>
    </view>

    <!-- 待办明细 -->
    <view v-if="todoList.length" class="card">
      <view class="card-h" @click="goCrud('todos')">
        <text class="ch-t">待办事项</text><text class="ch-m">全部 ›</text>
      </view>
      <view v-for="t in todoList" :key="t.id" class="li">
        <text class="li-dot" :class="{ done: t.done }"></text>
        <text class="li-t" :class="{ done: t.done }">{{ t.title }}</text>
        <text class="li-s" v-if="t.date">{{ t.date }}</text>
      </view>
    </view>

    <!-- 今日课程 -->
    <view v-if="todayLessons.length" class="card">
      <view class="card-h" @click="goCrud('schedules')">
        <text class="ch-t">今日课程（{{ dow[todayDow] }}）</text><text class="ch-m">课表 ›</text>
      </view>
      <view v-for="(l, i) in todayLessons" :key="i" class="li">
        <text class="li-pos">{{ l.section || ('第' + l.period + '节') }}</text>
        <text class="li-t">{{ l.subject || '—' }}</text>
        <text class="li-s" v-if="l.teacher">{{ l.teacher }}</text>
        <text class="li-tag" v-if="l.weekType && l.weekType !== 'all'">{{ wkLabel(l.weekType) }}</text>
      </view>
    </view>

    <!-- 最近考试 -->
    <view v-if="examList.length" class="card">
      <view class="card-h" @click="goPage('/pages/exams/exams')">
        <text class="ch-t">最近考试</text><text class="ch-m">全部 ›</text>
      </view>
      <view v-for="e in examList" :key="e.id" class="li">
        <text class="li-t">{{ e.name }}</text>
        <text class="li-s">{{ e.date }}</text>
      </view>
    </view>

    <!-- 通知公告 -->
    <view v-if="noticeList.length" class="card">
      <view class="card-h" @click="goCrud('notices')">
        <text class="ch-t">通知公告</text><text class="ch-m">全部 ›</text>
      </view>
      <view v-for="n in noticeList" :key="n.id" class="li">
        <text class="li-t">{{ n.title }}</text>
        <text class="li-s">{{ n.classId || '' }}</text>
      </view>
    </view>

    <!-- 功能入口 -->
    <view class="sec-title">功能入口</view>
    <view class="grid">
      <view
        v-for="f in features"
        :key="f.path"
        class="cell"
        @click="go(f)"
      >
        <view class="ic">{{ f.icon }}</view>
        <view class="lb">{{ f.label }}</view>
      </view>
    </view>

    <view v-if="loading" class="loadtip">加载中…</view>
  </view>
</template>

<script setup>
import { ref, computed } from 'vue'
import { onShow } from '@dcloudio/uni-app'
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
  { label: '设置', icon: '⚙️', path: '/pages/config/config', tab: true },
]

const dow = ['周一', '周二', '周三', '周四', '周五', '周六', '周日']
const todayDow = (() => {
  const d = new Date().getDay()
  return d === 0 ? 7 : d
})()

const greeting = computed(() => {
  const h = new Date().getHours()
  return h < 11 ? '早上好' : h < 14 ? '中午好' : h < 18 ? '下午好' : '晚上好'
})

const loading = ref(false)
const todoList = ref([])
const todayLessons = ref([])
const examList = ref([])
const noticeList = ref([])
const pendingExams = ref([])

function wkLabel(w) {
  return { all: '全周', single: '单周', double: '双周' }[w] || '全周'
}

async function loadAll() {
  loading.value = true
  try {
    const [todos, schedules, exams, notices, grades] = await Promise.all([
      api.get('/todos').catch(() => []),
      api.get('/schedules').catch(() => []),
      api.get('/exams').catch(() => []),
      api.get('/notices').catch(() => []),
      api.get('/grades').catch(() => []),
    ])
    todoList.value = (todos || [])
      .filter((t) => !t.done)
      .sort((a, b) => (a.date || '').localeCompare(b.date || ''))
      .slice(0, 5)
    todayLessons.value = (schedules || [])
      .filter((s) => s.dayOfWeek === todayDow)
      .sort((a, b) => (a.period || 99) - (b.period || 99))
      .slice(0, 6)
    const now = new Date().toISOString().slice(0, 10)
    examList.value = (exams || [])
      .filter((e) => e.date && e.date >= now)
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(0, 3)
    noticeList.value = (notices || [])
      .filter((n) => n.ended !== '是' && n.ended !== true)
      .slice(0, 3)
    // 待分析：有成绩记录但考试没有 analysisNote
    const gradedExamNames = new Set(
      (grades || [])
        .filter((g) => g.examName)
        .map((g) => g.examName),
    )
    pendingExams.value = (exams || [])
      .filter((e) => gradedExamNames.has(e.name) && !e.analysisNote)
      .slice(0, 3)
  } catch (e) {
    // 概览失败不影响功能入口使用
  } finally {
    loading.value = false
  }
}
onShow(() => {
  if (!auth.token) {
    uni.reLaunch({ url: '/pages/login/login' })
    return
  }
  loadAll()
})

function go(f) {
  if (f.tab) uni.switchTab({ url: f.path })
  else uni.navigateTo({ url: f.path })
}
function goPage(url) {
  uni.navigateTo({ url })
}
function goCrud(type) {
  uni.navigateTo({ url: '/pages/crud/crud?type=' + encodeURIComponent(type) })
}
</script>

<style scoped>
.page {
  padding: 30rpx;
  background: var(--c-bg);
  min-height: 100vh;
  box-sizing: border-box;
}
.header {
  padding: 20rpx 10rpx 30rpx;
}
.hi {
  font-size: 44rpx;
  font-weight: 700;
  color: var(--c-title);
}
.school {
  color: var(--c-sub);
  margin-top: 8rpx;
}
.sec-title {
  font-size: 30rpx;
  font-weight: 700;
  color: var(--c-title);
  margin: 30rpx 6rpx 18rpx;
}
/* 概览卡片 */
.ov-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 18rpx;
}
.ov {
  background: var(--c-card);
  border-radius: 22rpx;
  padding: 26rpx 10rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  box-shadow: 0 4rpx 16rpx var(--c-shadow);
  position: relative;
}
.ov.dot::after {
  content: '';
  position: absolute;
  top: 14rpx;
  right: 14rpx;
  width: 14rpx;
  height: 14rpx;
  border-radius: 50%;
  background: #e64340;
}
.ov-ic { font-size: 44rpx; }
.ov-num { font-size: 40rpx; font-weight: 800; color: var(--c-accent); margin: 6rpx 0; }
.ov-lb { font-size: 22rpx; color: var(--c-sub); }
/* 横幅 */
.banner {
  display: flex;
  align-items: center;
  margin-top: 20rpx;
  background: linear-gradient(135deg, #fff3d6 0%, #ffe9b8 100%);
  border-radius: 22rpx;
  padding: 24rpx;
}
.dark .banner { background: linear-gradient(135deg, #3a3322 0%, #4a3f25 100%); }
.b-ic { font-size: 44rpx; margin-right: 16rpx; }
.b-txt { flex: 1; }
.b-t1 { font-size: 28rpx; font-weight: 700; color: var(--c-title); }
.b-t2 { font-size: 22rpx; color: var(--c-sub); margin-top: 4rpx; }
.b-go { font-size: 26rpx; color: var(--c-accent); font-weight: 600; }
/* 明细卡 */
.card {
  margin-top: 20rpx;
  background: var(--c-card);
  border-radius: 20rpx;
  padding: 24rpx;
  box-shadow: 0 2rpx 10rpx var(--c-shadow);
}
.card-h {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12rpx;
}
.ch-t { font-size: 28rpx; font-weight: 700; color: var(--c-title); }
.ch-m { font-size: 24rpx; color: var(--c-sub); }
.li {
  display: flex;
  align-items: center;
  padding: 14rpx 0;
  border-bottom: 1px solid var(--c-border);
  font-size: 26rpx;
}
.li:last-child { border-bottom: none; }
.li-dot {
  width: 16rpx; height: 16rpx; border-radius: 50%;
  background: var(--c-accent); margin-right: 16rpx; flex-shrink: 0;
}
.li-dot.done { background: #bbb; }
.li-t { flex: 1; color: var(--c-title); }
.li-t.done { color: var(--c-sub); text-decoration: line-through; }
.li-s { color: var(--c-sub); font-size: 22rpx; margin-left: 16rpx; flex-shrink: 0; }
.li-pos { width: 110rpx; color: var(--c-accent); font-weight: 600; flex-shrink: 0; }
.li-tag { margin-left: 12rpx; font-size: 20rpx; color: var(--c-sub); background: var(--c-card2); padding: 4rpx 12rpx; border-radius: 20rpx; flex-shrink: 0; }
/* 功能入口 */
.grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 24rpx;
}
.cell {
  background: var(--c-card);
  border-radius: 24rpx;
  padding: 40rpx 20rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  box-shadow: 0 6rpx 20rpx var(--c-shadow);
}
.ic { font-size: 70rpx; }
.lb { margin-top: 16rpx; color: var(--c-title); font-size: 30rpx; }
.loadtip { text-align: center; color: var(--c-sub); font-size: 24rpx; padding: 20rpx 0; }
</style>
