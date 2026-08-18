<template>
  <!--
    学生头像+姓名组件：用于列表页、选择器、卡片等场景。
    支持：头像/姓名/学号/额外信息。
  -->
  <view class="student-avatar" :class="{ dark: theme.mode === 'dark' }">
    <view class="avatar" :style="{ backgroundColor: bgColor }">
      {{ avatarText }}
    </view>
    <view class="info">
      <view class="name-row">
        <text class="name">{{ name }}</text>
        <text v-if="no" class="no">{{ no }}</text>
      </view>
      <text v-if="extra" class="extra">{{ extra }}</text>
      <slot name="extra"></slot>
    </view>
    <slot name="right"></slot>
  </view>
</template>

<script setup>
import { computed } from 'vue'
import { theme } from '../../common/store'

const props = defineProps({
  name: { type: String, default: '' },
  avatar: { type: String, default: '' },
  no: { type: String, default: '' },
  extra: { type: String, default: '' },
  color: { type: String, default: '' },
})

const avatarText = computed(() => {
  if (props.avatar) return props.avatar
  return props.name ? props.name.slice(0, 1) : '?'
})

const bgColor = computed(() => {
  if (props.color) return props.color
  // 根据名字生成稳定色
  const colors = ['#ff9a9e', '#a18cd1', '#fbc2eb', '#a1c4fd', '#c2e9fb', '#d4fc79', '#96e6a1']
  let hash = 0
  for (let i = 0; i < props.name.length; i++) {
    hash = props.name.charCodeAt(i) + ((hash << 5) - hash)
  }
  return colors[Math.abs(hash) % colors.length]
})
</script>

<style scoped>
.student-avatar {
  display: flex;
  align-items: center;
  gap: 16rpx;
}
.avatar {
  width: 72rpx;
  height: 72rpx;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 32rpx;
  color: #fff;
  font-weight: 600;
  flex-shrink: 0;
}
.info {
  flex: 1;
  min-width: 0;
}
.name-row {
  display: flex;
  align-items: center;
  gap: 12rpx;
}
.name {
  font-size: 28rpx;
  font-weight: 600;
  color: var(--c-text);
}
.no {
  font-size: 22rpx;
  color: var(--c-sub);
  background: var(--c-card2);
  padding: 2rpx 10rpx;
  border-radius: 8rpx;
}
.extra {
  font-size: 24rpx;
  color: var(--c-sub);
  margin-top: 4rpx;
}
</style>
