<script setup lang="ts">
/** 通用模态框组件 */
const props = withDefaults(defineProps<{
  modelValue: boolean
  title?: string
  width?: string
}>(), {
  title: '',
  width: 'max-w-lg',
})

const emit = defineEmits<{ 'update:modelValue': [val: boolean] }>()

function close() {
  emit('update:modelValue', false)
}
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
      <div v-if="modelValue" class="fixed inset-0 z-50 flex items-center justify-center p-4">
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
          <div v-if="modelValue" :class="['relative bg-white rounded-2xl shadow-soft w-full', width]">
            <!-- 头部 -->
            <div v-if="title" class="flex items-center justify-between px-6 py-4 border-b border-cream-200">
              <h3 class="text-lg font-semibold text-cocoa-900">{{ title }}</h3>
              <button class="text-cocoa-400 hover:text-cocoa-700 text-xl leading-none" @click="close">×</button>
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
