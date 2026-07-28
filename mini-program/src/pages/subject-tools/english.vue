<template>
  <view class="page" :class="{ dark: theme.mode === 'dark' }">
    <view class="topbar"><text class="mtitle">🔤 英语工具</text></view>
    <view class="grid">
      <view class="cell" @click="go('/pages/subject-tools/wordCard')"><view class="ic">🃏</view><view class="lb">单词卡片</view></view>
      <view class="cell" @click="go('/pages/subject-tools/sentencePractice')"><view class="ic">💬</view><view class="lb">句型练习</view></view>
      <view class="cell" @click="go('/pages/subject-tools/listening')"><view class="ic">🎧</view><view class="lb">英语听力</view></view>
      <view class="cell" @click="go('/pages/subject-tools/grammar')"><view class="ic">📐</view><view class="lb">语法练习</view></view>
      <view class="cell" @click="go('/pages/subject-tools/spell')"><view class="ic">🔤</view><view class="lb">单词拼写</view></view>
      <view class="cell" @click="go('/pages/subject-tools/speaking')"><view class="ic">🎤</view><view class="lb">口语练习</view></view>
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
