<template>
  <view class="skeleton" :class="{ dark: theme.mode === 'dark' }">
    <view v-if="avatar" class="sk-avatar" :style="{ width: avatar + 'rpx', height: avatar + 'rpx' }"></view>
    <view class="sk-content">
      <view v-for="i in rows" :key="i" class="sk-row" :style="{ width: widths[(i-1) % widths.length] + '%', animationDelay: (i * 0.1) + 's' }"></view>
    </view>
  </view>
</template>

<script setup>
import { theme } from '../../common/store'
defineProps({
  rows: { type: Number, default: 3 },
  widths: { type: Array, default: () => [80, 95, 70] },
  avatar: { type: Number, default: 0 },
})
</script>

<style scoped>
.skeleton { padding: 24rpx; }
.sk-avatar { border-radius: 50%; margin-bottom: 24rpx; background: linear-gradient(90deg, var(--c-card2) 25%, var(--c-card) 50%, var(--c-card2) 75%); background-size: 200% 100%; animation: shimmer 1.8s ease-in-out infinite; }
.sk-content { width: 100%; }
.sk-row { height: 28rpx; border-radius: 8rpx; margin-bottom: 20rpx; background: linear-gradient(90deg, var(--c-card2) 25%, var(--c-card) 50%, var(--c-card2) 75%); background-size: 200% 100%; animation: shimmer 1.8s ease-in-out infinite; }
.sk-row:last-child { margin-bottom: 0; }
@keyframes shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }
</style>
