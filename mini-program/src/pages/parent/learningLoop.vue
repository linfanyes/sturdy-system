<script setup>
import { ref } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { getLearningPlan, generateExercise, markExerciseDone } from '../../api/learningLoop'

const loading = ref(true)
const plan = ref(null)
const exercises = ref([])
const kp = ref('')
const genLoading = ref(false)

onShow(load)

async function load() {
  loading.value = true
  try {
    const res = await getLearningPlan()
    plan.value = res.plan || null
    exercises.value = res.exercises || []
  } catch (e) {
    uni.showToast({ title: '加载失败', icon: 'none' })
  } finally {
    loading.value = false
  }
}

async function generate() {
  const k = kp.value.trim()
  if (!k) { uni.showToast({ title: '请输入知识点', icon: 'none' }); return }
  genLoading.value = true
  try {
    const ex = await generateExercise(k)
    exercises.value.unshift(ex)
    kp.value = ''
    uni.showToast({ title: '已生成', icon: 'success' })
  } catch (e) {
    uni.showToast({ title: '生成失败', icon: 'none' })
  } finally {
    genLoading.value = false
  }
}

async function done(ex) {
  try {
    await markExerciseDone(ex.id)
    ex.done = true
    uni.showToast({ title: '已掌握', icon: 'success' })
  } catch (e) {
    uni.showToast({ title: '操作失败', icon: 'none' })
  }
}
</script>

<template>
  <view class="page">
    <view class="head">
      <text class="title">🎯 个性化学习闭环</text>
      <text class="sub">薄弱点练习 · 因材施教</text>
    </view>

    <view v-if="loading" class="tip">加载中…</view>

    <block v-else>
      <view class="plan card" v-if="plan && plan.knowledgePoints && plan.knowledgePoints.length">
        <text class="plan-title">本周攻克计划</text>
        <view class="kp-tags">
          <text class="kp" v-for="(k, i) in plan.knowledgePoints" :key="i">{{ k }}</text>
        </view>
        <view class="prog">
          <view class="prog-track"><view class="prog-fill" :style="{ width: (plan.progress || 0) + '%' }"></view></view>
          <text class="prog-val">{{ plan.progress || 0 }}%</text>
        </view>
      </view>

      <view class="gen card">
        <text class="gen-label">生成薄弱点练习</text>
        <view class="gen-bar">
          <input v-model="kp" class="gen-ipt" placeholder="如：分数加减法" />
          <button class="gen-btn" :disabled="genLoading" @click="generate">{{ genLoading ? '生成中' : '生成' }}</button>
        </view>
      </view>

      <view class="ex-list">
        <view class="ex card" v-for="ex in exercises" :key="ex.id" :class="{ done: ex.done }">
          <view class="ex-top">
            <text class="ex-kp">{{ ex.knowledgePoint }}</text>
            <text v-if="ex.done" class="ex-done">已掌握</text>
          </view>
          <view class="ex-q">{{ ex.question }}</view>
          <view v-if="ex.answer" class="ex-a">答案：{{ ex.answer }}</view>
          <button v-if="!ex.done" class="ex-btn" @click="done(ex)">标记掌握</button>
        </view>
        <view v-if="!exercises.length" class="empty">还没有练习，生成一个试试～</view>
      </view>
    </block>
  </view>
</template>

<style scoped>
.page { min-height: 100vh; background: #f6f7fb; padding: 24rpx; }
.head { padding: 16rpx 8rpx 24rpx; }
.title { font-size: 34rpx; font-weight: 700; color: #1f2937; }
.sub { display: block; margin-top: 6rpx; font-size: 24rpx; color: #9ca3af; }
.tip, .empty { text-align: center; color: #9ca3af; font-size: 26rpx; padding: 60rpx 0; }
.card { background: #fff; border-radius: 20rpx; padding: 28rpx; margin-bottom: 20rpx; }
.plan-title { font-size: 28rpx; font-weight: 600; color: #1f2937; }
.kp-tags { display: flex; flex-wrap: wrap; gap: 12rpx; margin: 16rpx 0; }
.kp { background: #eff6ff; color: #2563eb; font-size: 24rpx; padding: 6rpx 18rpx; border-radius: 999rpx; }
.prog { display: flex; align-items: center; gap: 16rpx; }
.prog-track { flex: 1; height: 16rpx; background: #f1f2f6; border-radius: 10rpx; overflow: hidden; }
.prog-fill { height: 100%; background: #2563eb; border-radius: 10rpx; }
.prog-val { font-size: 24rpx; color: #6b7280; }
.gen-label { font-size: 28rpx; font-weight: 600; color: #1f2937; }
.gen-bar { display: flex; gap: 16rpx; margin-top: 16rpx; }
.gen-ipt { flex: 1; height: 72rpx; padding: 0 24rpx; background: #f3f4f6; border-radius: 36rpx; font-size: 26rpx; }
.gen-btn { height: 72rpx; line-height: 72rpx; padding: 0 32rpx; background: #2563eb; color: #fff; border-radius: 36rpx; font-size: 26rpx; }
.gen-btn[disabled] { opacity: 0.5; }
.ex-top { display: flex; justify-content: space-between; align-items: center; }
.ex-kp { font-size: 26rpx; font-weight: 600; color: #2563eb; }
.ex-done { font-size: 22rpx; color: #16a34a; background: #f0fdf4; padding: 4rpx 14rpx; border-radius: 999rpx; }
.ex-q { margin-top: 14rpx; font-size: 26rpx; color: #374151; line-height: 1.6; }
.ex-a { margin-top: 10rpx; font-size: 24rpx; color: #6b7280; }
.ex-btn { margin-top: 16rpx; height: 64rpx; line-height: 64rpx; background: #eff6ff; color: #2563eb; border-radius: 32rpx; font-size: 24rpx; }
.ex.done { opacity: 0.7; }
</style>
