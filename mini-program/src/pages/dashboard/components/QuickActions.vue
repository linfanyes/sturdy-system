<template>
  <view class="quick-actions">
    <view v-for="(item, i) in actions" :key="item.path" class="qa-item" :style="{ '--i': i }" @click="$emit('goPage', item.path)">
      <text class="qa-ic" :style="{ background: iconBgs[i] }">{{ item.icon }}</text>
      <text class="qa-lb">{{ item.label }}</text>
    </view>
  </view>
</template>

<script setup>
defineEmits(['goPage'])

const actions = [
  { icon: '✅', label: '记考勤', path: '/pages/community/attendance' },
  { icon: '📝', label: '布置作业', path: '/pages/community/homework' },
  { icon: '📢', label: '发通知', path: '/pages/community/notice' },
  { icon: '✅', label: '待办', path: '/pages/community/todos' },
  { icon: '👀', label: '行为记录', path: '/pages/community/behavior-record' },
]

const iconBgs = [
  'linear-gradient(135deg, #e8f9e8, #d4f5d4)',
  'linear-gradient(135deg, #fff3d6, #ffe0a0)',
  'linear-gradient(135deg, #e8f1fb, #d0e8fb)',
  'linear-gradient(135deg, #fde8ea, #fbd4da)',
  'linear-gradient(135deg, #f3e8ff, #e8d4ff)',
]
</script>

<style scoped>
.quick-actions { display: grid; grid-template-columns: repeat(auto-fit, minmax(100rpx, 1fr)); gap: 12rpx; padding: 0 0 14rpx; }
.qa-item { display: flex; flex-direction: column; align-items: center; gap: 8rpx; padding: 12rpx 0; border-radius: 16rpx; transition: all 0.2s; animation: bounce-in 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) both; animation-delay: calc(var(--i, 0) * 0.06s); }
.qa-item:active { transform: scale(0.9); opacity: 0.85; }
.qa-ic { width: 68rpx; height: 68rpx; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 30rpx; box-shadow: 0 4rpx 12rpx var(--c-shadow); }
.qa-lb { font-size: 20rpx; color: var(--c-sub); text-align: center; font-weight: 500; }
@keyframes bounce-in { 0% { transform: scale(0); } 50% { transform: scale(1.1); } 70% { transform: scale(0.95); } 100% { transform: scale(1); } }
</style>
