<template>
  <view>
    <view class="sec-title">功能入口</view>
    <view class="grid">
      <view v-for="(f, i) in visibleFeatures" :key="f.path" class="cell press-feedback" :style="{ '--i': i }" @click="$emit('go', f)">
        <view class="ic" :style="{ background: iconGradients[i % iconGradients.length] }">{{ f.icon }}</view>
        <view class="lb">{{ f.label }}</view>
      </view>
    </view>
  </view>
</template>

<script setup>
import { computed } from 'vue'
import { hasFeature } from '../../../common/feature'
import { auth } from '../../../common/store'

defineEmits(['go'])

const features = [
  { label: '班级管理', icon: '🏫', path: '/pages/classes/classes', tab: true, feature: 'classes' },
  { label: '学生管理', icon: '👧', path: '/pages/students/students', tab: true, feature: 'students' },
  { label: '考试管理', icon: '📝', path: '/pages/teaching/exams', feature: 'exams' },
  { label: '成绩管理', icon: '📊', path: '/pages/teaching/grades', feature: 'grades' },
  { label: '座位表', icon: '💺', path: '/pages/teaching/seatMap', feature: 'seats' },
  { label: 'AI 助手', icon: '🤖', path: '/pages/ai/ai', feature: 'ai' },
  { label: '工具箱', icon: '🧰', path: '/pages/toolbox/toolbox', tab: true, feature: 'tools' },
  { label: '留言板', icon: '📥', path: '/pages/community/messages', feature: 'im' },
  { label: '设置', icon: '⚙️', path: '/pages/config/config', tab: true },
]
const visibleFeatures = computed(() =>
  features.filter((f) => !f.feature || hasFeature(f.feature, auth.effectiveFeatures, auth.features))
)

const iconGradients = [
  'linear-gradient(135deg, #fff3d6, #ffe0a0)',
  'linear-gradient(135deg, #e8f9e8, #d4f5d4)',
  'linear-gradient(135deg, #e8f1fb, #d0e8fb)',
  'linear-gradient(135deg, #fde8ea, #fbd4da)',
  'linear-gradient(135deg, #f3e8ff, #e8d4ff)',
  'linear-gradient(135deg, #fff0e6, #ffe0cc)',
  'linear-gradient(135deg, #e6f7f7, #ccf0f0)',
  'linear-gradient(135deg, #f0e6ff, #e0ccff)',
  'linear-gradient(135deg, #fff5f5, #ffe0e0)',
]
</script>

<style scoped>
.sec-title { font-size: 30rpx; font-weight: 700; color: var(--c-title); margin: 30rpx 6rpx 18rpx; }
.grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16rpx; }
.cell { background: var(--c-card); border-radius: 22rpx; padding: 28rpx 14rpx; display: flex; flex-direction: column; align-items: center; box-shadow: 0 4rpx 14rpx var(--c-shadow); transition: all 0.2s; animation: pop-in 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) both; animation-delay: calc(var(--i, 0) * 0.06s); }
.ic { width: 72rpx; height: 72rpx; border-radius: 20rpx; display: flex; align-items: center; justify-content: center; font-size: 36rpx; margin-bottom: 12rpx; }
.lb { color: var(--c-title); font-size: 24rpx; font-weight: 500; }
.press-feedback { transition: transform 0.15s, box-shadow 0.15s; }
.press-feedback:active { transform: scale(0.95); box-shadow: 0 2rpx 8rpx var(--c-shadow); }
@keyframes pop-in { from { opacity: 0; transform: scale(0.8) translateY(20rpx); } to { opacity: 1; transform: scale(1) translateY(0); } }
</style>
