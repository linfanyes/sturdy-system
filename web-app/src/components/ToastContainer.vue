<script setup lang="ts">
import { useToasts } from '@/utils/feedback'

const { toasts, dismissToast } = useToasts()

const typeClass: Record<string, string> = {
  success: 'bg-[rgb(var(--mint-400))]',
  error: 'bg-[rgb(var(--sakura-500))]',
  info: 'bg-[rgb(var(--cocoa-700))]',
  warning: 'bg-[rgb(var(--butter-500))]',
}
</script>

<template>
  <div
    class="fixed top-4 left-1/2 -translate-x-1/2 z-[9999] flex flex-col gap-2 items-center pointer-events-none"
    aria-live="polite"
  >
    <transition-group name="toast">
      <div
        v-for="t in toasts"
        :key="t.id"
        class="pointer-events-auto text-white text-sm px-4 py-2 rounded-xl shadow-lg max-w-[90vw] break-words"
        :class="typeClass[t.type] || 'bg-slate-800'"
        role="status"
        @click="dismissToast(t.id)"
      >
        {{ t.message }}
      </div>
    </transition-group>
  </div>
</template>

<style scoped>
.toast-enter-active,
.toast-leave-active {
  transition: all 0.25s ease;
}
.toast-enter-from,
.toast-leave-to {
  opacity: 0;
  transform: translateY(-8px);
}
</style>
