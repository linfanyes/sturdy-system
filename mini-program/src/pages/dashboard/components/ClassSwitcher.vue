<template>
  <view class="class-switcher" v-if="classList.length > 1">
    <picker mode="selector" :range="classList" range-key="name" @change="onClassChange">
      <view class="cs-picker">
        <text class="cs-label">🏫 {{ currentClass?.name || '选择班级' }}</text>
        <text class="cs-arrow">▾</text>
      </view>
    </picker>
  </view>
</template>

<script setup>
import { computed } from 'vue'
const props = defineProps({
  classList: { type: Array, default: () => [] },
  currentClassIdx: { type: Number, default: 0 },
})
const emit = defineEmits(['classChange'])

const currentClass = computed(() => props.classList[props.currentClassIdx] || null)
function onClassChange(e) { emit('classChange', e.detail.value) }
</script>

<style scoped>
.class-switcher { margin-bottom: 12rpx; }
.cs-picker { display: flex; align-items: center; justify-content: space-between; background: var(--c-card); border-radius: 12rpx; padding: 14rpx 20rpx; }
.cs-label { font-size: 28rpx; font-weight: 700; color: var(--c-title); }
.cs-arrow { font-size: 24rpx; color: var(--c-sub); }
</style>
