<template>
  <view class="card notice-card" v-if="pinnedNotices.length">
    <view class="card-h press-feedback" @click="$emit('goCrud', 'notices')">
      <view class="notice-title-row">
        <view class="notice-ic">📢</view>
        <text class="ch-t">班级公告</text>
      </view>
      <text class="ch-m">全部 ›</text>
    </view>
    <view v-for="(n, i) in pinnedNotices" :key="n.id" class="li col bord slide-in" :style="{ '--i': i }">
      <text class="li-t">{{ n.title }}</text>
      <text class="li-s clamp">{{ n.content }}</text>
    </view>
  </view>
</template>

<script setup>
defineProps({
  pinnedNotices: { type: Array, default: () => [] },
})
defineEmits(['goCrud'])
</script>

<style scoped>
.notice-card { margin-top: 20rpx; background: linear-gradient(135deg, var(--c-card) 0%, #fff8f0 100%); border-radius: 24rpx; padding: 24rpx; box-shadow: 0 4rpx 20rpx var(--c-shadow); position: relative; overflow: hidden; }
.notice-card::before { content: ''; position: absolute; top: 0; left: 15%; right: 15%; height: 2rpx; background: linear-gradient(90deg, transparent, rgba(230,162,60,0.4), transparent); }
.card-h { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12rpx; }
.notice-title-row { display: flex; align-items: center; gap: 12rpx; }
.notice-ic { width: 44rpx; height: 44rpx; border-radius: 12rpx; background: linear-gradient(135deg, #fff3d6, #ffe0a0); display: flex; align-items: center; justify-content: center; font-size: 24rpx; }
.ch-t { font-size: 28rpx; font-weight: 700; color: var(--c-title); }
.ch-m { font-size: 22rpx; color: var(--c-sub); }
.li { display: flex; align-items: center; padding: 14rpx 0; border-bottom: 1px solid var(--c-border); font-size: 26rpx; }
.li:last-child { border-bottom: none; }
.li.col { flex-direction: column; align-items: stretch; }
.li-t { flex: 1; color: var(--c-title); font-weight: 600; }
.li-s { color: var(--c-sub); font-size: 22rpx; margin-left: 16rpx; flex-shrink: 0; }
.clamp { display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.bord { border-left: 6rpx solid var(--c-accent); padding-left: 14rpx; }
.slide-in { animation: slide-right 0.4s ease-out both; animation-delay: calc(var(--i, 0) * 0.08s); }
.press-feedback { transition: transform 0.15s; }
.press-feedback:active { transform: scale(0.98); }
@keyframes slide-right { from { opacity: 0; transform: translateX(-20rpx); } to { opacity: 1; transform: translateX(0); } }
</style>
