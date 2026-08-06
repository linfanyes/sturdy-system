<script setup lang="ts">
import { ref, watch, nextTick, onUnmounted } from 'vue'
/** 通用模态框组件（无障碍增强版）
 * - role="dialog" + aria-modal + aria-labelledby（屏幕阅读器可识别）
 * - ESC 键关闭、点击遮罩关闭
 * - 打开时焦点移入对话框、关闭后焦点归还触发元素
 * - 基础焦点陷阱（Tab/Shift+Tab 循环，不逃逸到背景）
 */
const props = withDefaults(defineProps<{
  modelValue: boolean
  title?: string
  width?: string
}>(), {
  title: '',
  width: 'max-w-lg',
})

const emit = defineEmits<{ 'update:modelValue': [val: boolean] }>()

const panelRef = ref<HTMLElement | null>(null)
let lastFocused: HTMLElement | null = null

const titleId = `modal-title-${Math.random().toString(36).slice(2, 9)}`

function close() {
  emit('update:modelValue', false)
}

function onKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape') {
    e.stopPropagation()
    close()
    return
  }
  if (e.key !== 'Tab') return
  // 焦点陷阱：对话框内 Tab 循环
  const root = panelRef.value
  if (!root) return
  const focusable = root.querySelectorAll<HTMLElement>(
    'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])',
  )
  if (!focusable.length) return
  const first = focusable[0]
  const last = focusable[focusable.length - 1]
  if (e.shiftKey && document.activeElement === first) {
    e.preventDefault()
    last.focus()
  } else if (!e.shiftKey && document.activeElement === last) {
    e.preventDefault()
    first.focus()
  }
}

watch(
  () => props.modelValue,
  (open) => {
    if (open) {
      lastFocused = document.activeElement as HTMLElement | null
      // 等待 Teleport + Transition 渲染完成后聚焦
      nextTick(() => {
        const root = panelRef.value
        if (!root) return
        const focusable = root.querySelector<HTMLElement>(
          'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])',
        )
        ;(focusable || root).focus()
      })
    } else if (lastFocused && typeof lastFocused.focus === 'function') {
      lastFocused.focus()
      lastFocused = null
    }
  },
)

onUnmounted(() => {
  if (lastFocused && typeof lastFocused.focus === 'function') lastFocused.focus()
})
</script>

<template>
  <Teleport to="body">
    <Transition
      enter-active-class="transition duration-200 ease-out"
      enter-from-class="opacity-0"
      enter-to-class="opacity-100"
      leave-active-class="transition duration-150 ease-in"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0"
    >
      <div
        v-if="modelValue"
        class="fixed inset-0 z-50 flex items-center justify-center p-4"
        @keydown="onKeydown"
      >
        <!-- 遮罩 -->
        <div class="absolute inset-0 bg-black/40 backdrop-blur-sm" @click="close" />
        <!-- 内容（带缩放动画） -->
        <Transition
          enter-active-class="transition duration-200 ease-out"
          enter-from-class="scale-95 opacity-0"
          enter-to-class="scale-100 opacity-100"
          leave-active-class="transition duration-150 ease-in"
          leave-from-class="scale-100 opacity-100"
          leave-to-class="scale-95 opacity-0"
        >
          <div
            v-if="modelValue"
            :ref="(el: any) => (panelRef = el as HTMLElement)"
            :class="['relative bg-surface rounded-2xl shadow-soft w-full outline-none', width]"
            role="dialog"
            aria-modal="true"
            :aria-labelledby="title ? titleId : undefined"
            tabindex="-1"
          >
            <!-- 头部 -->
            <div v-if="title" class="flex items-center justify-between px-6 py-4 border-b border-cream-200">
              <h3 :id="titleId" class="text-lg font-semibold text-cocoa-900">{{ title }}</h3>
              <button
                type="button"
                class="text-cocoa-400 hover:text-cocoa-700 text-xl leading-none p-1 -mr-1 rounded-lg hover:bg-cream-100 transition-colors"
                aria-label="关闭"
                @click="close"
              >×</button>
            </div>
            <!-- 内容区 -->
            <div class="px-6 py-4 max-h-[70vh] overflow-y-auto">
              <slot />
            </div>
            <!-- 底部按钮 -->
            <div v-if="$slots.footer" class="px-6 py-4 border-t border-cream-200 flex justify-end gap-2">
              <slot name="footer" />
            </div>
          </div>
        </Transition>
      </div>
    </Transition>
  </Teleport>
</template>
