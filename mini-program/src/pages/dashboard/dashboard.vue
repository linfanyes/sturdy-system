<template>
  <view class="page grow-in" :class="{ dark: theme.mode === 'dark' }">
    <!-- 欢迎条 -->
    <WelcomeHeader
      :semesterList="semesterList"
      :semesterIdx="semesterIdx"
      :semesterName="semesterName"
      :unreadCount="unreadCount"
      @semesterChange="onSemesterChange"
      @notifications="goNotifications"
    />

    <!-- 班级切换 -->
    <ClassSwitcher
      :classList="classList"
      :currentClassIdx="currentClassIdx"
      @classChange="currentClassIdx = $event"
    />

    <!-- 搜索栏 -->
    <SearchBar
      :searchQuery="searchQuery"
      :searchResults="searchResults"
      @update:searchQuery="searchQuery = $event"
      @search="doSearch"
      @goStudent="goStudent"
      @goCrud="goCrud"
    />

    <!-- 快捷操作 -->
    <QuickActions @goPage="goPage" />

    <!-- 学校公告 -->
    <view class="card school-notice card-glow-warm" v-if="schoolNotices.length">
      <view class="card-h press-feedback" @click="goPage('/pages/community/notifications')">
        <view class="notice-title-row">
          <view class="notice-ic pulse-glow">🏫</view>
          <text class="ch-t">学校公告</text>
          <text class="unread-badge pulse-dot">{{ schoolNotices.length }}</text>
        </view>
        <text class="ch-m">全部 ›</text>
      </view>
      <view v-for="(n, i) in schoolNotices" :key="n.id" class="li col bord slide-in" :style="{ '--i': i }">
        <text class="li-t">{{ n.title }}</text>
        <text class="li-s clamp">{{ n.content }}</text>
      </view>
    </view>

    <!-- 统计卡 -->
    <StatsOverview
      :loading="loading"
      :classList="classList"
      :studentList="studentList"
      :noteList="noteList"
      :gradeList="gradeList"
      @goCrud="goCrud"
      @goPage="goPage"
    />

    <!-- 今日教学实时指标 -->
    <TodayStatsCard
      :loading="loading"
      :todayStats="todayStats"
    />

    <!-- 班级人数分布 -->
    <ClassDistribution
      :loading="loading"
      :studentList="studentList"
      :classDist="classDist"
    />

    <!-- 班级工作台 -->
    <ClassDashboard
      :weekAttRate="weekAttRate"
      :pendingBySubject="pendingBySubject"
      :weekBehaviorCount="weekBehaviorCount"
      :gradeList="gradeList"
      @goCrud="goCrud"
    />

    <!-- 出勤趋势 -->
    <AttendanceTrendChart :weekTrend="weekTrend" />

    <!-- AI 教务助手 -->
    <AiAssistant />

    <!-- 今日课程 -->
    <TodaySchedule :todayLessons="todayLessons" :todayDow="todayDow" @goCrud="goCrud" />

    <!-- 今日待办 -->
    <TodayTodos
      :todayTodos="todayTodos"
      :doneCount="doneCount"
      @toggleTodo="toggleTodo"
      @delTodo="delTodo"
      @refreshTodos="todoList.push($event)"
    />

    <!-- 最近笔记 -->
    <RecentNotes :recentNotes="recentNotes" @goCrud="goCrud" />

    <!-- 班级公告 -->
    <PinnedNotices :pinnedNotices="pinnedNotices" @goCrud="goCrud" />

    <!-- 本周生日 -->
    <BirthdaySection :weekBirthdays="weekBirthdays" @genBirthdayCard="genBirthdayCard" />

    <!-- 课堂神器 -->
    <WidgetPicker @goWidget="goWidget" />

    <!-- 功能入口 -->
    <FeatureGrid @go="go" />

    <!-- 底部安全区留白 -->
    <view class="page-footer"></view>

    <!-- 回到顶部 -->
    <view class="fab-top press-feedback" :class="showBackTop && 'show'" @click="scrollToTop" v-if="showBackTop">
      <text class="fab-icon">↑</text>
    </view>
  </view>
