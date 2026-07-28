<template>
  <view class="page" :class="{ dark: theme.mode === 'dark' }">
    <view class="topbar"><text class="mtitle">💼 办公工具</text></view>
    <view class="grid">
      <view class="cell" @click="go('/pages/office-tools/translate')"><view class="ic">🌐</view><view class="lb">翻译助手</view></view>
      <view class="cell" @click="go('/pages/office-tools/thesis')"><view class="ic">📝</view><view class="lb">教育论文</view></view>
      <view class="cell" @click="go('/pages/office-tools/blackboard')"><view class="ic">🎨</view><view class="lb">黑板报</view></view>
      <view class="cell" @click="go('/pages/office-tools/speech')"><view class="ic">🎤</view><view class="lb">演讲稿</view></view>
      <view class="cell" @click="go('/pages/office-tools/comment')"><view class="ic">💬</view><view class="lb">评语生成</view></view>
      <view class="cell" @click="go('/pages/office-tools/summary')"><view class="ic">📋</view><view class="lb">期末总结</view></view>
    </view>
  </view>
</template>
<script setup>
import { useRouter } from '@dcloudio/uni-app'
import { theme } from '../../common/store'
const router = useRouter()
function go(path) { router.push(path) }
</script>
<style scoped>
.page { padding: 30rpx; background: var(--c-bg); min-height: 100vh; }
.topbar { margin-bottom: 20rpx; }
.mtitle { font-size: 36rpx; font-weight: 800; color: var(--c-title); }
.grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16rpx; }
.cell { background: var(--c-card); border-radius: 16rpx; padding: 24rpx 16rpx; text-align: center; }
.ic { font-size: 48rpx; margin-bottom: 8rpx; }
.lb { font-size: 24rpx; color: var(--c-text); font-weight: 600; }
</style>
