<script setup lang="ts">
import { watch, onBeforeUnmount } from 'vue'
import { X } from 'lucide-vue-next'

const props = withDefaults(
  defineProps<{
    open: boolean
    title?: string
    width?: string
    closable?: boolean
    /** 有未保存修改时, 关闭前二次确认 */
    dirty?: boolean
  }>(),
  { closable: true, dirty: false },
)

const emit = defineEmits<{
  (e: 'close'): void
}>()

function close() {
  if (!props.closable) return
  if (props.dirty && !confirm('有未保存的修改，确定要关闭吗？未保存的内容将丢失。')) return
  emit('close')
}

function onKey(e: KeyboardEvent) {
  if (e.key === 'Escape' && props.open) close()
}

watch(
  () => props.open,
  (v) => {
    if (typeof document === 'undefined') return
    document.body.style.overflow = v ? 'hidden' : ''
    if (v) {
      document.addEventListener('keydown', onKey)
    } else {
      document.removeEventListener('keydown', onKey)
    }
  },
)

onBeforeUnmount(() => {
  if (typeof document !== 'undefined') {
    document.body.style.overflow = ''
    document.removeEventListener('keydown', onKey)
  }
})
</script>

<template>
  <Teleport to="body">
    <transition name="modal">
      <div
        v-if="open"
        class="modal-backdrop fixed inset-0 z-[200] flex items-center justify-center p-4 bg-cocoa-900/50 backdrop-blur-sm"
        data-modal
        @click.self="close"
      >
        <div
          class="modal-card card-soft overflow-hidden w-full flex flex-col"
          :style="{ maxWidth: width || '520px', maxHeight: '88vh' }"
        >
          <div
            v-if="title"
            class="modal-title shrink-0 flex items-center justify-between px-6 py-4 border-b border-cocoa-100/60"
          >
            <h3 class="title-display text-xl">
              {{ title }}
            </h3>
            <button
              class="text-cocoa-500 hover:text-cocoa-900 transition"
              data-modal-close
              @click="close"
              aria-label="关闭"
            >
              <X :size="20" />
            </button>
          </div>
          <div class="modal-body flex-1 overflow-y-auto p-6">
            <slot />
          </div>
          <div
            v-if="$slots.footer"
            class="modal-footer shrink-0 px-6 py-4 border-t border-cocoa-100/60 flex justify-end gap-2"
          >
            <slot name="footer" />
          </div>
        </div>
      </div>
    </transition>
  </Teleport>
</template>

<style scoped>
.modal-enter-active,
.modal-leave-active {
  transition: opacity 0.25s ease;
}
.modal-enter-active :deep(.modal-card),
.modal-leave-active :deep(.modal-card) {
  transition:
    transform 0.32s cubic-bezier(0.18, 0.89, 0.32, 1.28),
    opacity 0.25s ease;
}
.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}
.modal-enter-from :deep(.modal-card),
.modal-leave-to :deep(.modal-card) {
  transform: scale(0.92) translateY(12px);
  opacity: 0;
}
</style>
