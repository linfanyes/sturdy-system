<template>
  <!--
    通用记录卡片组件：用于获奖记录、奖励记录、行为记录等列表项。
    支持：左侧缩略图 + 中间标题/元信息 + 右侧操作按钮。
  -->
  <view class="record-card" :class="{ dark: theme.mode === 'dark' }">
    <image
      v-if="image"
      :src="image"
      class="thumb"
      mode="aspectFill"
      lazy-load
      @click="$emit('image-click', image)"
    ></image>
    <view class="mid">
      <view class="top">
        <text class="nm">{{ title }}</text>
        <text v-if="level" class="lv">{{ level }}</text>
      </view>
      <view v-if="meta" class="meta">{{ meta }}</view>
      <view v-if="tags && tags.length" class="tags">
        <text v-for="(t, i) in tags" :key="i" class="tag">#{{ t }}</text>
      </view>
      <view v-if="note" class="note">{{ note }}</view>
      <view v-if="score != null" class="score">评分：{{ score }} 分</view>
      <slot name="extra"></slot>
    </view>
    <view v-if="showActions" class="acts">
      <text class="a" @click="$emit('edit')">编辑</text>
      <text class="a del" @click="$emit('delete')">删除</text>
    </view>
    <slot name="actions"></slot>
  </view>
</template>

<script setup>
import { theme } from '../../common/store'

defineProps({
  title: { type: String, default: '' },
  image: { type: String, default: '' },
  level: { type: String, default: '' },
  meta: { type: String, default: '' },
  tags: { type: Array, default: () => [] },
  note: { type: String, default: '' },
  score: { type: [Number, null], default: null },
  showActions: { type: Boolean, default: true },
})

defineEmits(['edit', 'delete', 'image-click'])
</script>

<style scoped>
.record-card {
  display: flex;
  align-items: flex-start;
  padding: 24rpx;
  background: var(--c-card);
  border-radius: 16rpx;
  margin-bottom: 16rpx;
}
.thumb {
  width: 88rpx;
  height: 88rpx;
  border-radius: 12rpx;
  margin-right: 20rpx;
  flex-shrink: 0;
}
.mid {
  flex: 1;
  min-width: 0;
}
.top {
  display: flex;
  align-items: center;
  gap: 12rpx;
}
.nm {
  font-size: 30rpx;
  font-weight: 600;
  color: var(--c-text);
}
.lv {
  font-size: 22rpx;
  color: var(--c-primary);
  background: var(--c-primary-bg);
  padding: 2rpx 12rpx;
  border-radius: 8rpx;
}
.meta {
  font-size: 24rpx;
  color: var(--c-sub);
  margin-top: 6rpx;
}
.tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8rpx;
  margin-top: 8rpx;
}
.tag {
  font-size: 22rpx;
  color: var(--c-tag);
  background: var(--c-tag-bg);
  padding: 2rpx 10rpx;
  border-radius: 6rpx;
}
.note {
  font-size: 24rpx;
  color: var(--c-sub);
  margin-top: 8rpx;
  line-height: 1.5;
}
.score {
  font-size: 24rpx;
  color: var(--c-warning);
  margin-top: 8rpx;
}
.acts {
  display: flex;
  flex-direction: column;
  gap: 16rpx;
  margin-left: 16rpx;
}
.a {
  font-size: 26rpx;
  color: var(--c-primary);
  padding: 4rpx 8rpx;
}
.a.del {
  color: var(--c-danger);
}
</style>
