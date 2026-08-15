<template>
  <view class="page" :class="{ dark: theme.mode === 'dark' }">
    <view class="tabs">
      <view class="tab" :class="{ on: tab === 'mine' }" @click="tab = 'mine'">我的作品</view>
      <view class="tab" :class="{ on: tab === 'challenges' }" @click="switchTab('challenges')">任务卡</view>
      <view class="tab" :class="{ on: tab === 'gallery' }" @click="switchTab('gallery')">作品墙</view>
      <view class="tab" :class="{ on: tab === 'report' }" @click="switchTab('report')">周报</view>
    </view>

    <!-- 我的作品 -->
    <block v-if="tab === 'mine'">
      <view v-for="p in mine" :key="p.id" class="card">
        <view class="c-top">
          <text class="c-title">{{ p.title }}</text>
          <text class="c-tag" :class="{ on: p.submitted }">{{ p.submitted ? '已提交' : '草稿' }}</text>
        </view>
        <text class="c-meta">积木数：{{ (p.blocks || []).length }} · 更新：{{ p.updatedAt ? p.updatedAt.slice(0, 10) : '—' }}</text>
        <view class="c-btns">
          <text v-if="!p.submitted" class="c-btn" @click="submitMine(p)">提交作业</text>
          <text class="c-btn danger" @click="delMine(p)">删除</text>
          <text v-if="p.submitted" class="c-btn info" @click="viewReview(p)">查看点评</text>
        </view>
      </view>
      <EmptyState v-if="!mine.length" icon="🧩" text="还没有练习作品" hint="在电脑端用积木编辑器创作，或查看老师发布的任务卡" />
    </block>

    <!-- 任务卡 -->
    <block v-if="tab === 'challenges'">
      <view v-for="c in challenges" :key="c.id" class="card">
        <view class="c-top">
          <text class="c-title">{{ c.title }}</text>
        </view>
        <text class="c-goal" v-if="c.goal">{{ c.goal }}</text>
        <text class="c-meta">起始积木：{{ (c.starterBlocks || []).length }} 块</text>
      </view>
      <EmptyState v-if="!challenges.length" icon="📋" text="老师暂未发布任务卡" />
    </block>

    <!-- 作品墙 -->
    <block v-if="tab === 'gallery'">
      <view v-for="g in gallery" :key="g.id" class="card">
        <view class="c-top">
          <text class="c-title">{{ g.title }}</text>
          <text class="c-meta">{{ g.studentName || g.teacherName || '' }}</text>
        </view>
        <text class="c-meta">积木数：{{ (g.blocks || []).length }}</text>
      </view>
      <EmptyState v-if="!gallery.length" icon="🖼️" text="作品墙暂无作品" />
    </block>

    <!-- 周报 + 徽章 -->
    <block v-if="tab === 'report'">
      <view class="bar">
        <text class="tbtn" @click="pushReport">📨 推送周报到消息中心</text>
      </view>
      <view class="grid2" v-if="report">
        <view class="stat"><text class="s-v">{{ report.practiceTotal || 0 }}</text><text class="s-l">练习作品</text></view>
        <view class="stat"><text class="s-v">{{ report.submittedTotal || 0 }}</text><text class="s-l">提交作业</text></view>
        <view class="stat"><text class="s-v">{{ report.reviewsTotal || 0 }}</text><text class="s-l">获评次数</text></view>
        <view class="stat"><text class="s-v">{{ report.avgRating || 0 }}</text><text class="s-l">平均星级</text></view>
        <view class="stat"><text class="s-v">{{ report.totalBlocks || 0 }}</text><text class="s-l">积木总数</text></view>
        <view class="stat"><text class="s-v">{{ report.challengesAvailable || 0 }}</text><text class="s-l">可接任务</text></view>
      </view>
      <text class="rep-range" v-if="report">统计区间：{{ report.weekStart ? report.weekStart.slice(0, 10) : '—' }} 起</text>

      <view class="sec-t">成就徽章</view>
      <view class="badges">
        <view v-for="b in badges" :key="b.type" class="badge" :class="{ off: !b.earned }">
          <text class="b-ic">{{ b.icon }}</text>
          <text class="b-lb">{{ b.label }}</text>
          <text class="b-st">{{ b.earned ? '已获得' : '未获得' }}</text>
        </view>
      </view>
      <EmptyState v-if="!report" icon="📊" text="本周暂无学习数据" />
    </block>

    <!-- 点评弹层 -->
    <view v-if="showReview" class="mask" @click="showReview = false">
      <view class="sheet" @click.stop>
        <view class="sh-t">教师点评</view>
        <view class="stars">
          <text v-for="n in 5" :key="n" class="star" :class="{ on: (curReview?.rating || 0) >= n }">★</text>
        </view>
        <view class="rev-text">{{ curReview?.comment || '老师还没有写评语' }}</view>
        <button class="btn ok" @click="showReview = false">知道了</button>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import {
  listMyPracticeProjects, submitPracticeProject, removePracticeProject, getPracticeReview,
  listChallenges, listGallery, getWeeklyReport, getBadges, pushWeeklyReport,
} from '@/api/kids-coding'
import { theme } from '../../common/store'

