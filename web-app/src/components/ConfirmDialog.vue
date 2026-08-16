<script setup lang="ts">
import { useConfirmState, resolveConfirm } from '@/utils/feedback'

const state = useConfirmState()
</script>

<template>
  <div
    v-if="state.open"
    class="fixed inset-0 z-[9998] flex items-center justify-center bg-black/40 px-4"
    role="dialog"
    aria-modal="true"
    @click.self="resolveConfirm(false)"
  >
    <div class="bg-surface rounded-2xl shadow-lift border border-white/60 w-full max-w-sm p-5">
      <h3 class="title-display text-lg font-semibold text-cocoa-900">{{ state.title }}</h3>
      <p class="mt-2 text-sm text-cocoa-600 whitespace-pre-line">{{ state.message }}</p>
      <div class="mt-5 flex justify-end gap-3">
        <button
          class="px-4 py-2 rounded-full text-cocoa-600 hover:bg-cream-100 border border-cream-200"
          @click="resolveConfirm(false)"
        >
          {{ state.cancelText }}
        </button>
        <button
          class="px-4 py-2 rounded-full text-white shadow-pop"
          :class="state.danger ? 'bg-[rgb(var(--sakura-500))] hover:bg-[rgb(var(--sakura-600))]' : 'bg-gradient-to-r from-butter-400 to-butter-500 hover:to-butter-600'"
          @click="resolveConfirm(true)"
        >
          {{ state.confirmText }}
        </button>
      </div>
    </div>
  </div>
</template>
