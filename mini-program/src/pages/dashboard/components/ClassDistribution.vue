<template>
  <view>
    <view class="card" v-if="!loading && classDist.length">
      <view class="card-h">
        <text class="ch-t">🏫 班级人数分布</text>
        <text class="ch-m">{{ studentList.length }} 人</text>
      </view>
      <view class="dist-row" v-for="d in classDist" :key="d.name">
        <text class="dist-name">{{ d.name }}</text>
        <view class="dist-bar"><view class="dist-fill" :style="{ width: d.pct + '%' }" /></view>
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
.card { margin-top: 20rpx; background: var(--c-card); border-radius: 20rpx; padding: 24rpx; box-shadow: 0 2rpx 10rpx var(--c-shadow); }
.card-h { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12rpx; }
.ch-t { font-size: 28rpx; font-weight: 700; color: var(--c-title); }
.ch-m { font-size: 22rpx; color: var(--c-sub); }
.dist-row { display: flex; align-items: center; gap: 16rpx; padding: 12rpx 0; }
.dist-name { width: 120rpx; font-size: 24rpx; color: var(--c-text); flex-shrink: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.dist-bar { flex: 1; height: 24rpx; border-radius: 12rpx; background: var(--c-card2); overflow: hidden; }
.dist-fill { height: 100%; border-radius: 12rpx; background: linear-gradient(90deg, #ffd479, #f5b342); }
.dist-num { width: 48rpx; text-align: right; font-size: 24rpx; font-weight: 600; color: var(--c-title); flex-shrink: 0; }
.skel-card { pointer-events: none; }
.skel-block { height: 48rpx; border-radius: 16rpx; background: #e5e5e5; animation: skelPulse 1.2s infinite; }
.w60 { width: 60%; }
.w80 { width: 80%; }
@keyframes skelPulse { 0%,100% { opacity: 0.4; } 50% { opacity: 1; } }
</style>
