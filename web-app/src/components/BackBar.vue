<script setup lang="ts">
/**
 * 通用返回条：返回上一路由（即二级菜单所在页）。
 * 用于老师/校管的深页（三级页面）补返回按钮。
 */
import { useRouter } from 'vue-router'
import { ChevronLeft } from 'lucide-vue-next'

const props = withDefaults(defineProps<{ title?: string; fallback?: string }>(), {
  title: '',
  fallback: '',
})

const router = useRouter()

function back() {
  if (window.history.length > 1) router.back()
  else if (props.fallback) router.push(props.fallback)
}
</script>

<template>
  <div class="flex items-center gap-2 mb-3">
    <button
      type="button"
      class="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-cream-100 text-cocoa-600 hover:bg-cream-200 transition-colors"
      @click="back"
    >
      <ChevronLeft class="w-4 h-4" /> 返回
    </button>
    <span v-if="title" class="text-sm text-cocoa-500">{{ title }}</span>
  </div>
</template>
