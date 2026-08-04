<template>
  <view class="page" :class="dark && 'dark'">
    <view class="head">
      <text class="back" @click="goBack">← 返回</text>
      <text class="title">👑 超管仪表盘</text>
      <text class="placeholder"></text>
    </view>

    <scroll-view scroll-y class="body">
      <view class="stats">
        <view class="stat-card">
          <text class="stat-num">{{ stats.schools }}</text>
          <text class="stat-lbl">学校数</text>
        </view>
        <view class="stat-card">
          <text class="stat-num">{{ stats.admins }}</text>
          <text class="stat-lbl">校管理员</text>
        </view>
        <view class="stat-card">
          <text class="stat-num">{{ stats.teachers }}</text>
          <text class="stat-lbl">教师数</text>
        </view>
        <view class="stat-card">
          <text class="stat-num">{{ stats.students }}</text>
          <text class="stat-lbl">学生数</text>
        </view>
      </view>

      <view class="sec">
        <text class="sec-t">快捷入口</text>
        <view class="grid">
          <view class="cell" @click="go('/pages/admin/admin', 'school')">
            <text class="ic">🏫</text>
            <text class="lb">学校管理</text>
          </view>
          <view class="cell" @click="go('/pages/admin/admin', 'admin')">
            <text class="ic">👤</text>
            <text class="lb">校管理员</text>
          </view>
          <view class="cell" @click="go('/pages/school-admin/school-features')">
            <text class="ic">⚙️</text>
            <text class="lb">功能包</text>
          </view>
          <view class="cell" @click="go('/pages/admin/admin', 'config')">
            <text class="ic">🔧</text>
            <text class="lb">平台配置</text>
          </view>
          <view class="cell" @click="go('/pages/admin/admin', 'ai')">
            <text class="ic">🤖</text>
            <text class="lb">AI厂商</text>
          </view>
        </view>
      </view>
    </scroll-view>
  </view>
</template>

<script setup>
import { ref, computed } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { theme } from '../../common/store'
import { api } from '../../common/request'

const dark = computed(() => theme.mode === 'dark')
const stats = ref({ schools: 0, admins: 0, teachers: 0, students: 0 })

function goBack() {
  const pages = getCurrentPages()
  if (pages && pages.length > 1) uni.navigateBack()
  else uni.redirectTo({ url: '/pages/admin/admin' })
}

function go(url, tab) {
  if (tab) {
    uni.redirectTo({ url, success: () => {
      const pages = getCurrentPages()
      const page = pages[pages.length - 1]
      if (page && page.$vm && page.$vm.switchTab) {
        page.$vm.switchTab(tab)
      }
    }})
  } else {
    uni.redirectTo({ url })
  }
}

async function load() {
  try {
    const [schoolsRes, adminsRes, teachersRes] = await Promise.all([
      api.get('/admin/schools?take=1').catch(() => ({ total: 0 })),
      api.get('/admin/school-admins?take=1').catch(() => ({ total: 0 })),
      api.get('/admin/teachers?take=1').catch(() => ({ total: 0 })),
    ])
    stats.value = {
      schools: schoolsRes?.total || 0,
      admins: adminsRes?.total || 0,
      teachers: teachersRes?.total || 0,
      students: 0,
    }
  } catch (e) {
    // 加载失败不阻断，保持 0
  }
}

onLoad(() => {
  load()
})
</script>

<style scoped>
.page { background: var(--c-bg); min-height: 100vh; }
.head { display: flex; align-items: center; justify-content: space-between; padding: 24rpx 32rpx; border-bottom: 1px solid var(--c-line); }
.back { font-size: 32rpx; color: var(--c-primary); }
.title { font-size: 34rpx; font-weight: 700; color: var(--c-title); }
.placeholder { width: 80rpx; }
.body { padding: 24rpx; }
.stats { display: grid; grid-template-columns: repeat(2, 1fr); gap: 20rpx; margin-bottom: 32rpx; }
.stat-card { background: var(--c-card); border-radius: 20rpx; padding: 32rpx 24rpx; text-align: center; box-shadow: 0 4rpx 12rpx rgba(0,0,0,0.04); }
.stat-num { font-size: 48rpx; font-weight: 800; color: var(--c-primary); }
.stat-lbl { font-size: 26rpx; color: var(--c-sub); margin-top: 8rpx; }
.sec { margin-bottom: 32rpx; }
.sec-t { font-size: 30rpx; font-weight: 700; color: var(--c-title); margin-bottom: 16rpx; display: block; }
.grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16rpx; }
.cell { background: var(--c-card); border-radius: 16rpx; padding: 24rpx 16rpx; text-align: center; box-shadow: 0 4rpx 12rpx rgba(0,0,0,0.04); }
.ic { font-size: 44rpx; display: block; margin-bottom: 8rpx; }
.lb { font-size: 24rpx; color: var(--c-sub); }
</style>
