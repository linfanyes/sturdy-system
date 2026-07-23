<script setup lang="ts">
import { useToastStore } from '../../stores/toast'
import { CheckCircle2, AlertCircle, Info, AlertTriangle, X } from 'lucide-vue-next'
import { storeToRefs } from 'pinia'

const store = useToastStore()
const { list } = storeToRefs(store)

const iconMap = {
  success: CheckCircle2,
  error: AlertCircle,
  info: Info,
  warning: AlertTriangle,
}

const colorMap = {
  success: 'bg-mint-100 text-mint-500 border-mint-300',
  error: 'bg-sakura-100 text-sakura-500 border-sakura-300',
  info: 'bg-sky2-100 text-sky2-500 border-sky2-300',
  warning: 'bg-butter-100 text-butter-600 border-butter-300',
}
</script>

<template>
  <div class="fixed top-6 right-6 z-[300] flex flex-col gap-2 pointer-events-none">
    <transition-group name="toast">
      <div
        v-for="t in list"
        :key="t.id"
        class="pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-2xl border shadow-soft bg-white/95 backdrop-blur min-w-[260px] max-w-sm"
        :class="colorMap[t.type]"
      >
        <component
          :is="iconMap[t.type]"
          :size="20"
        />
        <div class="flex-1 text-sm text-cocoa-900">
          {{ t.message }}
        </div>
        <button
          class="text-cocoa-500 hover:text-cocoa-900 transition"
          @click="store.list.splice(store.list.indexOf(t), 1)"
          aria-label="关闭"
        >
          <X :size="16" />
        </button>
      </div>
    </transition-group>
  </div>
</template>

<style scoped>
.toast-enter-active,
.toast-leave-active {
  transition: all 0.32s cubic-bezier(0.18, 0.89, 0.32, 1.28);
}
.toast-enter-from {
  opacity: 0;
  transform: translateY(-12px) scale(0.95);
}
.toast-leave-to {
  opacity: 0;
  transform: translateX(40px);
}
</style>
