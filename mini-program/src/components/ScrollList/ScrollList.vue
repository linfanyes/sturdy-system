<template>
  <!-- 通用触底分页 scroll-view：统一 PAGE_SIZE + lower-threshold 行为 -->
  <scroll-view
    class="scroll-list"
    scroll-y
    :lower-threshold="threshold"
    :scroll-top="scrollTop"
    @scrolltolower="emit('load-more')"
    :refresher-enabled="refreshable"
    :refresher-triggered="refreshing"
    @refresherrefresh="emit('refresh')"
  >
    <view v-for="(item, idx) in items" :key="item.id || idx" class="scroll-item">
      <slot :item="item" :index="idx" />
    </view>
    <view v-if="loading" class="scroll-loading">加载中…</view>
    <view v-else-if="!hasMore && items.length" class="scroll-finished">— 没有更多了 —</view>
    <view v-else-if="!items.length && !loading" class="scroll-empty">
      <slot name="empty"><text class="empty-t">暂无数据</text></slot>
    </view>
    <view style="height: 20rpx" />
  </scroll-view>
</template>

<script setup>
/**
 * 通用触底分页列表组件。
 *
 * Props:
 *   items       列表数据
 *   loading     是否加载中
 *   hasMore     是否还有更多数据（false 显示"没有更多了"）
 *   scrollTop   滚动位置
 *   threshold   触底阈值（px），默认 150（来自 SCROLL_THRESHOLD）
 *   refreshable 是否启用下拉刷新
 *   refreshing  下拉刷新状态
 *
 * Emits: load-more refresh
 *
 * Slot: 默认 slot（作用域 { item, index }）+ empty slot
 */
defineProps({
  items: { type: Array, default: () => [] },
  loading: { type: Boolean, default: false },
  hasMore: { type: Boolean, default: true },
  scrollTop: { type: Number, default: 0 },
  threshold: { type: Number, default: 150 },
  refreshable: { type: Boolean, default: false },
  refreshing: { type: Boolean, default: false },
})
const emit = defineEmits(['load-more', 'refresh'])
</script>

<style scoped>
.scroll-list { flex: 1; height: 100%; box-sizing: border-box; }
.scroll-loading,
.scroll-finished,
.scroll-empty { text-align: center; padding: 30rpx 0; font-size: 24rpx; color: var(--c-sub); }
.empty-t { font-size: 28rpx; }
</style>
