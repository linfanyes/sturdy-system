<script setup lang="ts">
/**
 * 留言板：替代 IM 的 Web 端家校沟通页面。
 * 支持收件箱/已发送 Tab、收件人列表、发送留言、已读标记、删除等。
 */
import { ref, computed, onMounted } from 'vue'
import { formatRelativeTime } from '@gardener/shared/utils'
import {
  MessageSquare, Send, Check, Trash2, Inbox, SendHorizonal,
  User, Loader2, Search, ChevronLeft, ChevronRight, CheckCheck,
} from 'lucide-vue-next'
import {
  listMessageRecipients, listMessages, listMessagesSent,
  markMessageRead, markAllMessagesRead,
  deleteMessage as apiDeleteMessage, sendMessage as apiSendMessage,
} from '@/api/teacher'

interface Recipient {
  id: string
  name: string
  role: string
  studentName?: string
}

interface Message {
  id: string
  title: string
  content: string
  isRead?: boolean
  read?: boolean
  recipientId?: string
  recipientName?: string
  senderId?: string
  senderName?: string
  createdAt: string
  type?: string
}

const PAGE_SIZE = 20

// ===== Tab 状态 =====
const activeTab = ref<'inbox' | 'sent'>('inbox')

// ===== 收件人列表 =====
const recipients = ref<Recipient[]>([])
const recipientsLoading = ref(false)
const selectedRecipient = ref<Recipient | null>(null)
const recipientSearch = ref('')

const filteredRecipients = computed(() => {
  if (!recipientSearch.value) return recipients.value
  const kw = recipientSearch.value.toLowerCase()
  return recipients.value.filter(
    r => r.name.toLowerCase().includes(kw) || (r.studentName && r.studentName.toLowerCase().includes(kw)),
  )
})

// ===== 消息列表 =====
const loading = ref(true)
const messages = ref<Message[]>([])
const total = ref(0)
const skip = ref(0)
const errorMsg = ref('')

const page = computed(() => Math.floor(skip.value / PAGE_SIZE) + 1)
const totalPages = computed(() => Math.max(1, Math.ceil(total.value / PAGE_SIZE)))

const unreadCount = computed(() => messages.value.filter(m => !(m.isRead ?? m.read)).length)

// ===== 发送表单 =====
const showSendForm = ref(false)
const sendTitle = ref('')
const sendContent = ref('')
const sendRecipientId = ref('')
const sendRecipientSearch = ref('')
const sending = ref(false)

const sendFilteredRecipients = computed(() => {
  if (!sendRecipientSearch.value) return recipients.value.slice(0, 20)
  const kw = sendRecipientSearch.value.toLowerCase()
  return recipients.value.filter(
    r => r.name.toLowerCase().includes(kw) || (r.studentName && r.studentName.toLowerCase().includes(kw)),
  ).slice(0, 20)
})

// ===== 时间格式化 =====
function formatTime(createdAt: string): string {
  const rel = formatRelativeTime(createdAt)
  if (rel.endsWith('前') || rel === '刚刚') return rel
  const dt = new Date(createdAt)
  const now = new Date()
  if (dt.getFullYear() === now.getFullYear()) {
    return `${dt.getMonth() + 1}月${dt.getDate()}日`
  }
  return `${dt.getFullYear()}/${dt.getMonth() + 1}/${dt.getDate()}`
}

// ===== 加载收件人 =====
async function loadRecipients() {
  recipientsLoading.value = true
  try {
    const res = await listMessageRecipients()
    recipients.value = Array.isArray(res) ? res : (res?.items || [])
  } catch {
    recipients.value = []
  } finally {
    recipientsLoading.value = false
  }
}

// ===== 加载消息列表 =====
async function loadMessages() {
  loading.value = true
  errorMsg.value = ''
  try {
    const params: Record<string, any> = { skip: skip.value, take: PAGE_SIZE }
    if (selectedRecipient.value) {
      params.recipientId = selectedRecipient.value.id
    }
    const res = activeTab.value === 'sent'
      ? await listMessagesSent(params)
      : await listMessages(params)
    if (Array.isArray(res)) {
      messages.value = res
      total.value = res.length
    } else {
      messages.value = res?.items || []
      total.value = res?.total || messages.value.length
    }
  } catch (e: any) {
    errorMsg.value = e?.message || '加载消息失败'
    messages.value = []
    total.value = 0
  } finally {
    loading.value = false
  }
}

