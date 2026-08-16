<script setup lang="ts">
/**
 * 统一空状态组件（与小程序端 EmptyState 视觉对齐：emoji 图标 + 标题 + 提示 + 可选操作）。
 * 用法：
 *   <EmptyState icon="📚" title="暂无班级" desc="还没有被分配班级">
 *     <button @click="go">去创建</button>
 *   </EmptyState>
 */
import GrowthIcon from './GrowthIcon.vue'

withDefaults(
  defineProps<{
    icon?: string
    title?: string
    desc?: string
  }>(),
  {
    icon: '📭',
    title: '暂无数据',
    desc: '',
  },
)
</script>

<template>
  <div class="empty-state" role="status" aria-label="空状态">
    <!-- 生长装饰：种子→盛放 四态，品牌化空态 -->
    <div class="gi-row" aria-hidden="true">
      <GrowthIcon name="seed" :size="16" />
      <GrowthIcon name="sprout" :size="16" />
      <GrowthIcon name="bud" :size="16" />
      <GrowthIcon name="bloom" :size="16" />
    </div>
    <div class="icon">{{ icon }}</div>
    <div class="title">{{ title }}</div>
    <div v-if="desc" class="desc">{{ desc }}</div>
    <div v-if="$slots.default" class="mt-4">
      <slot />
    </div>
  </div>
</template>

<style scoped>
.empty-state {
  @apply flex flex-col items-center justify-center py-16 text-center;
}
.gi-row {
  @apply flex items-center gap-3 mb-3 opacity-40;
}
.gi-row :deep(svg) {
  transition: transform 0.3s ease;
}
.gi-row:hover :deep(svg:nth-child(1)) { transform: translateY(-2px); }
.gi-row:hover :deep(svg:nth-child(2)) { transform: translateY(-4px); }
.gi-row:hover :deep(svg:nth-child(3)) { transform: translateY(-6px); }
.gi-row:hover :deep(svg:nth-child(4)) { transform: translateY(-8px); }
.icon {
  @apply text-5xl mb-4 opacity-60;
}
.title {
  @apply text-lg font-semibold text-cocoa-700 mb-1;
}
.desc {
  @apply text-sm text-cocoa-400 max-w-xs leading-relaxed;
}
</style>
