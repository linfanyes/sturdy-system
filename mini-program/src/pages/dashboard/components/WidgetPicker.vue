<template>
  <view class="card widget-card">
    <view class="card-h">
      <view class="widget-title-row">
        <view class="widget-ic">🛠️</view>
        <text class="ch-t">课堂神器</text>
      </view>
      <text class="ch-m toggle-btn press-feedback" @click="managing = !managing">{{ managing ? '完成' : '管理' }}</text>
    </view>
    <view v-if="!managing" class="wgrid">
      <view v-for="(w, i) in chosenWidgets" :key="w.label" class="wcell press-feedback" :style="{ '--i': i }" @click="$emit('goWidget', w)">
        <view class="wic">{{ w.icon }}</view>
        <view class="wlb">{{ w.label }}</view>
      </view>
      <view v-if="!chosenWidgets.length" class="empty">
        <text class="empty-icon">🧰</text>
        <text>点「管理」添加常用工具</text>
      </view>
    </view>
    <view v-else class="wgrid">
      <view v-for="(w, i) in visibleWidgetCands" :key="w.label" class="wcell" :class="selKeys.includes(w.label) && 'on'" :style="{ '--i': i }" @click="toggleWidget(w)">
        <view class="wic">{{ w.icon }}</view>
        <view class="wlb">{{ w.label }}</view>
        <view v-if="selKeys.includes(w.label)" class="wcheck">✓</view>
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
.widget-card { margin-top: 20rpx; background: linear-gradient(135deg, var(--c-card) 0%, #fefcf7 100%); border-radius: 24rpx; padding: 24rpx; box-shadow: 0 4rpx 20rpx var(--c-shadow); position: relative; overflow: hidden; }
.widget-card::before { content: ''; position: absolute; top: 0; left: 15%; right: 15%; height: 2rpx; background: linear-gradient(90deg, transparent, rgba(245,179,66,0.4), transparent); }
.card-h { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16rpx; }
.widget-title-row { display: flex; align-items: center; gap: 12rpx; }
.widget-ic { width: 44rpx; height: 44rpx; border-radius: 12rpx; background: linear-gradient(135deg, #f3e8ff, #e8d4ff); display: flex; align-items: center; justify-content: center; font-size: 24rpx; }
.ch-t { font-size: 28rpx; font-weight: 700; color: var(--c-title); }
.toggle-btn { background: var(--c-input); padding: 6rpx 16rpx; border-radius: 20rpx; }
.wgrid { display: grid; grid-template-columns: repeat(5, 1fr); gap: 14rpx; }
.wcell { display: flex; flex-direction: column; align-items: center; padding: 18rpx 6rpx; border-radius: 16rpx; background: var(--c-input); position: relative; transition: all 0.2s; animation: pop-in 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) both; animation-delay: calc(var(--i, 0) * 0.05s); }
.wcell.on { outline: 3rpx solid var(--c-accent); background: linear-gradient(135deg, #fff8e8, #fff3d6); }
.wic { font-size: 44rpx; }
.wlb { margin-top: 8rpx; font-size: 22rpx; color: var(--c-title); }
.wcheck { position: absolute; top: 6rpx; right: 6rpx; width: 24rpx; height: 24rpx; border-radius: 50%; background: var(--c-accent); color: #fff; font-size: 16rpx; display: flex; align-items: center; justify-content: center; animation: bounce-in 0.3s cubic-bezier(0.34, 1.56, 0.64, 1) both; }
.wtip { grid-column: 1 / -1; text-align: center; font-size: 22rpx; color: var(--c-sub); padding: 8rpx 0; }
.empty { grid-column: 1 / -1; text-align: center; color: var(--c-sub); padding: 30rpx 0; font-size: 24rpx; display: flex; flex-direction: column; align-items: center; gap: 8rpx; }
.empty-icon { font-size: 40rpx; opacity: 0.4; }
.press-feedback { transition: transform 0.15s; }
.press-feedback:active { transform: scale(0.92); }
@keyframes pop-in { from { opacity: 0; transform: scale(0.8); } to { opacity: 1; transform: scale(1); } }
@keyframes bounce-in { 0% { transform: scale(0); } 50% { transform: scale(1.2); } 100% { transform: scale(1); } }
</style>
