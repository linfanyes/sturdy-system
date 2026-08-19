<template>
  <view>
    <view class="card pop-in" v-if="!loading && classDist.length">
      <view class="card-h">
        <text class="ch-t">🏫 班级人数分布</text>
        <text class="ch-m">{{ studentList.length }} 人</text>
      </view>
      <view class="dist-row pop-in" v-for="(d, i) in classDist" :key="d.name" :style="{ '--i': i }">
        <text class="dist-name">{{ d.name }}</text>
        <view class="dist-bar">
          <view class="dist-fill" :style="{ width: d.pct + '%' }"></view>
        </view>
        <text class="dist-num">{{ d.count }}</text>
      </view>
    </view>
    <view v-else-if="loading" class="card skel-card">
      <view class="skel-block w60" style="margin:20rpx"></view>
      <view v-for="i in 3" :key="'sk3'+i" style="margin:16rpx 20rpx">
        <view class="skel-block w80"></view>
      </view>
    </view>
  </view>
</template>

<script setup>
defineProps({
  loading: { type: Boolean, default: false },
  studentList: { type: Array, default: () => [] },
  classDist: { type: Array, default: () => [] },
})
</script>

<style scoped>
.card {
  margin-top: 20rpx;
  background: var(--c-card);
  border-radius: var(--r-lg);
  padding: 24rpx;
  box-shadow: var(--c-shadow-paper);
  position: relative;
  overflow: hidden;
}
.card::before {
  content: '';
  position: absolute;
  top: 0; left: 15%; right: 15%;
  height: 2rpx;
  background: linear-gradient(90deg, transparent, rgba(255,255,255,0.7), transparent);
}
.card-h {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16rpx;
}
.ch-t { font-size: 28rpx; font-weight: 700; color: var(--c-title); }
.ch-m { font-size: 22rpx; color: var(--c-sub); }
.dist-row {
  display: flex;
  align-items: center;
  gap: 16rpx;
  padding: 12rpx 0;
}
.dist-name {
  width: 120rpx;
  font-size: 24rpx;
  color: var(--c-text);
  flex-shrink: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.dist-bar {
  flex: 1;
  height: 24rpx;
  border-radius: 12rpx;
  background: var(--c-input);
  overflow: hidden;
}
.dist-fill {
  height: 100%;
  border-radius: 12rpx;
  background: linear-gradient(90deg, #ffd479, #f5b342);
  transition: width 0.8s cubic-bezier(0.34, 1.56, 0.64, 1);
}
.dist-num {
  width: 48rpx;
  text-align: right;
  font-size: 24rpx;
  font-weight: 600;
  color: var(--c-title);
  flex-shrink: 0;
}
/* 弹出动画 */
.pop-in {
  animation: pop-in 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) both;
  animation-delay: calc(var(--i, 0) * 0.08s);
}
@keyframes pop-in {
  from { opacity: 0; transform: scale(0.9) translateY(14rpx); }
  to { opacity: 1; transform: scale(1) translateY(0); }
}
/* 骨架屏 */
.skel-card { pointer-events: none; }
.skel-block {
  height: 48rpx;
  border-radius: 16rpx;
  background: linear-gradient(90deg, #e5e5e5 25%, #f0f0f0 50%, #e5e5e5 75%);
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
}
.w60 { width: 60%; }
.w80 { width: 80%; }
@keyframes shimmer {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}
</style>