</template>

<script setup>
import { ref, computed } from 'vue'
import { auth, theme, flushTabBarStyle } from '../../common/store'
import { copyText } from '../../common/print'

// 组件导入
import WelcomeHeader from './components/WelcomeHeader.vue'
import ClassSwitcher from './components/ClassSwitcher.vue'
import SearchBar from './components/SearchBar.vue'
import QuickActions from './components/QuickActions.vue'
import StatsOverview from './components/StatsOverview.vue'
import TodayStatsCard from './components/TodayStatsCard.vue'
import ClassDistribution from './components/ClassDistribution.vue'
import ClassDashboard from './components/ClassDashboard.vue'
import AttendanceTrendChart from './components/AttendanceTrendChart.vue'
import AiAssistant from './components/AiAssistant.vue'
import TodaySchedule from './components/TodaySchedule.vue'
import TodayTodos from './components/TodayTodos.vue'
import RecentNotes from './components/RecentNotes.vue'
import PinnedNotices from './components/PinnedNotices.vue'
import BirthdaySection from './components/BirthdaySection.vue'
import WidgetPicker from './components/WidgetPicker.vue'
import FeatureGrid from './components/FeatureGrid.vue'

// 数据层
import { useDashboard } from './composables/useDashboard'

const {
  loading, classList, currentClassIdx, currentClass, studentList, noteList, gradeList,
  todoList, todayLessons, noticeList, schoolNotices, attendanceList, homeworkList,
  behaviorList, semesterName, semesterList, semesterIdx, unreadCount, searchQuery, searchResults,
  classDist, todayStats, recentNotes, pinnedNotices, todayTodos, doneCount,
  weekBirthdays, weekAttRate, pendingBySubject, weekBehaviorCount, weekTrend,
  loadSemester, onSemesterChange, doSearch, loadNotifications, loadAll,
  registerLifecycle, loadPrimaryDashboard, loadSecondaryDashboard,
} = useDashboard()

// 注册生命周期
registerLifecycle()

// 回到顶部
const showBackTop = ref(false)
const SCROLL_THRESHOLD = 300

function onPageScroll(e) {
  showBackTop.value = e.scrollTop > SCROLL_THRESHOLD
}
function scrollToTop() {
  uni.pageScrollTo({ scrollTop: 0, duration: 300 })
}

// 导航函数
function go(f) {
  if (f.tab) uni.switchTab({ url: f.path })
  else uni.navigateTo({ url: f.path })
}
function goPage(url) { uni.navigateTo({ url }) }
function goCrud(type) {
  const MAP = { classes: '/pages/classes/classes', students: '/pages/students/students' }
  const url = MAP[type]
  if (url) uni.switchTab({ url })
  else uni.navigateTo({ url: '/pages/crud/crud?type=' + encodeURIComponent(type) })
}
function goStudent(s) { goPage('/pages/students/students?classId=' + s.classId) }
function goWidget(w) { uni.navigateTo({ url: w.path }) }
function goNotifications() { uni.navigateTo({ url: '/pages/community/notifications' }) }

// 待办交互
import { updateTodo, deleteTodo } from '@/api/dashboard'
async function toggleTodo(t) {
  t.done = !t.done
  try { await updateTodo(t.id, { done: t.done }) }
  catch (e) {
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
      try { await deleteTodo(t.id); todoList.value = todoList.value.filter((x) => x.id !== t.id) }
      catch (e) { uni.showToast({ title: '删除失败', icon: 'none' }) }
    },
  })
}

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
</script>

<style scoped>
/* ===================== 页面容器 ===================== */
.page {
  padding: 24rpx 24rpx 0;
  background: var(--c-bg);
  min-height: 100vh;
  box-sizing: border-box;
  position: relative;
  overflow-x: hidden;
}

/* 页面环境光斑——左上角暖色氛围感 */
.page::before {
  content: '';
  position: fixed;
  top: -200rpx;
  left: -100rpx;
  width: 600rpx;
  height: 600rpx;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(245, 179, 66, 0.12) 0%, transparent 70%);
  pointer-events: none;
  z-index: 0;
}
.page::after {
  content: '';
  position: fixed;
  bottom: 10%;
  right: -150rpx;
  width: 500rpx;
  height: 500rpx;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(201, 67, 109, 0.06) 0%, transparent 70%);
  pointer-events: none;
  z-index: 0;
}

