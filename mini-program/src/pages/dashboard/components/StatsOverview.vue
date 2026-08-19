<template>
  <view class="ov-grid">
    <view v-if="loading" class="ov skel-card" v-for="i in 4" :key="'sk'+i">
      <view class="skel-block w50"></view>
      <view class="skel-block w70" style="margin-top:16rpx"></view>
    </view>
    <template v-else>
      <view class="ov" @click="$emit('goCrud', 'classes')">
        <view class="ov-ic" style="background:#fff3d6">🏫</view>
        <view class="ov-num">{{ classList.length }}</view>
        <view class="ov-lb">班级</view>
      </view>
      <view class="ov" @click="$emit('goCrud', 'students')">
        <view class="ov-ic" style="background:#e8f9e8">🧒</view>
        <view class="ov-num">{{ studentList.length }}</view>
        <view class="ov-lb">学生</view>
      </view>
      <view class="ov" @click="$emit('goCrud', 'notes')">
        <view class="ov-ic" style="background:#fde8ea">📒</view>
        <view class="ov-num">{{ noteList.length }}</view>
        <view class="ov-lb">笔记</view>
      </view>
      <view class="ov" @click="$emit('goPage', '/pages/teaching/grades')">
        <view class="ov-ic" style="background:#e8f1fb">📊</view>
        <view class="ov-num">{{ gradeList.length }}</view>
        <view class="ov-lb">考试</view>
      </view>
    </template>
  </view>
</template>

<script setup>
defineProps({
  loading: { type: Boolean, default: false },
  classList: { type: Array, default: () => [] },
  studentList: { type: Array, default: () => [] },
  noteList: { type: Array, default: () => [] },
  gradeList: { type: Array, default: () => [] },
})
defineEmits(['goCrud', 'goPage'])
</script>

<style scoped>
.ov-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 16rpx; margin: 10rpx 0 20rpx; }
.ov { background: var(--c-card); border-radius: 22rpx; padding: 24rpx; display: flex; align-items: center; gap: 20rpx; box-shadow: 0 4rpx 16rpx var(--c-shadow); }
.ov-ic { width: 64rpx; height: 64rpx; border-radius: 18rpx; text-align: center; line-height: 64rpx; font-size: 32rpx; flex-shrink: 0; }
.ov-num { font-size: 44rpx; font-weight: 800; color: var(--c-accent); flex: 1; text-align: right; }
.ov-lb { font-size: 22rpx; color: var(--c-sub); }
.skel-card { pointer-events: none; }
.skel-block { height: 48rpx; border-radius: 16rpx; background: #e5e5e5; animation: skelPulse 1.2s infinite; }
.w50 { width: 50%; }
.w70 { width: 70%; }
@keyframes skelPulse { 0%,100% { opacity: 0.4; } 50% { opacity: 1; } }
</style>
