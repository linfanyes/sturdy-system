<template>
  <view class="ov-grid">
    <view v-if="loading" class="ov skel-card" v-for="i in 4" :key="'sk'+i">
      <view class="skel-block w50"></view>
      <view class="skel-block w70" style="margin-top:16rpx"></view>
    </view>
    <template v-else>
      <view class="ov pop-in" :style="{ '--i': 0 }" @click="$emit('goCrud', 'classes')">
        <view class="ov-grad" style="background:linear-gradient(135deg,#fff3d6,#ffe0a0)">🏫</view>
        <view class="ov-num"><CountUp :value="classList.length" /></view>
        <view class="ov-lb">班级</view>
      </view>
      <view class="ov pop-in" :style="{ '--i': 1 }" @click="$emit('goCrud', 'students')">
        <view class="ov-grad" style="background:linear-gradient(135deg,#e8f9e8,#d4f5d4)">🧒</view>
        <view class="ov-num"><CountUp :value="studentList.length" /></view>
        <view class="ov-lb">学生</view>
      </view>
      <view class="ov pop-in" :style="{ '--i': 2 }" @click="$emit('goCrud', 'notes')">
        <view class="ov-grad" style="background:linear-gradient(135deg,#fde8ea,#fbd4da)">📒</view>
        <view class="ov-num"><CountUp :value="noteList.length" /></view>
        <view class="ov-lb">笔记</view>
      </view>
      <view class="ov pop-in" :style="{ '--i': 3 }" @click="$emit('goPage', '/pages/teaching/grades')">
        <view class="ov-grad" style="background:linear-gradient(135deg,#e8f1fb,#d0e8fb)">📊</view>
        <view class="ov-num"><CountUp :value="gradeList.length" /></view>
        <view class="ov-lb">考试</view>
      </view>
    </template>
  </view>
</template>

<script setup>
import CountUp from './CountUp.vue'

defineProps({
  loading: { type: Boolean, default: false },
  classList: { type: Array, default: () => [] },
  studentList: { type: Array, default: () => [] },
  noteList: { type: Array, default: () => [] },
  gradeList: { type: Array, default: () => [] },
})
defineEmits(['goCrud', 'goPage'])
</script>

<style scoped>
.ov-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 16rpx; margin: 10rpx 0 20rpx; }
.ov { background: var(--c-card); border-radius: 22rpx; padding: 24rpx; display: flex; align-items: center; gap: 20rpx; box-shadow: 0 4rpx 16rpx var(--c-shadow); position: relative; overflow: hidden; }
.ov::before { content: ''; position: absolute; top: 0; left: 15%; right: 15%; height: 2rpx; background: linear-gradient(90deg, transparent, rgba(255,255,255,0.7), transparent); }
.ov-grad { width: 64rpx; height: 64rpx; border-radius: 18rpx; text-align: center; line-height: 64rpx; font-size: 32rpx; flex-shrink: 0; }
.ov-num { font-size: 44rpx; font-weight: 800; color: var(--c-accent); flex: 1; text-align: right; }
.ov-lb { font-size: 22rpx; color: var(--c-sub); }
.skel-card { pointer-events: none; }
.skel-block { height: 48rpx; border-radius: 16rpx; background: linear-gradient(90deg, #e5e5e5 25%, #f0f0f0 50%, #e5e5e5 75%); background-size: 200% 100%; animation: shimmer 1.5s infinite; }
.w50 { width: 50%; }
.w70 { width: 70%; }
.pop-in { animation: pop-in 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) both; animation-delay: calc(var(--i, 0) * 0.08s); }
@keyframes pop-in { from { opacity: 0; transform: scale(0.8) translateY(20rpx); } to { opacity: 1; transform: scale(1) translateY(0); } }
@keyframes shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }
</style>
