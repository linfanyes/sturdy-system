<template>
  <div class="skeleton" :class="`skeleton--${variant}`" :style="containerStyle">
    <div
      v-for="i in count"
      :key="i"
      class="sk-line"
      :style="getLineStyle(i)"
    ></div>
    <div v-if="avatar" class="sk-avatar" :style="avatarStyle"></div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const props = withDefaults(defineProps<{
  variant?: 'text' | 'card' | 'table' | 'profile'
  count?: number
  width?: string
  height?: string
  avatar?: boolean
}>(), {
  variant: 'text',
  count: 3,
  width: '100%',
  height: '12px',
  avatar: false,
})

const containerStyle = computed(() => ({
  '--sk-count': props.count,
  '--sk-width': props.width,
  '--sk-height': props.height,
}))

const getLineStyle = (i: number) => {
  const widths = ['95%', '85%', '70%', '60%', '45%']
  return {
    width: widths[(i - 1) % widths.length],
  }
}

const avatarStyle = computed(() => ({
  width: '48px',
  height: '48px',
}))
</script>

<style scoped>
.skeleton {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 16px;
}
.skeleton--card {
  background: var(--c-card);
  border-radius: 16px;
  box-shadow: var(--c-shadow);
}
.skeleton--table {
  padding: 0;
}
.sk-line {
  height: var(--sk-height, 12px);
  background: linear-gradient(90deg, var(--c-skeleton) 25%, var(--c-skeleton-shimmer) 50%, var(--c-skeleton) 75%);
  background-size: 200% 100%;
  border-radius: 8px;
  animation: sk-shimmer 1.4s ease-in-out infinite;
}
.sk-avatar {
  border-radius: 50%;
  background: linear-gradient(90deg, var(--c-skeleton) 25%, var(--c-skeleton-shimmer) 50%, var(--c-skeleton) 75%);
  background-size: 200% 100%;
  animation: sk-shimmer 1.4s ease-in-out infinite;
}
@keyframes sk-shimmer {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}
</style>
