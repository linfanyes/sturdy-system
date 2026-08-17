<template>
  <!-- 通用统计卡片组件：用于 Dashboard / 看板等场景，展示数字 + 标签 + 可选进度条 -->
  <view class="stat-card" :class="[type, { warn }]" @click="emit('click')">
    <text v-if="progress != null" class="stat-progress">
      <text class="stat-progress-row">
        <text class="stat-progress-n">{{ value }}</text>
        <text class="stat-progress-pct">{{ progress }}%</text>
      </text>
      <view class="stat-progress-bar">
        <view class="stat-progress-fill" :style="{ width: progress + '%' }"></view>
      </view>
    </text>
    <text v-else class="stat-n" :class="{ warn }">{{ value }}</text>
    <text class="stat-l">{{ label }}</text>
    <text v-if="hint" class="stat-hint">{{ hint }}</text>
  </view>
</template>

<script setup>
/**
 * 通用统计卡片：数字 + 标签，可选进度条模式。
 *
 * Props:
 *   value    显示值（数字 / 字符串）
 *     label      标签
 *   type       类型：'default' | 'primary' | 'warn' | 'success'（配色）
 *   warn       是否警告（红色）
 *   progress   进度条百分比（0-100），有值时启用进度条模式
 *   hint       辅助说明文字
 *
 * Emits: click
 */
defineProps({
  value: { type: [Number, String], default: 0 },
  label: { type: String, default: '' },
  type: { type: String, default: 'default' },
  warn: { type: Boolean, default: false },
  progress: { type: Number, default: null },
  hint: { type: String, default: '' },
})
defineEmits(['click'])
</script>

<style scoped>
.stat-card {
  background: var(--c-card);
  border-radius: 16rpx;
  padding: 28rpx 16rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  box-shadow: 0 4rpx 14rpx var(--c-shadow);
  gap: 6rpx;
  position: relative;
}
.stat-card.primary { background: linear-gradient(135deg, #4f8cff 0%, #6c63ff 100%); }
.stat-card.success { background: linear-gradient(135deg, #07c160 0%, #19d27e 100%); }
.stat-card.warn { background: linear-gradient(135deg, #ff7043 0%, #ff5252 100%); }
.stat-card.primary .stat-n,
.stat-card.primary .stat-l,
.stat-card.success .stat-n,
.stat-card.success .stat-l,
.stat-card.primary .stat-progress-row,
.stat-card.success .stat-progress-row { color: #fff; }
.stat-n { font-size: 48rpx; font-weight: 700; color: var(--c-title); line-height: 1.2; }
.stat-l { font-size: 24rpx; color: var(--c-sub); margin-top: 4rpx; }
.stat-hint { font-size: 20rpx; color: var(--c-sub); opacity: 0.7; }
.stat-n.warn { color: #e64340; }
.stat-progress { display: flex; flex-direction: column; align-items: center; width: 100%; gap: 8rpx; }
.stat-progress-row { display: flex; align-items: baseline; gap: 12rpx; }
.stat-progress-n { font-size: 48rpx; font-weight: 700; color: var(--c-title); }
.stat-progress-pct { font-size: 22rpx; color: var(--c-sub); }
.stat-progress-bar { width: 100%; height: 8rpx; background: var(--c-border); border-radius: 6rpx; overflow: hidden; }
.stat-progress-fill { height: 100%; background: var(--c-primary); border-radius: 6rpx; transition: width 0.3s; }
</style>
