<template>
  <view class="empty-state" :class="{ dark: theme.mode === 'dark' }">
    <text class="ic">{{ icon }}</text>
    <text class="tx">{{ text }}</text>
    <text v-if="hint" class="ht">{{ hint }}</text>
  </view>
</template>

<script setup>
import { theme } from '../../common/store'
defineProps({
  icon: { type: String, default: '📭' },
  text: { type: String, default: '暂无数据' },
  hint: { type: String, default: '' },
})
</script>

<style scoped>
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 80rpx 30rpx;
  color: var(--c-sub);
}
.ic { font-size: 72rpx; margin-bottom: 18rpx; opacity: 0.6; }
.tx { font-size: 28rpx; color: var(--c-sub); }
.ht { font-size: 22rpx; color: var(--c-sub); margin-top: 8rpx; opacity: 0.7; }
</style>
