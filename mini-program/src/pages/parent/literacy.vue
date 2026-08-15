<script setup>
import { ref } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { listLessons, complete, myBadges } from '../../api/literacy'

const tab = ref('lessons')
const cat = ref('')
const lessons = ref([])
const badges = ref([])
const CAT_LABEL = { digital_literacy: '数字素养', online_safety: '网络安全', career: '生涯启蒙' }
const CAT_COLOR = { digital_literacy: '#0ea5e9', online_safety: '#f43f5e', career: '#8b5cf6' }

async function loadLessons() {
  lessons.value = await listLessons(cat.value || undefined)
}
async function loadBadges() {
  badges.value = await myBadges()
}
onShow(() => { if (tab.value === 'lessons') loadLessons(); else loadBadges() })

function switchTab(t) {
  tab.value = t
  if (t === 'lessons') loadLessons()
  else loadBadges()
}
function pickCat(c) {
  cat.value = cat.value === c ? '' : c
  loadLessons()
}

async function finish(l) {
  try {
    await complete(l.id)
    uni.showToast({ title: '获得徽章 🏅', icon: 'success' })
    loadLessons()
  } catch (e) {
    uni.showToast({ title: '操作失败', icon: 'none' })
  }
}
</script>

<template>
  <view class="page">
    <view class="head">
      <text class="title">📚 数字素养 · 生涯启蒙</text>
      <text class="sub">陪孩子一起学安全上网，点亮成长徽章</text>
    </view>

    <view class="tabs">
      <view class="tab" :class="{ on: tab === 'lessons' }" @click="switchTab('lessons')">微课学习</view>
      <view class="tab" :class="{ on: tab === 'badges' }" @click="switchTab('badges')">我的徽章</view>
    </view>

    <view v-if="tab === 'lessons'" class="list">
      <view class="cats">
        <view class="cat" :class="{ on: !cat }" @click="pickCat('')">全部</view>
        <view class="cat" :class="{ on: cat === 'digital_literacy' }" @click="pickCat('digital_literacy')">数字素养</view>
        <view class="cat" :class="{ on: cat === 'online_safety' }" @click="pickCat('online_safety')">网络安全</view>
        <view class="cat" :class="{ on: cat === 'career' }" @click="pickCat('career')">生涯启蒙</view>
      </view>
      <view v-for="l in lessons" :key="l.id" class="card">
        <view class="row">
          <text class="tag" :style="{ background: (CAT_COLOR[l.category] || '#6b7280') + '22', color: CAT_COLOR[l.category] || '#6b7280' }">{{ CAT_LABEL[l.category] || l.category }}</text>
          <text class="dur">约 {{ l.duration }} 分钟</text>
        </view>
        <text class="ltitle">{{ l.title }}</text>
        <text class="lcontent">{{ l.content }}</text>
        <button class="btn" @click="finish(l)">学完 · 领徽章</button>
      </view>
    </view>

    <view v-else class="list">
      <view v-if="!badges.length" class="empty">还没有徽章，去「微课学习」完成第一课吧～</view>
      <view v-for="b in badges" :key="b.id" class="card row2">
        <text class="medal">🏅</text>
        <view class="info">
          <text class="ltitle">{{ b.lesson?.title || '微课' }}</text>
          <text class="lcontent">完成于 {{ b.completedAt }}</text>
        </view>
      </view>
    </view>
  </view>
</template>

<style scoped>
.page { padding: 24rpx 28rpx; background: #f7f8fa; min-height: 100vh; }
.head { margin-bottom: 20rpx; }
.title { font-size: 38rpx; font-weight: 700; color: #1f2937; }
.sub { display: block; margin-top: 6rpx; font-size: 24rpx; color: #6b7280; }
.tabs { display: flex; gap: 16rpx; margin-bottom: 16rpx; }
.tab { flex: 1; text-align: center; padding: 18rpx 0; border-radius: 16rpx; background: #fff; font-size: 28rpx; color: #6b7280; }
.tab.on { background: #8b5cf6; color: #fff; font-weight: 600; }
.cats { display: flex; gap: 12rpx; margin-bottom: 16rpx; flex-wrap: wrap; }
.cat { padding: 10rpx 22rpx; border-radius: 999rpx; font-size: 24rpx; color: #6b7280; background: #fff; }
.cat.on { background: #8b5cf6; color: #fff; }
.list { display: flex; flex-direction: column; gap: 16rpx; }
.card { background: #fff; border-radius: 20rpx; padding: 28rpx; }
.row { display: flex; align-items: center; justify-content: space-between; }
.tag { font-size: 22rpx; padding: 4rpx 14rpx; border-radius: 999rpx; }
.dur { font-size: 22rpx; color: #9ca3af; }
.ltitle { display: block; margin-top: 12rpx; font-size: 30rpx; font-weight: 600; color: #1f2937; }
.lcontent { display: block; margin-top: 8rpx; font-size: 26rpx; color: #6b7280; line-height: 1.6; }
.btn { margin-top: 18rpx; background: #8b5cf6; color: #fff; border-radius: 14rpx; font-size: 28rpx; }
.row2 { display: flex; align-items: center; gap: 18rpx; }
.medal { font-size: 48rpx; }
.info { display: flex; flex-direction: column; }
.empty { text-align: center; color: #9ca3af; font-size: 26rpx; padding: 60rpx 0; }
</style>
