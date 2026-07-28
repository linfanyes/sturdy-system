<template>
  <view class="page" :class="{ dark: theme.mode === 'dark' }">
    <view class="topbar"><text class="mtitle">📖 语文工具</text></view>
    <view class="grid">
      <view class="cell" @click="go('/pages/subject-tools/composition')"><view class="ic">✏️</view><view class="lb">作文素材</view></view>
      <view class="cell" @click="go('/pages/subject-tools/poetry')"><view class="ic">📜</view><view class="lb">古诗词助手</view></view>
      <view class="cell" @click="go('/pages/subject-tools/dictation')"><view class="ic">🎯</view><view class="lb">汉字听写</view></view>
      <view class="cell" @click="go('/pages/subject-tools/reading')"><view class="ic">📖</view><view class="lb">阅读理解</view></view>
      <view class="cell" @click="go('/pages/subject-tools/idiom')"><view class="ic">🔤</view><view class="lb">成语词典</view></view>
      <view class="cell" @click="go('/pages/subject-tools/pinyin')"><view class="ic">🔊</view><view class="lb">拼音标注</view></view>
    </view>
  </view>
</template>
<script setup>
import { theme } from '../../common/store'
function go(path) { uni.navigateTo({ url: path }) }
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
