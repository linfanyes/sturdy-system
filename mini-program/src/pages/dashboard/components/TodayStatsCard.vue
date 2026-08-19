<template>
  <view class="ov-grid today-stats">
    <view v-if="loading" class="ov skel-card" v-for="i in 3" :key="'sk2'+i">
      <view class="skel-block w50"></view>
      <view class="skel-block w70" style="margin-top:16rpx"></view>
    </view>
    <template v-else>
      <view class="ov ts-card">
        <view class="ov-ic" style="background:#e8f1fb">📋</view>
        <view class="ov-num ts-num">{{ todayStats.attendanceRate }}%</view>
        <view class="ov-lb">今日出勤率</view>
      </view>
      <view class="ov ts-card">
        <view class="ov-ic" style="background:#fff3d6">📝</view>
        <view class="ov-num ts-num" :class="todayStats.pendingHomework > 0 && 'warn'">{{ todayStats.pendingHomework }}</view>
        <view class="ov-lb">待批改作业</view>
      </view>
      <view class="ov ts-card">
        <view class="ov-ic" style="background:#e8f9e8">🔔</view>
        <view class="ov-num ts-num">{{ todayStats.lessonCount }}</view>
        <view class="ov-lb">今日课程节数</view>
      </view>
    </template>
  </view>
</template>

<script setup>
defineProps({
  loading: { type: Boolean, default: false },
  todayStats: { type: Object, default: () => ({ attendanceRate: 100, pendingHomework: 0, lessonCount: 0 }) },
})
</script>

<style scoped>
.ov-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 16rpx; margin: 10rpx 0 20rpx; }
.today-stats { grid-template-columns: repeat(3, 1fr); margin: 6rpx 0 14rpx; }
.ov { background: var(--c-card); border-radius: 22rpx; padding: 24rpx; display: flex; align-items: center; gap: 20rpx; box-shadow: 0 4rpx 16rpx var(--c-shadow); }
.ov-ic { width: 64rpx; height: 64rpx; border-radius: 18rpx; text-align: center; line-height: 64rpx; font-size: 32rpx; flex-shrink: 0; }
.ov-num { font-size: 44rpx; font-weight: 800; color: var(--c-accent); flex: 1; text-align: right; }
.ov-lb { font-size: 22rpx; color: var(--c-sub); }
.ts-card { flex-direction: column; align-items: center; text-align: center; padding: 20rpx 8rpx; gap: 8rpx; }
.ts-card .ov-ic { width: 48rpx; height: 48rpx; line-height: 48rpx; font-size: 26rpx; }
.ts-num { font-size: 36rpx !important; text-align: center !important; }
.ts-num.warn { color: var(--c-danger) !important; }
.skel-card { pointer-events: none; }
.skel-block { height: 48rpx; border-radius: 16rpx; background: #e5e5e5; animation: skelPulse 1.2s infinite; }
.w50 { width: 50%; }
.w70 { width: 70%; }
@keyframes skelPulse { 0%,100% { opacity: 0.4; } 50% { opacity: 1; } }
</style>
