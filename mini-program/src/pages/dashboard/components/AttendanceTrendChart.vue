<template>
  <view class="card" v-if="weekTrend.some(d => d.rate != null)">
    <view class="card-h">
      <text class="ch-t">📈 出勤趋势（近7日）</text>
    </view>
    <view class="trend-chart">
      <view class="trend-yaxis">
        <text class="trend-yline">100%</text>
        <text class="trend-yline">75%</text>
        <text class="trend-yline">50%</text>
        <text class="trend-yline">0%</text>
      </view>
      <view class="trend-bar-col" v-for="(d, i) in weekTrend" :key="i">
        <view class="trend-bar-wrap">
          <view class="trend-bar" :style="{ height: (d.rate ?? 0) + '%' }" :class="i === 6 && 'today'"></view>
        </view>
        <text class="trend-label">{{ d.label }}</text>
        <text class="trend-rate">{{ d.rate != null ? d.rate + '%' : '-' }}</text>
      </view>
    </view>
  </view>
</template>

<script setup>
defineProps({
  weekTrend: { type: Array, default: () => [] },
})
</script>

<style scoped>
.card { margin-top: 20rpx; background: var(--c-card); border-radius: 20rpx; padding: 24rpx; box-shadow: 0 2rpx 10rpx var(--c-shadow); }
.card-h { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12rpx; }
.ch-t { font-size: 28rpx; font-weight: 700; color: var(--c-title); }
.trend-chart { display: flex; align-items: flex-end; gap: 8rpx; padding: 10rpx 0 10rpx 50rpx; height: 200rpx; position: relative; }
.trend-yaxis { position: absolute; left: 0; top: 0; bottom: 0; width: 46rpx; display: flex; flex-direction: column; justify-content: space-between; padding: 0 4rpx; }
.trend-yline { font-size: 18rpx; color: #ccc; line-height: 1; }
.trend-bar-col { flex: 1; display: flex; flex-direction: column; align-items: center; height: 100%; }
.trend-bar-wrap { flex: 1; width: 100%; display: flex; align-items: flex-end; justify-content: center; }
.trend-bar { width: 36rpx; border-radius: 6rpx 6rpx 0 0; background: #c8e6c9; min-height: 4rpx; transition: height 0.3s; }
.trend-bar.today { background: var(--c-accent, #07c160); }
.trend-label { font-size: 20rpx; color: var(--c-sub); margin-top: 4rpx; }
.trend-rate { font-size: 18rpx; color: var(--c-sub2); }
</style>
