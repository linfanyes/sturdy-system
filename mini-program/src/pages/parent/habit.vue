<script setup>
import { ref } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { myChallenges, createChallenge, checkin } from '../../api/habit'

const tab = ref('my')
const list = ref([])
const loading = ref(false)

const type = ref('reading')
const title = ref('')
const targetDays = ref(21)
const submitting = ref(false)

const TYPE_LABEL = { reading: '阅读', sport: '运动', early_sleep: '早睡', other: '其他' }

async function load() {
  loading.value = true
  try {
    list.value = await myChallenges()
  } catch (e) {
    uni.showToast({ title: '加载失败', icon: 'none' })
  } finally {
    loading.value = false
  }
}

onShow(() => { if (tab.value === 'my') load() })

async function doCheckin(c) {
  try {
    await checkin({ challengeId: c.id, note: null })
    uni.showToast({ title: '打卡成功 +1', icon: 'success' })
    load()
  } catch (e) {
    uni.showToast({ title: '打卡失败', icon: 'none' })
  }
}

async function submit() {
  if (!title.value.trim()) {
    uni.showToast({ title: '请填写挑战名称', icon: 'none' })
    return
  }
  submitting.value = true
  try {
    await createChallenge({
      type: type.value,
      title: title.value.trim(),
      targetDays: Number(targetDays.value) || 21,
    })
    uni.showToast({ title: '挑战已发起', icon: 'success' })
    title.value = ''
    tab.value = 'my'
    load()
  } catch (e) {
    uni.showToast({ title: '发起失败', icon: 'none' })
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <view class="page">
    <view class="head">
      <text class="title">🔥 21 天习惯养成</text>
      <text class="sub">每天一点点，好习惯自然来</text>
    </view>

    <view class="tabs">
      <view class="tab" :class="{ on: tab === 'my' }" @click="tab = 'my'; load()">我的挑战</view>
      <view class="tab" :class="{ on: tab === 'create' }" @click="tab = 'create'">发起挑战</view>
    </view>

    <view v-if="tab === 'my'" class="list">
      <view v-if="!list.length" class="empty">还没有挑战，去「发起挑战」开启第一步吧～</view>
      <view v-for="c in list" :key="c.id" class="card">
        <view class="row">
          <text class="name">{{ c.title }}</text>
          <text class="tag">{{ TYPE_LABEL[c.type] }}</text>
        </view>
        <view class="bar">
          <view class="fill" :style="{ width: c.progress + '%' }"></view>
        </view>
        <view class="meta">
          <text>连续 {{ c.streak }} 天</text>
          <text>累计 {{ c.totalCheckins }} / {{ c.targetDays }} 天</text>
        </view>
        <button class="btn" @click="doCheckin(c)">今日打卡</button>
      </view>
    </view>

    <view v-else class="card">
      <text class="label">类型</text>
      <view class="opts">
        <view class="opt" :class="{ on: type === 'reading' }" @click="type = 'reading'">阅读</view>
        <view class="opt" :class="{ on: type === 'sport' }" @click="type = 'sport'">运动</view>
        <view class="opt" :class="{ on: type === 'early_sleep' }" @click="type = 'early_sleep'">早睡</view>
        <view class="opt" :class="{ on: type === 'other' }" @click="type = 'other'">其他</view>
      </view>
      <text class="label">挑战名称</text>
      <input v-model="title" class="inp" placeholder="如：每天阅读 20 分钟" />
      <text class="label">目标天数</text>
      <input v-model="targetDays" type="number" class="inp" />
      <button class="btn" :disabled="submitting" @click="submit">{{ submitting ? '发起中…' : '发起挑战' }}</button>
    </view>
  </view>
</template>

<style scoped>
.page { padding: 24rpx 28rpx; background: #f7f8fa; min-height: 100vh; }
.head { margin-bottom: 20rpx; }
.title { font-size: 38rpx; font-weight: 700; color: #1f2937; }
.sub { display: block; margin-top: 6rpx; font-size: 24rpx; color: #6b7280; }
.tabs { display: flex; gap: 16rpx; margin-bottom: 20rpx; }
.tab { flex: 1; text-align: center; padding: 18rpx 0; border-radius: 16rpx; background: #fff; font-size: 28rpx; color: #6b7280; }
.tab.on { background: #f97316; color: #fff; font-weight: 600; }
.list { display: flex; flex-direction: column; gap: 16rpx; }
.empty { text-align: center; color: #9ca3af; font-size: 26rpx; padding: 60rpx 0; }
.card { background: #fff; border-radius: 20rpx; padding: 28rpx; }
.row { display: flex; align-items: center; justify-content: space-between; }
.name { font-size: 30rpx; font-weight: 600; color: #1f2937; }
.tag { font-size: 22rpx; color: #f97316; background: #fff7ed; padding: 4rpx 14rpx; border-radius: 999rpx; }
.bar { height: 16rpx; background: #f3f4f6; border-radius: 999rpx; margin: 16rpx 0 10rpx; overflow: hidden; }
.fill { height: 100%; background: linear-gradient(90deg, #fb923c, #f97316); border-radius: 999rpx; }
.meta { display: flex; justify-content: space-between; font-size: 22rpx; color: #6b7280; }
.btn { margin-top: 18rpx; background: #f97316; color: #fff; border-radius: 14rpx; font-size: 30rpx; }
.label { display: block; font-size: 26rpx; color: #374151; margin: 18rpx 0 10rpx; }
.opts { display: flex; flex-wrap: wrap; gap: 14rpx; }
.opt { padding: 14rpx 28rpx; border-radius: 999rpx; font-size: 26rpx; color: #6b7280; background: #f3f4f6; }
.opt.on { background: #f97316; color: #fff; }
.inp { width: 100%; background: #f9fafb; border-radius: 14rpx; padding: 18rpx; font-size: 26rpx; box-sizing: border-box; }
</style>
