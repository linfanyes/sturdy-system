<template>
  <view class="page" :class="{ dark: theme.mode === 'dark' }">
    <view class="topbar"><text class="mtitle">🔢 数学工具</text></view>
    <view class="grid">
      <view class="cell" @click="go('/pages/tools/math')"><view class="ic">🧮</view><view class="lb">口算练习</view></view>
      <view class="cell" @click="go('/pages/tools/verticalCalc')"><view class="ic">📐</view><view class="lb">竖式计算</view></view>
      <view class="cell" @click="go('/pages/tools/multiplicationTable')"><view class="ic">✖️</view><view class="lb">乘法表</view></view>
      <view class="cell" @click="go('/pages/tools/unitConversion')"><view class="ic">📏</view><view class="lb">单位换算</view></view>
      <view class="cell" @click="go('/pages/tools/mathMistakes')"><view class="ic">❌</view><view class="lb">错题本</view></view>
      <view class="cell" @click="go('/pages/tools/calc')"><view class="ic">🔢</view><view class="lb">计算器</view></view>
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
