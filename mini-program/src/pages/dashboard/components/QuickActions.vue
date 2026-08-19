<template>
  <view class="quick-actions">
    <view class="qa-item" @click="$emit('goPage', '/pages/community/attendance')">
      <text class="qa-ic" style="background:#e8f9e8">✅</text>
      <text class="qa-lb">记考勤</text>
    </view>
    <view class="qa-item" @click="$emit('goPage', '/pages/community/homework')">
      <text class="qa-ic" style="background:#fff3d6">📝</text>
      <text class="qa-lb">布置作业</text>
    </view>
    <view class="qa-item" @click="$emit('goPage', '/pages/community/notice')">
      <text class="qa-ic" style="background:#e8f1fb">📢</text>
      <text class="qa-lb">发通知</text>
    </view>
    <view class="qa-item" @click="$emit('goPage', '/pages/community/todos')">
      <text class="qa-ic" style="background:#fde8ea">✅</text>
      <text class="qa-lb">待办</text>
    </view>
    <view class="qa-item" @click="$emit('goPage', '/pages/community/behavior-record')">
      <text class="qa-ic" style="background:#f3e8ff">👀</text>
      <text class="qa-lb">行为记录</text>
    </view>
  </view>
</template>

<script setup>
defineEmits(['goPage'])
</script>

<style scoped>
.quick-actions { display: grid; grid-template-columns: repeat(auto-fit, minmax(100rpx, 1fr)); gap: 12rpx; padding: 0 0 14rpx; }
.qa-item { display: flex; flex-direction: column; align-items: center; gap: 6rpx; }
.qa-ic { width: 60rpx; height: 60rpx; border-radius: 30rpx; display: flex; align-items: center; justify-content: center; font-size: 28rpx; }
.qa-lb { font-size: 20rpx; color: var(--c-sub); text-align: center; }
</style>