/* 暗色模式环境光 */
.dark .page::before {
  background: radial-gradient(circle, rgba(255, 206, 84, 0.06) 0%, transparent 70%);
}
.dark .page::after {
  background: radial-gradient(circle, rgba(224, 108, 138, 0.04) 0%, transparent 70%);
}

/* ===================== 通用卡片 ===================== */
.card {
  margin-top: 18rpx;
  background: var(--c-card);
  border-radius: var(--r-lg);
  padding: 24rpx;
  box-shadow: var(--c-shadow-paper);
  position: relative;
  overflow: hidden;
  transition: box-shadow 0.25s, transform 0.25s;
}
.card:active {
  box-shadow: 0 6rpx 16rpx var(--c-shadow);
}

/* 卡片顶部高光——暖色系 */
.card-glow-warm::before {
  content: '';
  position: absolute;
  top: 0;
  left: 12%;
  right: 12%;
  height: 2rpx;
  background: linear-gradient(90deg, transparent, rgba(230, 162, 60, 0.45), transparent);
}

/* ===================== 学校公告 ===================== */
.school-notice {
  background: linear-gradient(135deg, var(--c-card) 0%, #fef9f0 60%, #fff3e0 100%);
  border-radius: var(--r-lg);
  position: relative;
  overflow: hidden;
  margin-top: 18rpx;
  border: 1rpx solid rgba(230, 162, 60, 0.08);
}
/* 装饰性光晕——右下 */
.school-notice::after {
  content: '';
  position: absolute;
  bottom: -60rpx;
  right: -40rpx;
  width: 200rpx;
  height: 200rpx;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(245, 179, 66, 0.08) 0%, transparent 70%);
  pointer-events: none;
}
.card-h {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 14rpx;
}
.notice-title-row {
  display: flex;
  align-items: center;
  gap: 12rpx;
}
.notice-ic {
  width: 48rpx;
  height: 48rpx;
  border-radius: 14rpx;
  background: linear-gradient(135deg, #fff3d6, #ffe0a0);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24rpx;
  box-shadow: 0 2rpx 8rpx rgba(230, 162, 60, 0.2);
}
.pulse-glow {
  animation: glow-pulse 2.5s ease-in-out infinite;
}
@keyframes glow-pulse {
  0%, 100% { box-shadow: 0 2rpx 8rpx rgba(230, 162, 60, 0.2); }
  50% { box-shadow: 0 2rpx 18rpx rgba(230, 162, 60, 0.4); }
}
.ch-t {
  font-size: 28rpx;
  font-weight: 700;
  color: var(--c-title);
  letter-spacing: 0.5rpx;
}
.ch-m {
  font-size: 22rpx;
  color: var(--c-sub);
}
.li {
  display: flex;
  align-items: center;
  padding: 16rpx 0;
  border-bottom: 1rpx solid var(--c-border);
  font-size: 26rpx;
}
.li:last-child {
  border-bottom: none;
}
.li.col {
  flex-direction: column;
  align-items: stretch;
}
.li-t {
  flex: 1;
  color: var(--c-title);
  font-weight: 600;
  line-height: 1.4;
}
.li-s {
  color: var(--c-sub);
  font-size: 22rpx;
  margin-left: 16rpx;
  flex-shrink: 0;
}
.clamp {
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  margin-left: 0;
  margin-top: 4rpx;
}
.bord {
  border-left: 6rpx solid var(--c-primary);
  padding-left: 16rpx;
  border-radius: 0 8rpx 8rpx 0;
  background: rgba(245, 179, 66, 0.03);
  padding-top: 12rpx;
  padding-bottom: 12rpx;
  padding-right: 12rpx;
  margin-bottom: 4rpx;
}
.unread-badge {
  display: inline-block;
  font-size: 18rpx;
  color: #fff;
  background: linear-gradient(135deg, #f56c6c, #e06c75);
  border-radius: 20rpx;
  padding: 0 12rpx;
  margin-left: 6rpx;
  font-weight: 600;
  vertical-align: middle;
  line-height: 28rpx;
  box-shadow: 0 2rpx 6rpx rgba(245, 108, 108, 0.3);
}

/* ===================== 动画 ===================== */
.slide-in {
  animation: slide-right 0.45s cubic-bezier(0.22, 1, 0.36, 1) both;
  animation-delay: calc(var(--i, 0) * 0.07s);
}
@keyframes slide-right {
  from { opacity: 0; transform: translateX(-24rpx); }
  to   { opacity: 1; transform: translateX(0); }
}

.press-feedback {
  transition: transform 0.18s cubic-bezier(0.34, 1.56, 0.64, 1), opacity 0.15s;
}
.press-feedback:active {
  transform: scale(0.97);
  opacity: 0.92;
}

.pulse-dot {
  position: relative;
}
.pulse-dot::before {
  content: '';
  position: absolute;
  inset: -4rpx;
  border-radius: 50%;
  background: rgba(230, 67, 64, 0.25);
  animation: pulse-ring 1.8s ease-out infinite;
  z-index: -1;
}
@keyframes pulse-ring {
  0%   { transform: scale(1); opacity: 0.7; }
  100% { transform: scale(2); opacity: 0; }
}

/* ===================== 回到顶部 FAB ===================== */
.fab-top {
  position: fixed;
  right: 28rpx;
  bottom: calc(80rpx + env(safe-area-inset-bottom));
  width: 80rpx;
  height: 80rpx;
  border-radius: 50%;
  background: linear-gradient(135deg, var(--c-primary), var(--c-primary-d));
  box-shadow: 0 8rpx 24rpx rgba(214, 148, 38, 0.35), 0 2rpx 8rpx rgba(0,0,0,0.08);
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  transform: translateY(30rpx) scale(0.7);
  transition: all 0.35s cubic-bezier(0.34, 1.56, 0.64, 1);
  z-index: 999;
  pointer-events: none;
}
.fab-top.show {
  opacity: 1;
  transform: translateY(0) scale(1);
  pointer-events: auto;
}
.fab-top:active {
  transform: scale(0.88) translateY(0);
  box-shadow: 0 4rpx 12rpx rgba(214, 148, 38, 0.3);
}
.fab-icon {
  color: #fff;
  font-size: 36rpx;
  font-weight: 700;
  text-shadow: 0 1rpx 2rpx rgba(0,0,0,0.1);
}

/* ===================== 底部安全区 ===================== */
.page-footer {
  height: calc(40rpx + env(safe-area-inset-bottom));
  width: 100%;
}

/* ===================== 暗色模式覆盖 ===================== */
.dark .school-notice {
  background: linear-gradient(135deg, var(--c-card) 0%, #2a2620 60%, #2e2718 100%);
  border-color: rgba(255, 206, 84, 0.08);
}
.dark .school-notice::after {
  background: radial-gradient(circle, rgba(255, 206, 84, 0.05) 0%, transparent 70%);
}
.dark .bord {
  background: rgba(255, 206, 84, 0.04);
  border-left-color: var(--c-primary);
}
.dark .notice-ic {
  background: linear-gradient(135deg, #4a3c20, #5a4820);
}
.dark .card {
  border: 1rpx solid rgba(255, 255, 255, 0.03);
}
.dark .fab-top {
  box-shadow: 0 8rpx 24rpx rgba(0, 0, 0, 0.4), 0 2rpx 8rpx rgba(0,0,0,0.2);
}

/* ===================== 微交互增强：晃动反馈 ===================== */
@keyframes gentle-shake {
  0%, 100% { transform: rotate(0deg); }
  20% { transform: rotate(3deg); }
  40% { transform: rotate(-2deg); }
  60% { transform: rotate(1deg); }
  80% { transform: rotate(-1deg); }
}

/* ===================== 微交互增强：悬浮弹跳 ===================== */
@keyframes hover-bounce {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-3rpx); }
}
</style>
