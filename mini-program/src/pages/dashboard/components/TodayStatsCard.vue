<template>
  <view class="ov-grid today-stats">
    <view v-if="loading" class="ov skel-card" v-for="i in 3" :key="'sk2'+i">
      <view class="skel-block w50"></view>
      <view class="skel-block w70" style="margin-top:16rpx"></view>
    </view>
    <template v-else>
      <view class="ov ts-card pop-in" :style="{ '--i': 0 }">
        <view class="ov-grad" style="background:linear-gradient(135deg,#e8f1fb,#d0e8fb)">📋</view>
        <view class="ov-num ts-num"><CountUp :value="todayStats.attendanceRate" suffix="%" /></view>
        <view class="ov-lb">今日出勤率</view>
        <view class="ts-ring" :style="{ '--pct': todayStats.attendanceRate }"></view>
      </view>
      <view class="ov ts-card pop-in" :style="{ '--i': 1 }">
        <view class="ov-grad" style="background:linear-gradient(135deg,#fff3d6,#ffe0a0)">📝</view>
        <view class="ov-num ts-num" :class="todayStats.pendingHomework > 0 && 'warn'"><CountUp :value="todayStats.pendingHomework" /></view>
        <view class="ov-lb">待批改作业</view>
      </view>
      <view class="ov ts-card pop-in" :style="{ '--i': 2 }">
        <view class="ov-grad" style="background:linear-gradient(135deg,#e8f9e8,#d4f5d4)">🔔</view>
        <view class="ov-num ts-num"><CountUp :value="todayStats.lessonCount" /></view>
        <view class="ov-lb">今日课程节数</view>
      </view>
    </template>
  </view>
</template>

<script setup>
import CountUp from './CountUp.vue'

defineProps({
  loading: { type: Boolean, default: false },
  todayStats: { type: Object, default: () => ({ attendanceRate: 100, pendingHomework: 0, lessonCount: 0 }) },
})
</script>

<style scoped>
.ov-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 16rpx; margin: 10rpx 0 20rpx; }
.today-stats { grid-template-columns: repeat(3, 1fr); margin: 6rpx 0 14rpx; }
.ov { background: var(--c-card); border-radius: 22rpx; padding: 24rpx; display: flex; align-items: center; gap: 20rpx; box-shadow: 0 4rpx 16rpx var(--c-shadow); position: relative; overflow: hidden; }
.ov::before { content: ''; position: absolute; top: 0; left: 15%; right: 15%; height: 2rpx; background: linear-gradient(90deg, transparent, rgba(255,255,255,0.7), transparent); }
.ov-grad { width: 64rpx; height: 64rpx; border-radius: 18rpx; text-align: center; line-height: 64rpx; font-size: 32rpx; flex-shrink: 0; }
.ov-num { font-size: 44rpx; font-weight: 800; color: var(--c-accent); flex: 1; text-align: right; }
.ov-lb { font-size: 22rpx; color: var(--c-sub); }
.ts-card { flex-direction: column; align-items: center; text-align: center; padding: 20rpx 8rpx; gap: 8rpx; position: relative; }
.ts-card .ov-grad { width: 52rpx; height: 52rpx; line-height: 52rpx; font-size: 26rpx; border-radius: 50%; }
.ts-num { font-size: 36rpx !important; text-align: center !important; }
.ts-num.warn { color: var(--c-danger) !important; }
.ts-ring { position: absolute; top: -20rpx; right: -20rpx; width: 60rpx; height: 60rpx; border-radius: 50%; background: conic-gradient(rgba(7,193,96,0.15) calc(var(--pct, 100) * 1%), transparent 0); opacity: 0.6; }
.skel-card { pointer-events: none; }
.skel-block { height: 48rpx; border-radius: 16rpx; background: linear-gradient(90deg, #e5e5e5 25%, #f0f0f0 50%, #e5e5e5 75%); background-size: 200% 100%; animation: shimmer 1.5s infinite; }
.w50 { width: 50%; }
.w70 { width: 70%; }
.pop-in { animation: pop-in 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) both; animation-delay: calc(var(--i, 0) * 0.08s); }
@keyframes pop-in { from { opacity: 0; transform: scale(0.8) translateY(20rpx); } to { opacity: 1; transform: scale(1) translateY(0); } }
@keyframes shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }
</style>