const tab = ref('mine')
const mine = ref([])
const challenges = ref([])
const gallery = ref([])
const report = ref(null)
const badges = ref([])
const showReview = ref(false)
const curReview = ref(null)

async function load() {
  await loadMine()
  if (tab.value === 'challenges') await loadChallenges()
  if (tab.value === 'gallery') await loadGallery()
  if (tab.value === 'report') await loadReport()
}
async function loadMine() {
  try { mine.value = (await listMyPracticeProjects()) || [] } catch (e) { mine.value = [] }
}
async function loadChallenges() {
  try { challenges.value = (await listChallenges()) || [] } catch (e) { challenges.value = [] }
}
async function loadGallery() {
  try { gallery.value = (await listGallery()) || [] } catch (e) { gallery.value = [] }
}
async function loadReport() {
  try {
    report.value = await getWeeklyReport()
    badges.value = (await getBadges()) || []
  } catch (e) {
    report.value = null
    badges.value = []
  }
}
function switchTab(t) {
  tab.value = t
  if (t === 'challenges') loadChallenges()
  if (t === 'gallery') loadGallery()
  if (t === 'report') loadReport()
}
async function submitMine(p) {
  try {
    await submitPracticeProject(p.id)
    uni.showToast({ title: '已提交作业', icon: 'success' })
    await loadMine()
  } catch (e) {
    uni.showToast({ title: '提交失败：' + (e.message || ''), icon: 'none' })
  }
}
async function delMine(p) {
  uni.showModal({
    title: '删除作品',
    content: '确定删除「' + p.title + '」？',
    success: async (m) => {
      if (!m.confirm) return
      try {
        await removePracticeProject(p.id)
        uni.showToast({ title: '已删除', icon: 'none' })
        await loadMine()
      } catch (e) {
        uni.showToast({ title: '删除失败', icon: 'none' })
      }
    },
  })
}
async function viewReview(p) {
  try {
    curReview.value = await getPracticeReview(p.id)
  } catch (e) {
    curReview.value = { comment: '', rating: 0 }
  }
  showReview.value = true
}
async function pushReport() {
  try {
    const r = await pushWeeklyReport()
    if (r && r.pushed) uni.showToast({ title: '已推送到消息中心', icon: 'success' })
    else uni.showToast({ title: (r && r.reason) || '本周暂无数据可推送', icon: 'none' })
  } catch (e) {
    uni.showToast({ title: '推送失败：' + (e.message || ''), icon: 'none' })
  }
}
onShow(load)
</script>