// ===== 标记已读 =====
async function markRead(msg: Message) {
  if (msg.isRead ?? msg.read) return
  try {
    await markMessageRead(msg.id)
    if (msg.isRead !== undefined) msg.isRead = true
    else msg.read = true
  } catch (e: any) {
    errorMsg.value = e?.message || '标记已读失败'
  }
}

// ===== 一键全部已读 =====
async function markAllRead() {
  try {
    await markAllMessagesRead()
    messages.value.forEach(m => {
      if (m.isRead !== undefined) m.isRead = true
      else m.read = true
    })
  } catch (e: any) {
    errorMsg.value = e?.message || '全部已读失败'
  }
}

// ===== 删除消息 =====
async function deleteMessage(msg: Message) {
  if (!await confirm('确定删除该留言？')) return
  try {
    await apiDeleteMessage(msg.id)
    messages.value = messages.value.filter(m => m.id !== msg.id)
    total.value = Math.max(0, total.value - 1)
  } catch (e: any) {
    errorMsg.value = e?.message || '删除失败'
  }
}

// ===== 发送留言 =====
async function sendMessage() {
  if (!sendTitle.value.trim()) {
    errorMsg.value = '请输入留言标题'
    return
  }
  if (!sendContent.value.trim()) {
    errorMsg.value = '请输入留言内容'
    return
  }
  if (!sendRecipientId.value) {
    errorMsg.value = '请选择收件人'
    return
  }
  sending.value = true
  errorMsg.value = ''
  try {
    await apiSendMessage({
      recipientId: sendRecipientId.value,
      recipientRole: 'parent',
      title: sendTitle.value.trim(),
      content: sendContent.value.trim(),
      type: 'direct',
    })
    sendTitle.value = ''
    sendContent.value = ''
    sendRecipientId.value = ''
    sendRecipientSearch.value = ''
    showSendForm.value = false
    // 重新加载列表
    await loadMessages()
  } catch (e: any) {
    errorMsg.value = e?.message || '发送失败'
  } finally {
    sending.value = false
  }
}

// ===== Tab 切换 =====
function switchTab(tab: 'inbox' | 'sent') {
  if (activeTab.value === tab) return
  activeTab.value = tab
  skip.value = 0
  selectedRecipient.value = null
  loadMessages()
}

// ===== 选择收件人筛选 =====
function selectRecipient(r: Recipient) {
  if (selectedRecipient.value?.id === r.id) {
    selectedRecipient.value = null
  } else {
    selectedRecipient.value = r
  }
  skip.value = 0
  loadMessages()
}

// ===== 分页 =====
function prevPage() {
  if (skip.value >= PAGE_SIZE) {
    skip.value -= PAGE_SIZE
    loadMessages()
  }
}

function nextPage() {
  if (skip.value + PAGE_SIZE < total.value) {
    skip.value += PAGE_SIZE
    loadMessages()
  }
}

onMounted(() => {
  loadRecipients()
  loadMessages()
})
</script>

