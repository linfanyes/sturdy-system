<script setup lang="ts">
import { computed } from 'vue'
import { Bell } from 'lucide-vue-next'

interface Notice {
  id: string
  title: string
  content: string
  pinned?: boolean
  ended?: boolean
  createdAt: string
}

const props = defineProps<{
  loading: boolean
  notices: Notice[]
}>()

const emit = defineEmits<{
  (e: 'toggleShowAll'): void
}>()

const visibleNotices = computed(() => props.notices.slice(0, 5))
const hasMore = computed(() => props.notices.length > 5)
</script>

<template>
  <!-- 班级公告 -->
  <div v-if="!loading && notices.length > 0" id="parent-notices-section">
    <h2 class="section-title"><Bell class="w-5 h-5 text-sakura-400" /> 班级公告</h2>
    <div class="space-y-3">
      <div v-for="n in visibleNotices" :key="n.id" class="quick-card">
        <div class="flex items-center justify-between mb-1">
          <div class="font-medium text-cocoa-900">{{ n.title }}</div>
          <span v-if="n.pinned" class="text-xs bg-butter-100 text-butter-700 px-2 py-0.5 rounded-full">置顶</span>
        </div>
        <div class="text-sm text-cocoa-600 line-clamp-2">{{ n.content }}</div>
        <div class="text-xs text-cocoa-400 mt-2">{{ n.createdAt }}</div>
      </div>
      <div v-if="hasMore" class="text-center">
        <button class="text-sm text-sakura-500 hover:text-sakura-600" @click="emit('toggleShowAll')">
          {{ '查看全部 ' + notices.length + ' 条公告' }} →
        </button>
      </div>
    </div>
  </div>
</template>
