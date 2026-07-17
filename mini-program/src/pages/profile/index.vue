<template>
  <view class="min-h-screen p-4 pb-24">
    <view class="card-soft p-5 mb-4">
      <view class="flex items-center gap-4">
        <view class="w-16 h-16 rounded-full bg-butter-300/60 flex items-center justify-center text-4xl">
          {{ userStore.user?.avatar || '👨‍🏫' }}
        </view>
        <view>
          <h2 class="text-xl font-bold text-cocoa-900">{{ userStore.user?.name }}</h2>
          <p class="text-sm text-cocoa-300">{{ userStore.user?.school }}</p>
        </view>
      </view>
    </view>

    <view class="card-soft overflow-hidden mb-4">
      <view
        v-for="(item, index) in menuItems"
        :key="item.label"
        @click="handleMenuItem(item)"
        class="flex items-center justify-between p-4 border-b border-cocoa-100/60"
        :class="{ 'border-b-0': index === menuItems.length - 1 }"
      >
        <view class="flex items-center gap-3">
          <text class="text-xl">{{ item.icon }}</text>
          <text class="text-cocoa-900">{{ item.label }}</text>
        </view>
        <text class="text-cocoa-300">›</text>
      </view>
    </view>

    <view class="card-soft overflow-hidden">
      <view
        v-for="(item, index) in settingsItems"
        :key="item.label"
        class="flex items-center justify-between p-4 border-b border-cocoa-100/60"
        :class="{ 'border-b-0': index === settingsItems.length - 1 }"
      >
        <view class="flex items-center gap-3">
          <text class="text-xl">{{ item.icon }}</text>
          <text class="text-cocoa-900">{{ item.label }}</text>
        </view>
        <view v-if="item.switch" class="flex items-center">
          <switch :checked="item.checked" @change="handleSwitch(item)" />
        </view>
        <text v-else class="text-cocoa-300">›</text>
      </view>
    </view>

    <button @click="handleLogout" class="btn-secondary w-full mt-6">
      退出登录
    </button>

    <view class="text-center text-cocoa-300 text-sm mt-4">
      <p>园丁工作台 v0.0.1</p>
    </view>
  </view>
</template>

<script setup lang="ts">
import { useUserStore } from '../../stores/user'

const userStore = useUserStore()

const menuItems = [
  { icon: '📝', label: '我的笔记', action: 'notes' },
  { icon: '📅', label: '我的课表', action: 'schedule' },
  { icon: '📇', label: '教师通讯录', action: 'teachers' },
  { icon: '📚', label: '教学资源', action: 'resource' },
]

const settingsItems = [
  { icon: '🌙', label: '深色模式', switch: true, checked: userStore.theme === 'dark', action: 'theme' },
  { icon: '🎨', label: '主题色', action: 'color' },
  { icon: '🔤', label: '字号大小', action: 'font' },
  { icon: '📱', label: '关于我们', action: 'about' },
]

const handleMenuItem = (item: { action: string }) => {
  uni.showToast({ title: `${item.action}功能开发中`, icon: 'none' })
}

const handleSwitch = (item: { action: string; checked: boolean }) => {
  if (item.action === 'theme') {
    userStore.setTheme(item.checked ? 'dark' : 'light')
  }
}

const handleLogout = () => {
  uni.showModal({
    title: '确认退出',
    content: '退出后将返回登录页',
    success: (res) => {
      if (res.confirm) {
        userStore.logout()
        uni.redirectTo({ url: '/pages/login/index' })
      }
    },
  })
}
</script>
