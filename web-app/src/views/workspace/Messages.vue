<script setup lang="ts">
/**
 * 消息中心：按分类 Tab 展示消息，支持分页、单条已读。
 */
import { ref, computed, onMounted } from 'vue'
import { formatRelativeTime } from '@gardener/shared/utils'
import {
  MessageSquare, ChevronLeft, ChevronRight, Loader2,
} from 'lucide-vue-next'
import {
  listMessages, markMessageRead,
  type AppMessage,
} from '@/api/notification'

const PAGE_SIZE = 20

/** 分类 Tab 配置 */
const TABS: { value: string; label: string; badgeClass: string }[] = [
  { value: '', label: '全部', badgeClass: 'bg-cream-200 text-cocoa-600' },
  { value: 'notice', label: '公告', badgeClass: 'bg-sakura-100 text-sakura-600' },
  { value: 'notification', label: '通知', badgeClass: 'bg-butter-100 text-butter-600' },
  { value: 'message', label: '消息', badgeClass: 'bg-sky2-100 text-sky2-600' },
  { value: 'todo', label: '待办', badgeClass: 'bg-mint-100 text-mint-600' },
  { value: 'note', label: '笔记', badgeClass: 'bg-cream-200 text-cocoa-600' },
]

const loading = ref(true)
const items = ref<AppMessage[]>([])
const total = ref(0)
const skip = ref(0)
const activeTab = ref('')
const errorMsg = ref('')

const page = computed(() => Math.floor(skip.value / PAGE_SIZE) + 1)
const totalPages = computed(() => Math.max(1, Math.ceil(total.value / PAGE_SIZE)))

/** 当前 Tab 下的列表（前端按分类过滤） */
const filteredItems = computed(() => {
  if (!activeTab.value) return items.value
  return items.value.filter(m => m.category === activeTab.value)
})

/** 各分类未读数（前端统计） */
const unreadByCategory = computed<Record<string, number>>(() => {
  const map: Record<string, number> = {}
  for (const m of items.value) {
    if (!m.read) {
      map[m.category] = (map[m.category] || 0) + 1
      map[''] = (map[''] || 0) + 1
    }
  }
  return map
})

/** 分类 badge 样式映射 */
function badgeClass(category: string): string {
  const tab = TABS.find(t => t.value === category)
  return tab?.badgeClass || 'bg-cream-200 text-cocoa-600'
}

/** 分类中文标签 */
function categoryLabel(category: string): string {
  const tab = TABS.find(t => t.value === category)
  return tab?.label || category
}

/** 时间格式化：相对时间 + 日期回退 */
function formatTime(createdAt: string): string {
  const rel = formatRelativeTime(createdAt)
  if (rel.endsWith('前') || rel === '刚刚') return rel
  return new Date(createdAt).toLocaleString('zh-CN')
}

async function loadList() {
  loading.value = true
  errorMsg.value = ''
  try {
    const res = await listMessages(skip.value, PAGE_SIZE)
    if (Array.isArray(res)) {
      items.value = res
      total.value = res.length
    } else {
      items.value = res?.items || []
      total.value = res?.total || items.value.length
    }
  } catch (e: any) {
    errorMsg.value = e?.message || '加载消息失败'
    items.value = []
  } finally {
    loading.value = false
  }
}

async function handleMarkRead(item: AppMessage) {
  if (item.read) return
  try {
    await markMessageRead(item.id)
    item.read = true
  } catch (e: any) {
    errorMsg.value = e?.message || '标记已读失败'
  }
}

function switchTab(value: string) {
  activeTab.value = value
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
})
</script>

<template>
  <div class="space-y-4">
    <!-- 标题 -->
    <h1 class="text-2xl font-bold text-cocoa-900 flex items-center gap-2">
      <MessageSquare class="w-6 h-6 text-butter-500" /> 消息中心
    </h1>

    <!-- 分类 Tab -->
    <div class="flex flex-wrap gap-2">
      <button
        v-for="tab in TABS"
        :key="tab.value || 'all'"
        :class="[
          'px-3 py-1.5 rounded-xl text-sm flex items-center gap-1.5 transition-colors',
          activeTab === tab.value
            ? 'bg-butter-500 text-white font-semibold'
            : 'bg-surface text-cocoa-700 border border-cream-200 hover:bg-cream-100',
        ]"
        @click="switchTab(tab.value)"
      >
        {{ tab.label }}
        <span
          v-if="unreadByCategory[tab.value || '']"
          :class="[
            'px-1.5 py-0.5 rounded-full text-xs',
            activeTab === tab.value ? 'bg-surface/30 text-white' : badgeClass(tab.value),
          ]"
        >
          {{ unreadByCategory[tab.value || ''] }}
        </span>
      </button>
    </div>

    <!-- 加载状态 -->
    <div v-if="loading" class="flex items-center justify-center py-12 text-cocoa-400">
      <Loader2 class="w-6 h-6 animate-spin mr-2" />
      加载中…
    </div>

    <!-- 错误提示 -->
    <div v-if="errorMsg" class="rounded-xl p-4 border border-sakura-200 bg-sakura-50 text-sakura-700">
      ⚠️ {{ errorMsg }}
    </div>

    <!-- 列表 -->
    <template v-else>
      <div v-if="!filteredItems.length" class="text-center py-16 text-cocoa-400 text-lg">
        📭 暂无消息
      </div>
      <div v-else class="space-y-2">
        <div
          v-for="item in filteredItems"
          :key="item.id"
          :class="[
            'rounded-xl p-4 shadow-softer border border-cream-200 cursor-pointer transition-colors hover:shadow-soft',
            item.read ? 'bg-surface' : 'bg-butter-50 border-l-4 border-l-butter-400',
          ]"
          @click="handleMarkRead(item)"
        >
          <div class="flex items-start gap-3">
            <div class="flex-1 min-w-0">
              <div class="flex items-center justify-between gap-2">
                <div class="flex items-center gap-2 min-w-0">
                  <span :class="['px-2 py-0.5 rounded-md text-xs font-medium shrink-0', badgeClass(item.category)]">
                    {{ categoryLabel(item.category) }}
                  </span>
                  <div class="font-semibold text-cocoa-900 truncate">{{ item.title }}</div>
                </div>
                <div class="text-xs text-cocoa-400 shrink-0">{{ formatTime(item.createdAt) }}</div>
              </div>
              <div v-if="item.content" class="text-sm text-cocoa-500 mt-1 line-clamp-2">{{ item.content }}</div>
            </div>
            <span v-if="!item.read" class="shrink-0 w-2 h-2 rounded-full bg-sakura-500 mt-2" />
          </div>
        </div>

        <!-- 分页 -->
        <div v-if="total > 0 && PAGE_SIZE < total" class="flex items-center justify-between pt-2">
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
