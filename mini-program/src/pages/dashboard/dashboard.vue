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
    <view class="card school-notice" v-if="schoolNotices.length">
      <view class="card-h press-feedback" @click="goPage('/pages/community/notifications')">
        <view class="notice-title-row">
          <view class="notice-ic">🏫</view>
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

    <!-- 回到顶部 -->
    <view class="fab-top" :class="showBackTop && 'show'" @click="scrollToTop" v-if="showBackTop">
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
.page { padding: 30rpx; background: var(--c-bg); min-height: 100vh; box-sizing: border-box; }
.card { margin-top: 20rpx; background: var(--c-card); border-radius: 20rpx; padding: 24rpx; box-shadow: 0 2rpx 10rpx var(--c-shadow); }
.school-notice { background: linear-gradient(135deg, var(--c-card) 0%, #fff8f0 100%); border-radius: 24rpx; position: relative; overflow: hidden; }
.school-notice::before { content: ''; position: absolute; top: 0; left: 15%; right: 15%; height: 2rpx; background: linear-gradient(90deg, transparent, rgba(230,162,60,0.4), transparent); }
.card-h { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12rpx; }
.notice-title-row { display: flex; align-items: center; gap: 12rpx; }
.notice-ic { width: 44rpx; height: 44rpx; border-radius: 12rpx; background: linear-gradient(135deg, #fff3d6, #ffe0a0); display: flex; align-items: center; justify-content: center; font-size: 24rpx; }
.ch-t { font-size: 28rpx; font-weight: 700; color: var(--c-title); }
.ch-m { font-size: 22rpx; color: var(--c-sub); }
.li { display: flex; align-items: center; padding: 14rpx 0; border-bottom: 1px solid var(--c-border); font-size: 26rpx; }
.li:last-child { border-bottom: none; }
.li.col { flex-direction: column; align-items: stretch; }
.li-t { flex: 1; color: var(--c-title); font-weight: 600; }
.li-s { color: var(--c-sub); font-size: 22rpx; margin-left: 16rpx; flex-shrink: 0; }
.clamp { display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.bord { border-left: 6rpx solid var(--c-accent); padding-left: 14rpx; }
.unread-badge { display: inline-block; font-size: 18rpx; color: #fff; background: linear-gradient(135deg, #f56c6c, #e06c75); border-radius: 20rpx; padding: 0 12rpx; margin-left: 6rpx; font-weight: 400; vertical-align: middle; line-height: 28rpx; }
.slide-in { animation: slide-right 0.4s ease-out both; animation-delay: calc(var(--i, 0) * 0.08s); }
.press-feedback { transition: transform 0.15s; }
.press-feedback:active { transform: scale(0.98); }
.pulse-dot { position: relative; }
.pulse-dot::before { content: ''; position: absolute; inset: -4rpx; border-radius: 50%; background: rgba(230,67,64,0.3); animation: pulse-ring 1.5s ease-out infinite; z-index: -1; }
@keyframes slide-right { from { opacity: 0; transform: translateX(-20rpx); } to { opacity: 1; transform: translateX(0); } }
@keyframes pulse-ring { 0% { transform: scale(1); opacity: 1; } 100% { transform: scale(1.8); opacity: 0; } }

/* 回到顶部 */
.fab-top {
  position: fixed;
  right: 30rpx;
  bottom: calc(60rpx + env(safe-area-inset-bottom));
  width: 80rpx;
  height: 80rpx;
  border-radius: 50%;
  background: linear-gradient(135deg, #f5b342, #d69426);
  box-shadow: 0 8rpx 24rpx rgba(214, 148, 38, 0.4);
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  transform: translateY(20rpx) scale(0.8);
  transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
  z-index: 999;
}
.fab-top.show {
  opacity: 1;
  transform: translateY(0) scale(1);
}
.fab-top:active {
  transform: scale(0.9);
}
.fab-icon {
  color: #fff;
  font-size: 36rpx;
  font-weight: 700;
}
</style>
