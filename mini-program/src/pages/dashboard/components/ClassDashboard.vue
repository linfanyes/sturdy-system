<template>
  <view class="card ww-card">
    <view class="card-h">
      <view class="ww-title-row">
        <view class="ww-ic-bg">🏫</view>
        <text class="ch-t">班级工作台</text>
      </view>
      <text class="ch-m press-feedback" @click="$emit('goCrud', 'students')">学生管理 ›</text>
    </view>
    <view class="ww-grid">
      <view class="ww-item press-feedback" @click="$emit('goCrud', 'attendances')" style="--i:0">
        <view class="ww-ic" style="background:linear-gradient(135deg,#e8f9e8,#d4f5d4)">✅</view>
        <text class="ww-num">{{ weekAttRate }}%</text>
        <text class="ww-lb">本周出勤</text>
      </view>
      <view class="ww-item press-feedback" @click="$emit('goCrud', 'homework')" style="--i:1">
        <view class="ww-ic" style="background:linear-gradient(135deg,#fff3d6,#ffe0a0)">📝</view>
        <text class="ww-num warn">{{ pendingBySubject.length }}</text>
        <text class="ww-lb">待批科目</text>
      </view>
      <view class="ww-item press-feedback" @click="$emit('goCrud', 'behavior')" style="--i:2">
        <view class="ww-ic" style="background:linear-gradient(135deg,#f3e8ff,#e8d4ff)">👀</view>
        <text class="ww-num">{{ weekBehaviorCount }}</text>
        <text class="ww-lb">行为记录</text>
      </view>
      <view class="ww-item press-feedback" @click="$emit('goCrud', 'grades')" style="--i:3">
        <view class="ww-ic" style="background:linear-gradient(135deg,#e8f1fb,#d0e8fb)">📊</view>
        <text class="ww-num">{{ gradeList.length }}</text>
        <text class="ww-lb">考试次数</text>
      </view>
    </view>
    <view class="ww-detail" v-if="pendingBySubject.length">
      <text class="ww-detail-title">待批改作业：</text>
      <text class="ww-detail-text">{{ pendingBySubject.slice(0, 4).join('、') }}</text>
    </view>
  </view>
</template>

<script setup>
defineProps({
  weekAttRate: { type: Number, default: 100 },
  pendingBySubject: { type: Array, default: () => [] },
  weekBehaviorCount: { type: Number, default: 0 },
  gradeList: { type: Array, default: () => [] },
})
defineEmits(['goCrud'])
</script>

<style scoped>
.ww-card { margin-top: 20rpx; background: linear-gradient(135deg, var(--c-card) 0%, #fefcf7 100%); border-radius: 24rpx; padding: 24rpx; box-shadow: 0 4rpx 20rpx var(--c-shadow); position: relative; overflow: hidden; }
.ww-card::before { content: ''; position: absolute; top: 0; left: 15%; right: 15%; height: 2rpx; background: linear-gradient(90deg, transparent, rgba(245,179,66,0.5), transparent); }
.card-h { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16rpx; }
.ww-title-row { display: flex; align-items: center; gap: 12rpx; }
.ww-ic-bg { width: 48rpx; height: 48rpx; border-radius: 14rpx; background: linear-gradient(135deg, #fff3d6, #ffe0a0); display: flex; align-items: center; justify-content: center; font-size: 26rpx; }
.ch-t { font-size: 28rpx; font-weight: 700; color: var(--c-title); }
.ch-m { font-size: 22rpx; color: var(--c-sub); background: var(--c-input); padding: 6rpx 14rpx; border-radius: 16rpx; }
.ww-grid { display: flex; gap: 12rpx; margin-bottom: 10rpx; }
.ww-item { flex: 1; text-align: center; padding: 18rpx 6rpx; background: var(--c-input); border-radius: 18rpx; display: flex; flex-direction: column; align-items: center; gap: 6rpx; transition: all 0.2s; animation: pop-in 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) both; animation-delay: calc(var(--i, 0) * 0.08s); }
.ww-ic { width: 52rpx; height: 52rpx; border-radius: 14rpx; display: flex; align-items: center; justify-content: center; font-size: 26rpx; }
.ww-num { display: block; font-size: 36rpx; font-weight: 800; color: var(--c-accent); }
.ww-num.warn { color: var(--c-danger); }
.ww-lb { display: block; font-size: 20rpx; color: var(--c-sub); }
.ww-detail { padding: 12rpx 0 0; border-top: 1rpx solid var(--c-border); }
.ww-detail-title { font-size: 22rpx; color: var(--c-sub); }
.ww-detail-text { font-size: 22rpx; color: var(--c-title); }
.press-feedback { transition: transform 0.15s, opacity 0.15s; }
.press-feedback:active { transform: scale(0.95); opacity: 0.9; }
@keyframes pop-in { from { opacity: 0; transform: scale(0.8) translateY(20rpx); } to { opacity: 1; transform: scale(1) translateY(0); } }
</style>
