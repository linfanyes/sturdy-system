<template>
  <view class="card trend-card" v-if="weekTrend.some(d => d.rate != null)">
    <view class="card-h">
      <view class="trend-title-row">
        <view class="trend-ic">📈</view>
        <text class="ch-t">出勤趋势</text>
      </view>
      <text class="ch-sub">近7日</text>
    </view>
    <view class="trend-chart">
      <view class="trend-yaxis">
        <text class="trend-yline">100%</text>
        <text class="trend-yline">75%</text>
        <text class="trend-yline">50%</text>
        <text class="trend-yline">0%</text>
      </view>
      <view class="trend-grid">
        <view v-for="i in 4" :key="'g'+i" class="trend-grid-line" />
      </view>
      <view class="trend-bar-col" v-for="(d, i) in weekTrend" :key="i">
        <view class="trend-bar-wrap">
          <view class="trend-bar pop-in" :style="{ height: d.rate != null ? d.rate + '%' : '0%', '--i': i }" :class="[i === 6 && 'today', d.rate != null && d.rate < 80 && 'warn']">
            <view class="trend-bar-glow" v-if="i === 6" />
          </view>
        </view>
        <text class="trend-label" :class="i === 6 && 'today'">{{ d.label }}</text>
        <text class="trend-rate" :class="[i === 6 && 'today', d.rate != null && d.rate < 80 && 'warn']">{{ d.rate != null ? d.rate + '%' : '-' }}</text>
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
.trend-card { margin-top: 20rpx; background: linear-gradient(135deg, var(--c-card) 0%, #fefcf7 100%); border-radius: 24rpx; padding: 24rpx; box-shadow: 0 4rpx 20rpx var(--c-shadow); position: relative; overflow: hidden; }
.trend-card::before { content: ''; position: absolute; top: 0; left: 15%; right: 15%; height: 2rpx; background: linear-gradient(90deg, transparent, rgba(245,179,66,0.4), transparent); }
.card-h { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16rpx; }
.trend-title-row { display: flex; align-items: center; gap: 12rpx; }
.trend-ic { width: 44rpx; height: 44rpx; border-radius: 12rpx; background: linear-gradient(135deg, #e8f9e8, #d4f5d4); display: flex; align-items: center; justify-content: center; font-size: 24rpx; }
.ch-t { font-size: 28rpx; font-weight: 700; color: var(--c-title); }
.ch-sub { font-size: 22rpx; color: var(--c-sub); background: var(--c-input); padding: 4rpx 12rpx; border-radius: 12rpx; }
.trend-chart { display: flex; align-items: flex-end; gap: 8rpx; padding: 10rpx 0 10rpx 50rpx; height: 220rpx; position: relative; }
.trend-yaxis { position: absolute; left: 0; top: 0; bottom: 0; width: 46rpx; display: flex; flex-direction: column; justify-content: space-between; padding: 0 4rpx; }
.trend-yline { font-size: 18rpx; color: #ccc; line-height: 1; }
.trend-grid { position: absolute; left: 50rpx; right: 0; top: 0; bottom: 0; display: flex; flex-direction: column; justify-content: space-between; pointer-events: none; }
.trend-grid-line { height: 1rpx; background: var(--c-border); opacity: 0.4; }
.trend-bar-col { flex: 1; display: flex; flex-direction: column; align-items: center; height: 100%; }
.trend-bar-wrap { flex: 1; width: 100%; display: flex; align-items: flex-end; justify-content: center; }
.trend-bar { width: 36rpx; border-radius: 8rpx 8rpx 0 0; background: linear-gradient(180deg, #a5d6a7 0%, #66bb6a 100%); min-height: 4rpx; position: relative; }
.trend-bar.today { background: linear-gradient(180deg, #ffd479 0%, #f5b342 100%); box-shadow: 0 0 12rpx rgba(245,179,66,0.3); }
.trend-bar.warn { background: linear-gradient(180deg, #ef9a9a 0%, #ef5350 100%); }
.trend-bar-glow { position: absolute; top: -4rpx; left: 50%; transform: translateX(-50%); width: 12rpx; height: 12rpx; border-radius: 50%; background: #f5b342; box-shadow: 0 0 8rpx rgba(245,179,66,0.6); animation: pulse-ring 1.5s ease-out infinite; }
.trend-label { font-size: 20rpx; color: var(--c-sub); margin-top: 6rpx; }
.trend-label.today { color: var(--c-accent); font-weight: 700; }
.trend-rate { font-size: 18rpx; color: var(--c-sub); font-weight: 600; }
.trend-rate.today { color: var(--c-accent); }
.trend-rate.warn { color: var(--c-danger); }
.pop-in { animation: bar-grow 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) both; animation-delay: calc(var(--i, 0) * 0.08s); }
@keyframes bar-grow { from { height: 0 !important; opacity: 0; } to { opacity: 1; } }
@keyframes pulse-ring { 0% { transform: translateX(-50%) scale(1); opacity: 1; } 100% { transform: translateX(-50%) scale(1.8); opacity: 0; } }
</style>
