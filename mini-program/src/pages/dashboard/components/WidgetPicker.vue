<template>
  <view class="card">
    <view class="card-h">
      <text class="ch-t">🛠️ 课堂神器</text>
      <text class="ch-m" @click="managing = !managing">{{ managing ? '完成' : '管理' }}</text>
    </view>
    <view v-if="!managing" class="wgrid">
      <view v-for="w in chosenWidgets" :key="w.label" class="wcell" @click="$emit('goWidget', w)">
        <view class="wic">{{ w.icon }}</view>
        <view class="wlb">{{ w.label }}</view>
      </view>
      <view v-if="!chosenWidgets.length" class="empty">点「管理」添加常用工具</view>
    </view>
    <view v-else class="wgrid">
      <view v-for="w in visibleWidgetCands" :key="w.label" class="wcell" :class="selKeys.includes(w.label) && 'on'" @click="toggleWidget(w)">
        <view class="wic">{{ w.icon }}</view>
        <view class="wlb">{{ w.label }}</view>
      </view>
      <view class="wtip">已选 {{ selKeys.length }}/5，点击切换</view>
    </view>
  </view>
</template>

<script setup>
import { ref, computed } from 'vue'
import { hasFeature } from '../../../common/feature'
import { auth } from '../../../common/store'

defineEmits(['goWidget'])

const widgetCands = [
  { label: '计时器', icon: '⏱️', path: '/pages/tools/timer', feature: 'tools' },
  { label: '抽签', icon: '🎲', path: '/pages/tools/picker', feature: 'tools' },
  { label: '计算器', icon: '🧮', path: '/pages/tools/calc', feature: 'tools' },
  { label: '口算', icon: '➗', path: '/pages/tools/math', feature: 'tools' },
  { label: '错题本', icon: '📕', path: '/pages/tools/mathMistakes', feature: 'tools' },
  { label: '决策器', icon: '🔀', path: '/pages/tools/decider', feature: 'tools' },
  { label: '随机分组', icon: '👥', path: '/pages/community/grouper' },
  { label: '座位表', icon: '💺', path: '/pages/teaching/seatMap', feature: 'seats' },
]
const visibleWidgetCands = computed(() =>
  widgetCands.filter((w) => !w.feature || hasFeature(w.feature, auth.effectiveFeatures, auth.features))
)
const selKeys = ref(uni.getStorageSync('dash_widgets') || widgetCands.slice(0, 4).map((w) => w.label))
const managing = ref(false)

const chosenWidgets = computed(() => visibleWidgetCands.value.filter((w) => selKeys.value.includes(w.label)))

function toggleWidget(w) {
  const i = selKeys.value.indexOf(w.label)
  if (i >= 0) selKeys.value.splice(i, 1)
  else {
    if (selKeys.value.length >= 5) return uni.showToast({ title: '最多勾选 5 个', icon: 'none' })
    selKeys.value.push(w.label)
  }
  uni.setStorageSync('dash_widgets', selKeys.value)
}
</script>

<style scoped>
.card { margin-top: 20rpx; background: var(--c-card); border-radius: 20rpx; padding: 24rpx; box-shadow: 0 2rpx 10rpx var(--c-shadow); }
.card-h { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12rpx; }
.ch-t { font-size: 28rpx; font-weight: 700; color: var(--c-title); }
.ch-m { font-size: 22rpx; color: var(--c-sub); }
.wgrid { display: grid; grid-template-columns: repeat(5, 1fr); gap: 14rpx; }
.wcell { display: flex; flex-direction: column; align-items: center; padding: 18rpx 6rpx; border-radius: 16rpx; background: var(--c-input); }
.wcell.on { outline: 3rpx solid var(--c-accent); }
.wic { font-size: 44rpx; }
.wlb { margin-top: 8rpx; font-size: 22rpx; color: var(--c-title); }
.wtip { grid-column: 1 / 5; text-align: center; font-size: 22rpx; color: var(--c-sub); }
.empty { text-align: center; color: var(--c-sub); padding: 30rpx 0; font-size: 24rpx; }
</style>
