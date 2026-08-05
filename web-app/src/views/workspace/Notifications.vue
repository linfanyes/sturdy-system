<script setup lang="ts">
/**
 * 通知中心：展示当前教师的所有通知，支持分页、单条已读、全部已读。
 */
import { ref, computed, onMounted } from 'vue'
import {
  Bell, ClipboardList, Megaphone, Award, Settings, CheckCheck, ChevronLeft, ChevronRight, Loader2,
} from 'lucide-vue-next'
import {
  listNotifications, getUnreadCount, markAllRead, markRead,
  type AppNotification,
} from '@/api/notification'

const PAGE_SIZE = 20

const loading = ref(true)
const items = ref<AppNotification[]>([])
const total = ref(0)
const skip = ref(0)
const unreadCount = ref(0)

const page = computed(() => Math.floor(skip.value / PAGE_SIZE) + 1)
const totalPages = computed(() => Math.max(1, Math.ceil(total.value / PAGE_SIZE)))

/** 时间格式化：刚刚 / N分钟前 / N小时前 / 日期 */
function formatTime(createdAt: string): string {
  const dt = new Date(createdAt)
  const diff = Date.now() - dt.getTime()
  if (diff < 60 * 1000) return '刚刚'
  if (diff < 60 * 60 * 1000) return `${Math.floor(diff / 60000)}分钟前`
  if (diff < 24 * 60 * 60 * 1000) return `${Math.floor(diff / 3600000)}小时前`
  return dt.toLocaleString('zh-CN')
}

/** 通知类型图标映射 */
function typeIcon(type: string): any {
  switch (type) {
    case 'homework': return ClipboardList
    case 'notice': return Megaphone
    case 'grade': return Award
    case 'system': return Settings
    default: return Bell
  }
}

async function loadList() {
  loading.value = true
  try {
    const res = await listNotifications(skip.value, PAGE_SIZE)
    if (Array.isArray(res)) {
      items.value = res
      total.value = res.length
    } else {
      items.value = res?.items || []
      total.value = res?.total || items.value.length
    }
  } catch (e: any) {
    alert(e?.message || '加载通知失败')
    items.value = []
  } finally {
    loading.value = false
  }
}

async function loadUnread() {
  try {
    const res = await getUnreadCount()
    unreadCount.value = res?.count ?? 0
  } catch {
    unreadCount.value = 0
  }
}

async function handleMarkRead(item: AppNotification) {
  if (item.read) return
  try {
    await markRead(item.id)
    item.read = true
    if (unreadCount.value > 0) unreadCount.value -= 1
  } catch (e: any) {
    alert(e?.message || '标记已读失败')
  }
}

async function handleMarkAllRead() {
  if (unreadCount.value === 0) return
  try {
    await markAllRead()
    items.value.forEach(it => { it.read = true })
    unreadCount.value = 0
  } catch (e: any) {
    alert(e?.message || '操作失败')
  }
}

function prevPage() {
  if (skip.value >= PAGE_SIZE) {
    skip.value -= PAGE_SIZE
    loadList()
  }
}

function nextPage() {
  if (skip.value + PAGE_SIZE < total.value) {
    skip.value += PAGE_SIZE
    loadList()
  }
}

onMounted(() => {
  loadList()
  loadUnread()
})
</script>

<template>
  <div class="space-y-4">
    <!-- 标题 -->
    <h1 class="text-2xl font-bold text-cocoa-900 flex items-center gap-2">
      <Bell class="w-6 h-6 text-butter-500" /> 通知中心
    </h1>

    <!-- 顶部操作栏 -->
    <div class="flex items-center justify-between gap-4">
      <div class="text-sm text-cocoa-700">
        <span class="font-semibold text-cocoa-900">{{ unreadCount }}</span> 条未读
      </div>
      <button
        class="px-4 py-2 rounded-xl bg-butter-500 text-white hover:bg-butter-600 disabled:opacity-60 flex items-center gap-1.5 text-sm"
        :disabled="unreadCount === 0 || loading"
        @click="handleMarkAllRead"
      >
        <CheckCheck class="w-4 h-4" />
        全部已读
      </button>
    </div>

    <!-- 加载状态 -->
    <div v-if="loading" class="flex items-center justify-center py-12 text-cocoa-400">
      <Loader2 class="w-6 h-6 animate-spin mr-2" />
      加载中…
    </div>

    <!-- 列表 -->
    <template v-else>
      <div v-if="!items.length" class="text-center py-16 text-cocoa-400 text-lg">
        📭 暂无通知
      </div>
      <div v-else class="space-y-2">
        <div
          v-for="item in items"
          :key="item.id"
          :class="[
            'rounded-xl p-4 shadow-softer border border-cream-200 cursor-pointer transition-colors hover:shadow-soft',
            item.read ? 'bg-surface' : 'bg-butter-50 border-l-4 border-l-butter-400',
          ]"
          @click="handleMarkRead(item)"
        >
          <div class="flex items-start gap-3">
            <div class="shrink-0 w-10 h-10 rounded-full bg-cream-100 flex items-center justify-center">
              <component :is="typeIcon(item.type)" class="w-5 h-5 text-butter-500" />
            </div>
            <div class="flex-1 min-w-0">
              <div class="flex items-center justify-between gap-2">
                <div class="font-semibold text-cocoa-900 truncate">{{ item.title }}</div>
                <div class="text-xs text-cocoa-400 shrink-0">{{ formatTime(item.createdAt) }}</div>
              </div>
              <div v-if="item.content" class="text-sm text-cocoa-500 mt-1 line-clamp-2">{{ item.content }}</div>
            </div>
            <span v-if="!item.read" class="shrink-0 w-2 h-2 rounded-full bg-sakura-500 mt-2" />
          </div>
        </div>

        <!-- 分页 -->
        <div v-if="total > PAGE_SIZE" class="flex items-center justify-between pt-2">
          <button
            class="px-3 py-1.5 rounded-lg bg-surface border border-cream-200 text-sm text-cocoa-700 hover:bg-cream-100 disabled:opacity-50 flex items-center gap-1"
            :disabled="skip === 0"
            @click="prevPage"
          >
            <ChevronLeft class="w-4 h-4" /> 上一页
          </button>
          <div class="text-sm text-cocoa-500">第 {{ page }} / {{ totalPages }} 页（共 {{ total }} 条）</div>
          <button
            class="px-3 py-1.5 rounded-lg bg-surface border border-cream-200 text-sm text-cocoa-700 hover:bg-cream-100 disabled:opacity-50 flex items-center gap-1"
            :disabled="skip + PAGE_SIZE >= total"
            @click="nextPage"
          >
            下一页 <ChevronRight class="w-4 h-4" />
          </button>
        </div>
      </div>
    </template>
  </div>
</template>
