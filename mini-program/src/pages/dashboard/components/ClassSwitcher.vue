<template>
  <view class="class-switcher" v-if="classList.length > 1">
    <picker mode="selector" :range="classList" range-key="name" @change="onClassChange">
      <view class="cs-picker press-feedback">
        <view class="cs-left">
          <view class="cs-ic">🏫</view>
          <text class="cs-label">{{ currentClass?.name || '选择班级' }}</text>
        </view>
        <text class="cs-arrow" :class="pickerOpen && 'open'">▾</text>
      </view>
    </picker>
  </view>
</template>

<script setup>
import { computed, ref } from 'vue'
const props = defineProps({
  classList: { type: Array, default: () => [] },
  currentClassIdx: { type: Number, default: 0 },
})
const emit = defineEmits(['classChange'])

const currentClass = computed(() => props.classList[props.currentClassIdx] || null)
const pickerOpen = ref(false)
function onClassChange(e) { emit('classChange', e.detail.value) }
</script>

<style scoped>
.class-switcher { margin-bottom: 12rpx; }
.cs-picker { display: flex; align-items: center; justify-content: space-between; background: linear-gradient(135deg, var(--c-card) 0%, #fefcf7 100%); border-radius: 16rpx; padding: 16rpx 24rpx; box-shadow: 0 4rpx 16rpx var(--c-shadow); border: 2rpx solid rgba(255,255,255,0.6); transition: all 0.2s; }
.cs-left { display: flex; align-items: center; gap: 12rpx; }
.cs-ic { width: 40rpx; height: 40rpx; border-radius: 12rpx; background: linear-gradient(135deg, #fff3d6, #ffe0a0); display: flex; align-items: center; justify-content: center; font-size: 22rpx; }
.cs-label { font-size: 28rpx; font-weight: 700; color: var(--c-title); }
.cs-arrow { font-size: 24rpx; color: var(--c-sub); transition: transform 0.2s; }
.cs-arrow.open { transform: rotate(180deg); }
.press-feedback { transition: transform 0.15s, box-shadow 0.15s; }
.press-feedback:active { transform: scale(0.98); box-shadow: 0 2rpx 8rpx var(--c-shadow); }
</style>
