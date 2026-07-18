<template>
  <view class="page" :class="{ dark }">
    <view class="card">
      <view class="sec-title">🌸 笑口常开</view>
      <view class="hint">点 8 下，让花朵从花骨朵到盛开，给心情放个假～</view>

      <view class="bloom">
        <text class="flower">{{ stages[stage] }}</text>
        <view class="stage-text">{{ stageText }}</view>
      </view>

      <button class="gen" @click="bloom">{{ stage >= max ? '再开一朵 🌼' : '点一下 (' + stage + '/' + max + ')' }}</button>
    </view>
  </view>
</template>

<script setup>
import { ref, computed } from 'vue'
import { theme } from '../../common/store'
const dark = theme.dark

const max = 8
const stages = ['🌱', '🌿', '🌷', '🌼', '🌺', '💐', '🌸', '🌸', '🌸']
const stageTexts = [
  '一颗小种子，埋进土里',
  '冒出嫩绿的新芽',
  '长出了花苞',
  '花苞微微张开',
  '花瓣舒展出来',
  '越来越美了',
  '快要盛开啦',
  '完全盛开，真好看！',
  '心情也跟着绽放了 🌸',
]
const stage = ref(0)
const stageText = computed(() => stageTexts[stage.value] || '')

function bloom() {
  if (stage.value >= max) {
    stage.value = 0
    uni.showToast({ title: '新的一朵', icon: 'none' })
    return
  }
  stage.value += 1
  if (stage.value >= max) uni.vibrateShort && uni.vibrateShort({ fail() {} })
}
</script>

<style scoped>
.page { padding: 30rpx; background: var(--c-bg); min-height: 100vh; box-sizing: border-box; }
.card { background: var(--c-card); border-radius: 20rpx; padding: 40rpx; text-align: center; }
.sec-title { font-size: 32rpx; font-weight: 700; color: var(--c-accent); }
.hint { font-size: 24rpx; color: var(--c-sub); margin: 12rpx 0 30rpx; }
.bloom { padding: 40rpx 0; }
.flower { font-size: 200rpx; line-height: 1; transition: all .3s; }
.stage-text { margin-top: 24rpx; font-size: 28rpx; color: var(--c-title); }
.gen { background: #e6a23c; color: #fff; border-radius: 50rpx; font-size: 30rpx; margin-top: 20rpx; }
</style>
