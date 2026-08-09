<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { ChevronLeft } from 'lucide-vue-next'

const route = useRoute()

const isHome = computed(() => route.name === 'super-dashboard' || route.name === 'school-admin-dashboard' || route.name === 'teacher-dashboard')
const pageTitle = computed(() => (route.meta.title as string | undefined) || '')

const props = defineProps<{
  showTilesPanel: boolean
}>()

const emit = defineEmits<{
  (e: 'goBackUp'): void
}>()
</script>

<template>
  <!-- 面包屑 / 返回条 -->
  <div v-if="!showTilesPanel && !isHome" class="flex items-center gap-2 mb-4 flex-wrap">
    <button
      type="button"
      class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-cream-100 text-cocoa-600 hover:bg-cream-200 active:scale-95 transition-all text-sm font-medium shadow-sm"
      title="返回上级"
      @click="emit('goBackUp')"
    >
      <ChevronLeft class="w-4 h-4 shrink-0" />
      <span class="hidden sm:inline">返回</span>
    </button>
    <span class="text-xs text-cocoa-400 truncate">{{ pageTitle || '' }}</span>
  </div>
</template>
