<template>
  <view class="page" :class="{ dark: theme.mode === 'dark' }">
    <view class="header">
      <view class="hi">{{ greeting }}，{{ auth.user?.name || '老师' }}</view>
      <view class="school">{{ auth.user?.school || '未设置学校' }}</view>
    </view>

    <view class="grid">
      <view
        v-for="f in features"
        :key="f.path"
        class="cell"
        @click="go(f)"
      >
        <view class="ic">{{ f.icon }}</view>
        <view class="lb">{{ f.label }}</view>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref, computed } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { auth, theme } from '../../common/store'

const features = [
  { label: '班级管理', icon: '🏫', path: '/pages/classes/classes', tab: true },
  { label: '学生管理', icon: '👧', path: '/pages/students/students', tab: true },
  { label: '考试管理', icon: '📝', path: '/pages/exams/exams' },
  { label: '成绩管理', icon: '📊', path: '/pages/grades/grades' },
  { label: '座位表', icon: '💺', path: '/pages/seats/seats' },
  { label: 'AI 助手', icon: '🤖', path: '/pages/ai/ai' },
  { label: '工具箱', icon: '🧰', path: '/pages/toolbox/toolbox', tab: true },
  { label: '设置', icon: '⚙️', path: '/pages/config/config', tab: true },
]

const hour = new Date().getHours()
const greeting = computed(() =>
  hour < 11 ? '早上好' : hour < 14 ? '中午好' : hour < 18 ? '下午好' : '晚上好',
)

function go(f) {
  if (f.tab) uni.switchTab({ url: f.path })
  else uni.navigateTo({ url: f.path })
}

onShow(() => {
  if (!auth.token) uni.reLaunch({ url: '/pages/login/login' })
})
</script>

<style scoped>
.page {
  padding: 30rpx;
  background: var(--c-bg);
  min-height: 100vh;
  box-sizing: border-box;
}
.header {
  padding: 30rpx 20rpx 40rpx;
}
.hi {
  font-size: 44rpx;
  font-weight: 700;
  color: var(--c-title);
}
.school {
  color: var(--c-sub);
  margin-top: 8rpx;
}
.grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 24rpx;
}
.cell {
  background: var(--c-card);
  border-radius: 24rpx;
  padding: 40rpx 20rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  box-shadow: 0 6rpx 20rpx var(--c-shadow);
}
.ic {
  font-size: 70rpx;
}
.lb {
  margin-top: 16rpx;
  color: var(--c-title);
  font-size: 30rpx;
}
</style>
