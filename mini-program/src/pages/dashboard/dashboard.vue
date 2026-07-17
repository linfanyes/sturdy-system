<template>
  <view class="page">
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
import { auth } from '../../common/store'

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
}
.header {
  padding: 30rpx 20rpx 40rpx;
}
.hi {
  font-size: 44rpx;
  font-weight: 700;
  color: #4a3f35;
}
.school {
  color: #9aa0a6;
  margin-top: 8rpx;
}
.grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 24rpx;
}
.cell {
  background: #fff;
  border-radius: 24rpx;
  padding: 40rpx 20rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  box-shadow: 0 6rpx 20rpx rgba(230, 162, 60, 0.08);
}
.ic {
  font-size: 70rpx;
}
.lb {
  margin-top: 16rpx;
  color: #4a3f35;
  font-size: 30rpx;
}
</style>
