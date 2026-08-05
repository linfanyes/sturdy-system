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
    <div class="bg-surface rounded-2xl shadow-2xl w-full max-w-sm p-5">
      <h3 class="text-lg font-semibold text-slate-800">{{ state.title }}</h3>
      <p class="mt-2 text-sm text-slate-600 whitespace-pre-line">{{ state.message }}</p>
      <div class="mt-5 flex justify-end gap-3">
        <button
          class="px-4 py-2 rounded-lg text-slate-600 hover:bg-slate-100"
          @click="resolveConfirm(false)"
        >
          {{ state.cancelText }}
        </button>
        <button
          class="px-4 py-2 rounded-lg text-white"
          :class="state.danger ? 'bg-rose-500 hover:bg-rose-600' : 'bg-indigo-500 hover:bg-indigo-600'"
          @click="resolveConfirm(true)"
        >
          {{ state.confirmText }}
        </button>
      </div>
    </div>
  </div>
</template>
