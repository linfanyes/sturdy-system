<template>
  <!-- 通用公告/信息区块：标题 + 操作按钮 + 内容条目列表 -->
  <view class="notice-section">
    <view class="notice-hd">
      <text class="notice-title">{{ icon }} {{ title }}</text>
      <slot name="action"><text v-if="action" class="act" @click="emit('action')">{{ action }}</text></slot>
    </view>
    <view class="notice-list">
      <EmptyState v-if="!items.length && empty" :icon="empty.icon" :text="empty.text" :hint="empty.hint" />
      <view v-for="(n, i) in items" :key="n.id || i" class="notice-item">
        <view class="notice-item-hd">
          <text class="notice-item-title">{{ n.title }}</text>
          <text v-if="n.deletable" class="act del" @click.stop="emit('delete', n)">删除</text>
        </view>
        <text class="notice-item-content" v-if="n.content">{{ n.content }}</text>
        <text class="notice-item-time">{{ n.createdAt ? n.createdAt.slice(0, 10) : '' }}</text>
      </view>
    </view>
  </view>
</template>

<script setup>
/**
 * 通用公告/信息区块组件。
 *
 * Props:
 *   title      标题
 *   icon       图标（emoji）
 *   action     操作按钮文案（可选）
 *   items      条目列表（每项至少含 id/title，可含 content/createdAt/deletable）
 *   empty      空态配置 { icon, text, hint }
 *
 * Emits: action, delete(item)
 */
defineProps({
  title: { type: String, default: '' },
  icon: { type: String, default: '📢' },
  action: { type: String, default: '' },
  items: { type: Array, default: () => [] },
  empty: { type: Object, default: () => ({ icon: '📭', text: '暂无', hint: '' }) },
})
defineEmits(['action', 'delete'])
</script>

<style scoped>
.notice-section { margin: 20rpx 24rpx; background: var(--c-card); border-radius: 16rpx; padding: 24rpx 24rpx 20rpx; box-shadow: 0 4rpx 14rpx var(--c-shadow); }
.notice-hd { display: flex; align-items: center; justify-content: space-between; margin-bottom: 14rpx; }
.notice-title { font-size: 28rpx; font-weight: 700; color: var(--c-title); }
.act { font-size: 24rpx; color: var(--c-primary); padding: 6rpx 14rpx; border-radius: 20rpx; background: rgba(79,140,255,0.1); }
.act:active { opacity: 0.7; }
.act.del { color: #e64340; background: rgba(230,67,64,0.08); }
.notice-list { display: flex; flex-direction: column; gap: 12rpx; }
.notice-item { padding: 16rpx 0; border-bottom: 1rpx solid var(--c-border); }
.notice-item:last-child { border-bottom: none; }
.notice-item-hd { display: flex; align-items: center; justify-content: space-between; margin-bottom: 6rpx; }
.notice-item-title { font-size: 26rpx; font-weight: 600; color: var(--c-title); flex: 1; }
.notice-item-content { font-size: 24rpx; color: var(--c-text); line-height: 1.6; }
.notice-item-time { font-size: 22rpx; color: var(--c-sub); margin-top: 6rpx; }
</style>