<style scoped>
.page { padding: 24rpx; }
.tabs { display: flex; gap: 10rpx; margin-bottom: 16rpx; }
.tab { flex: 1; text-align: center; padding: 16rpx 0; border-radius: 16rpx; font-size: 26rpx; background: var(--c-card); color: var(--c-sub); border: 1px solid var(--c-border); }
.tab.on { background: linear-gradient(135deg, #ffb347 0%, #ffcc66 100%); color: #5a3e1b; font-weight: 700; border-color: transparent; }
.dark .tab { background: var(--c-card); color: var(--c-sub); }
.dark .tab.on { background: linear-gradient(135deg, #2a2f3a 0%, #383f4d 100%); color: #f2f2f2; }
.bar { margin-bottom: 16rpx; }
.tbtn { font-size: 24rpx; color: #fff; background: var(--c-primary); padding: 12rpx 28rpx; border-radius: 30rpx; }
.card { background: var(--c-card); border-radius: 16rpx; padding: 22rpx; margin-bottom: 16rpx; border: 1px solid var(--c-border); }
.c-top { display: flex; justify-content: space-between; align-items: center; }
.c-title { font-size: 30rpx; font-weight: 700; color: var(--c-title); }
.c-tag { font-size: 22rpx; color: #fff; background: #c0c4cc; padding: 4rpx 16rpx; border-radius: 20rpx; }
.c-tag.on { background: #07c160; }
.c-goal { display: block; font-size: 24rpx; color: var(--c-sub); margin: 8rpx 0; line-height: 1.5; }
.c-meta { display: block; font-size: 22rpx; color: var(--c-sub); margin-top: 6rpx; }
.c-btns { display: flex; gap: 14rpx; margin-top: 14rpx; }
.c-btn { font-size: 24rpx; color: #fff; background: var(--c-blue); padding: 10rpx 22rpx; border-radius: 28rpx; }
.c-btn.danger { background: var(--c-danger); }
.c-btn.info { background: var(--c-accent); }
.grid2 { display: flex; flex-wrap: wrap; gap: 14rpx; margin-bottom: 12rpx; }
.stat { width: calc(50% - 7rpx); background: var(--c-card2); border-radius: 14rpx; padding: 22rpx; display: flex; flex-direction: column; align-items: center; }
.s-v { font-size: 40rpx; font-weight: 800; color: var(--c-primary); }
.s-l { font-size: 22rpx; color: var(--c-sub); margin-top: 4rpx; }
.rep-range { display: block; font-size: 22rpx; color: var(--c-sub); margin-bottom: 16rpx; }
.sec-t { font-size: 28rpx; font-weight: 700; color: var(--c-title); margin: 16rpx 0 12rpx; }
.badges { display: flex; flex-wrap: wrap; gap: 14rpx; }
.badge { width: calc(50% - 7rpx); background: var(--c-card); border: 1px solid var(--c-border); border-radius: 14rpx; padding: 18rpx; text-align: center; }
.badge.off { opacity: .5; }
.b-ic { display: block; font-size: 44rpx; }
.b-lb { display: block; font-size: 24rpx; color: var(--c-title); margin: 6rpx 0 2rpx; }
.b-st { display: block; font-size: 20rpx; color: var(--c-sub); }
.mask { position: fixed; inset: 0; background: rgba(0,0,0,.4); display: flex; align-items: center; justify-content: center; z-index: 50; }
.sheet { width: 80%; background: var(--c-card); border-radius: 20rpx; padding: 36rpx; box-sizing: border-box; }
.sh-t { font-size: 30rpx; font-weight: 700; color: var(--c-title); margin-bottom: 20rpx; text-align: center; }
.stars { text-align: center; margin-bottom: 16rpx; }
.star { font-size: 48rpx; color: #d9d9d9; }
.star.on { color: #f5b342; }
.rev-text { font-size: 28rpx; color: var(--c-sub); line-height: 1.6; text-align: center; min-height: 80rpx; }
.btn { width: 100%; border-radius: 50rpx; color: #fff; font-size: 28rpx; }
.btn.ok { background: var(--c-primary); }
.dark .page { background: var(--c-bg); }
.dark .card, .dark .stat, .dark .badge, .dark .sheet { background: var(--c-card); }
.dark .stat { background: var(--c-card2); }
.dark .s-v { color: var(--c-primary); }
.dark .inp, .dark .picker.sm { border-color: var(--c-input-border); background: var(--c-input); color: var(--c-text); }
</style>
