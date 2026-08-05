<script setup lang="ts">
/**
 * 统一空状态组件（与小程序端 EmptyState 视觉对齐：emoji 图标 + 标题 + 提示 + 可选操作）。
 * 用法：
 *   <EmptyState icon="📚" title="暂无班级" desc="还没有被分配班级">
 *     <button @click="go">去创建</button>
 *   </EmptyState>
 */
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
