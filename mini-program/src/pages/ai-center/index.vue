<template>
  <view class="page" :class="{ dark: theme.mode === 'dark' }">
    <view class="topbar">
      <text class="mtitle">🤖 AI 备课中心</text>
    </view>

    <view class="section">
      <view class="sec-title">📚 备课资源</view>
      <view class="grid">
        <view class="cell" @click="go('/pages/ai/ai-lesson')">
          <view class="ic">📄</view>
          <view class="lb">优质教案</view>
        </view>
        <view class="cell" @click="go('/pages/ai/ai-knowledge')">
          <view class="ic">💡</view>
          <view class="lb">知识点生成</view>
        </view>
        <view class="cell" @click="go('/pages/ai/ai-paper')">
          <view class="ic">📃</view>
          <view class="lb">优选试卷</view>
        </view>
        <view class="cell" @click="go('/pages/ai/ai-interactive')">
          <view class="ic">🎯</view>
          <view class="lb">互动讲义</view>
        </view>
        <view class="cell" @click="go('/pages/ai/ai-exam')">
          <view class="ic">📊</view>
          <view class="lb">考试分析</view>
        </view>
        <view class="cell" @click="go('/pages/community/image-creation')">
          <view class="ic">🎨</view>
          <view class="lb">图像创造</view>
        </view>
      </view>
    </view>

    <view class="section">
      <view class="sec-title">📖 资源库</view>
      <view class="grid">
        <view class="cell" @click="go('/pages/community/resource')">
          <view class="ic">📚</view>
          <view class="lb">在线资源</view>
        </view>
        <view class="cell" @click="go('/pages/crud/crud?type=lesson-plan-templates')">
          <view class="ic">📋</view>
          <view class="lb">教案模板</view>
        </view>
        <view class="cell" @click="go('/pages/crud/crud?type=generated/knowledges')">
          <view class="ic">🧠</view>
          <view class="lb">知识点库</view>
        </view>
        <view class="cell" @click="go('/pages/crud/crud?type=generated/lesson-plans')">
          <view class="ic">📄</view>
          <view class="lb">教案库</view>
        </view>
        <view class="cell" @click="go('/pages/crud/crud?type=generated/papers')">
          <view class="ic">📑</view>
          <view class="lb">试卷库</view>
        </view>
        <view class="cell" @click="go('/pages/crud/crud?type=generated/queries')">
          <view class="ic">🔍</view>
          <view class="lb">试卷查询</view>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup>
import { theme } from '../../common/store'

function go(path) {
  uni.navigateTo({ url: path })
}
</script>

<style scoped>
.page { padding: 30rpx; background: var(--c-bg); min-height: 100vh; }
.topbar { margin-bottom: 20rpx; }
.mtitle { font-size: 36rpx; font-weight: 800; color: var(--c-title); }
.section { margin-bottom: 24rpx; }
.sec-title { font-size: 28rpx; font-weight: 700; color: var(--c-title); margin-bottom: 16rpx; }
.grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16rpx; }
.cell { background: var(--c-card); border-radius: 16rpx; padding: 24rpx 16rpx; text-align: center; }
.ic { font-size: 48rpx; margin-bottom: 8rpx; }
.lb { font-size: 24rpx; color: var(--c-text); font-weight: 600; }
</style>