<template>
  <div class="space-y-4">
    <!-- 标题栏 -->
    <div class="flex items-center justify-between">
      <h1 class="text-2xl font-bold text-cocoa-900 flex items-center gap-2">
        <MessageSquare class="w-6 h-6 text-butter-500" /> 留言板
      </h1>
      <div class="flex items-center gap-2">
        <button
          v-if="activeTab === 'inbox' && unreadCount > 0"
          class="flex items-center gap-1 px-3 py-1.5 rounded-xl text-sm bg-sky2-50 text-sky2-600 border border-sky2-200 hover:bg-sky2-100 transition-colors"
          @click="markAllRead"
        >
          <CheckCheck class="w-4 h-4" /> 全部已读
        </button>
        <button
          class="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-butter-500 text-white hover:bg-butter-600 transition-colors text-sm font-medium shadow-sm"
          @click="showSendForm = !showSendForm"
        >
          <SendHorizonal class="w-4 h-4" /> 写留言
        </button>
      </div>
    </div>

    <!-- 发送表单 -->
    <div v-if="showSendForm" class="bg-surface rounded-2xl p-5 shadow-softer border border-cream-200 space-y-3">
      <div class="flex items-center gap-2 text-cocoa-700 font-semibold">
        <Send class="w-4 h-4 text-butter-500" /> 新留言
      </div>
      <input
        v-model="sendTitle"
        placeholder="留言标题"
        class="w-full px-4 py-2.5 rounded-xl border border-cream-200 bg-cream-50 text-sm focus:outline-none focus:border-butter-400 focus:bg-surface transition-colors"
      />
      <textarea
        v-model="sendContent"
        rows="4"
        placeholder="留言内容…"
        class="w-full px-4 py-2.5 rounded-xl border border-cream-200 bg-cream-50 text-sm focus:outline-none focus:border-butter-400 focus:bg-surface transition-colors resize-none"
      />
      <!-- 收件人选择 -->
      <div class="relative">
        <div class="flex items-center gap-2">
          <Search class="w-4 h-4 text-cocoa-400 shrink-0" />
          <input
            v-model="sendRecipientSearch"
            placeholder="搜索收件人…"
            class="flex-1 px-0 py-2 text-sm bg-transparent focus:outline-none"
          />
        </div>
        <div v-if="sendRecipientSearch" class="absolute z-10 left-0 right-0 mt-1 bg-surface border border-cream-200 rounded-xl shadow-soft max-h-48 overflow-y-auto">
          <div
            v-for="r in sendFilteredRecipients"
            :key="r.id"
            :class="[
              'px-4 py-2.5 text-sm cursor-pointer hover:bg-cream-50 transition-colors flex items-center gap-2',
              sendRecipientId === r.id ? 'bg-butter-50 text-butter-600' : 'text-cocoa-700',
            ]"
            @click="sendRecipientId = r.id; sendRecipientSearch = ''"
          >
            <User class="w-3.5 h-3.5 shrink-0" />
            <span>{{ r.name }}</span>
            <span v-if="r.studentName" class="text-xs text-cocoa-400">（{{ r.studentName }}）</span>
          </div>
          <div v-if="!sendFilteredRecipients.length" class="px-4 py-3 text-sm text-cocoa-400 text-center">
            未找到匹配的收件人
          </div>
        </div>
      </div>
      <div v-if="sendRecipientId" class="flex items-center gap-2 text-sm">
        <span class="text-cocoa-400">已选：</span>
        <span class="px-2.5 py-1 rounded-lg bg-butter-100 text-butter-600 text-xs font-medium">
          {{ recipients.find(r => r.id === sendRecipientId)?.name || sendRecipientId }}
        </span>
      </div>
      <div class="flex items-center gap-2 pt-1">
        <button
          class="px-4 py-2 rounded-xl bg-butter-500 text-white hover:bg-butter-600 disabled:opacity-50 text-sm transition-colors"
          :disabled="sending"
          @click="sendMessage"
        >
          {{ sending ? '发送中…' : '发送' }}
        </button>
        <button
          class="px-4 py-2 rounded-xl text-cocoa-500 hover:bg-cream-100 text-sm transition-colors"
          @click="showSendForm = false"
        >
          取消
        </button>
      </div>
    </div>

    <!-- 错误提示 -->
    <div v-if="errorMsg" class="rounded-xl p-4 border border-sakura-200 bg-sakura-50 text-sakura-700 text-sm">
      ⚠️ {{ errorMsg }}
    </div>

    <!-- Tab 切换 -->
    <div class="flex gap-2">
      <button
        :class="[
          'flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium transition-colors',
          activeTab === 'inbox'
            ? 'bg-butter-500 text-white shadow-sm'
            : 'bg-surface text-cocoa-600 border border-cream-200 hover:bg-cream-50',
        ]"
        @click="switchTab('inbox')"
      >
        <Inbox class="w-4 h-4" /> 收件箱
        <span
          v-if="unreadCount > 0 && activeTab !== 'inbox'"
          class="px-1.5 py-0.5 rounded-full bg-sakura-500 text-white text-xs"
        >{{ unreadCount }}</span>
      </button>
      <button
        :class="[
          'flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium transition-colors',
          activeTab === 'sent'
            ? 'bg-butter-500 text-white shadow-sm'
            : 'bg-surface text-cocoa-600 border border-cream-200 hover:bg-cream-50',
        ]"
        @click="switchTab('sent')"
      >
        <Send class="w-4 h-4" /> 已发送
      </button>
    </div>

    <!-- 主体：左右布局 -->
    <div class="flex gap-4">
      <!-- 左侧：收件人列表 -->
      <div class="w-56 shrink-0">
        <div class="bg-surface rounded-2xl p-4 shadow-softer border border-cream-200 sticky top-4">
          <div class="flex items-center gap-2 mb-3">
            <User class="w-4 h-4 text-cocoa-400" />
            <h3 class="text-sm font-semibold text-cocoa-700">联系人</h3>
          </div>
          <!-- 搜索 -->
          <div class="relative mb-3">
            <Search class="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-cocoa-400" />
            <input
              v-model="recipientSearch"
              placeholder="搜索…"
              class="w-full pl-8 pr-3 py-2 rounded-lg border border-cream-200 bg-cream-50 text-xs focus:outline-none focus:border-butter-400"
            />
          </div>
          <!-- 联系人列表 -->
          <div v-if="recipientsLoading" class="flex items-center justify-center py-6 text-cocoa-400">
            <Loader2 class="w-4 h-4 animate-spin" />
          </div>
          <div v-else-if="!filteredRecipients.length" class="text-center py-4 text-xs text-cocoa-400">
            暂无联系人
          </div>
          <div v-else class="space-y-0.5 max-h-[60vh] overflow-y-auto">
            <div
              v-for="r in filteredRecipients"
              :key="r.id"
              :class="[
                'px-3 py-2 rounded-lg cursor-pointer text-sm transition-colors',
                selectedRecipient?.id === r.id
                  ? 'bg-butter-100 text-butter-700 font-medium'
                  : 'text-cocoa-600 hover:bg-cream-50',
              ]"
              @click="selectRecipient(r)"
            >
              <div class="truncate">{{ r.name }}</div>
              <div v-if="r.studentName" class="text-xs text-cocoa-400 truncate mt-0.5">{{ r.studentName }}</div>
            </div>
          </div>
        </div>
      </div>

      <!-- 右侧：消息列表 -->
      <div class="flex-1 min-w-0">
        <!-- 加载状态 -->
        <div v-if="loading" class="flex items-center justify-center py-16 text-cocoa-400">
          <Loader2 class="w-6 h-6 animate-spin mr-2" />
          加载中…
        </div>

        <!-- 空状态 -->
        <div v-else-if="!messages.length" class="text-center py-16 text-cocoa-400">
          <Inbox class="w-12 h-12 mx-auto mb-3 text-cocoa-300" />
          <p class="text-lg">{{ activeTab === 'inbox' ? '收件箱为空' : '暂无已发送的留言' }}</p>
          <p v-if="activeTab === 'inbox'" class="text-sm mt-1">点击"写留言"开始与家长沟通</p>
        </div>

        <!-- 消息列表 -->
        <div v-else class="space-y-2">
          <div
            v-for="msg in messages"
            :key="msg.id"
            :class="[
              'rounded-xl p-4 shadow-softer border transition-all cursor-pointer',
              (msg.isRead ?? msg.read)
                ? 'bg-surface border-cream-200 hover:shadow-soft'
                : 'bg-butter-50 border-l-4 border-l-butter-400 hover:shadow-soft',
            ]"
            @click="markRead(msg)"
          >
            <div class="flex items-start gap-3">
              <div class="flex-1 min-w-0">
                <div class="flex items-center justify-between gap-2">
                  <div class="flex items-center gap-2 min-w-0">
                    <span v-if="!(msg.isRead ?? msg.read)" class="shrink-0 w-2 h-2 rounded-full bg-sakura-500" />
                    <div class="font-semibold text-cocoa-900 truncate">{{ msg.title }}</div>
                  </div>
                  <div class="flex items-center gap-2 shrink-0">
                    <span class="text-xs text-cocoa-400">{{ formatTime(msg.createdAt) }}</span>
                    <button
                      class="p-1 rounded-lg hover:bg-cream-100 text-cocoa-400 hover:text-butter-500 transition-colors"
                      title="标记已读"
                      @click.stop="markRead(msg)"
                    >
                      <Check class="w-3.5 h-3.5" />
                    </button>
                    <button
                      class="p-1 rounded-lg hover:bg-red-50 text-cocoa-400 hover:text-red-500 transition-colors"
                      title="删除"
                      @click.stop="deleteMessage(msg)"
                    >
                      <Trash2 class="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
                <div class="text-sm text-cocoa-500 mt-1 line-clamp-2">{{ msg.content }}</div>
                <div class="flex items-center gap-3 mt-2 text-xs text-cocoa-400">
                  <span v-if="activeTab === 'inbox' && msg.senderName">
                    <User class="w-3 h-3 inline mr-1" />{{ msg.senderName }}
                  </span>
                  <span v-if="activeTab === 'sent' && msg.recipientName">
                    <User class="w-3 h-3 inline mr-1" />{{ msg.recipientName }}
                  </span>
                </div>
              </div>
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
      </div>
    </div>
  </div>
</template>