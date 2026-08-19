<template>
  <view>
    <view class="sec-title">功能入口</view>
    <view class="grid">
      <view v-for="f in visibleFeatures" :key="f.path" class="cell" @click="$emit('go', f)">
        <view class="ic">{{ f.icon }}</view>
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
</script>

<style scoped>
.sec-title { font-size: 30rpx; font-weight: 700; color: var(--c-title); margin: 30rpx 6rpx 18rpx; }
.grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16rpx; }
.cell { background: var(--c-card); border-radius: 20rpx; padding: 28rpx 14rpx; display: flex; flex-direction: column; align-items: center; box-shadow: 0 4rpx 14rpx var(--c-shadow); }
.ic { font-size: 52rpx; }
.lb { margin-top: 12rpx; color: var(--c-title); font-size: 26rpx; }
</style>
