<template>
  <view class="skeleton" :class="{ dark: theme.mode === 'dark' }">
    <view v-for="i in rows" :key="i" class="sk-row" :style="{ width: widths[i % widths.length] + '%' }"></view>
  </view>
</template>

<script setup>
import { theme } from '../../common/store'
defineProps({
  rows: { type: Number, default: 3 },
  widths: { type: Array, default: () => [80, 95, 70] },
})
</script>

<style scoped>
.skeleton { padding: 24rpx; }
.sk-row { height: 28rpx; border-radius: 8rpx; margin-bottom: 20rpx; background: linear-gradient(90deg, var(--c-card2) 25%, var(--c-card) 50%, var(--c-card2) 75%); background-size: 200% 100%; animation: shimmer 1.5s infinite; }
@keyframes shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }
</style>
