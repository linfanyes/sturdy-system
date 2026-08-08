<script setup lang="ts">
import { ref, nextTick, onMounted, computed } from 'vue'
import { useAuthStore } from '@/stores/auth'
import request, { getApiBase, handleUnauthorized } from '@/api/request'
import { Send, Bot, User, Trash2, Plus, Pin, MessageSquare } from 'lucide-vue-next'
import { createSSEParser } from '@gardener/shared/utils/sse-parser'
import {
  createChatSession,
  fetchChatSessions,
  fetchChatSession,
  appendChatMessage,
  toggleChatPin,
  deleteChatSession,
  type ChatSessionDTO,
} from '@/api/chat'

const auth = useAuthStore()

interface Msg { role: 'user' | 'assistant' | 'system'; content: string }

const messages = ref<Msg[]>([
  { role: 'assistant', content: '你好，我是 AI 教学助手，可以帮你备课、生成教案、分析成绩、撰写评语等，请问有什么可以帮你？' },
])
const input = ref('')
const sending = ref(false)
const listEl = ref<HTMLElement | null>(null)

// —— 会话历史 ——
const sessions = ref<ChatSessionDTO[]>([])
const currentId = ref<string | null>(null)
const sessionsLoading = ref(false)
const showHistory = ref(false)

const currentTitle = computed(() => {
  const s = sessions.value.find((x) => x.id === currentId.value)
  return s ? s.title : '新对话'
})

async function scrollToBottom() {
  await nextTick()
  if (listEl.value) listEl.value.scrollTop = listEl.value.scrollHeight
}

async function loadSessions() {
  sessionsLoading.value = true
  try {
    sessions.value = await fetchChatSessions()
  } catch {
    sessions.value = []
  } finally {
    sessionsLoading.value = false
  }
}

/** 新建会话：清空当前消息并创建后端会话 */
async function newChat() {
  messages.value = [
    { role: 'assistant', content: '你好，我是 AI 教学助手，可以帮你备课、生成教案、分析成绩、撰写评语等，请问有什么可以帮你？' },
  ]
  currentId.value = null
  try {
    const s = await createChatSession()
    currentId.value = s.id
  } catch { /* 静默，未登录或后端不可用时仍可本地聊天 */ }
  await loadSessions()
  await scrollToBottom()
}

/** 打开某个历史会话 */
async function openSession(id: string) {
  try {
    const d = await fetchChatSession(id)
    currentId.value = id
    const loaded = (d?.messages || []).map((m) => ({ role: m.role, content: m.content }))
    messages.value = loaded.length ? loaded : [
      { role: 'assistant', content: '该会话暂无消息。' },
    ]
    await scrollToBottom()
  } catch { /* 静默 */ }
}

async function onTogglePin(id: string) {
  try {
    await toggleChatPin(id)
  } catch { /* 静默 */ }
  await loadSessions()
}

async function onDeleteSession(id: string) {
  try {
    await deleteChatSession(id)
    if (currentId.value === id) {
      currentId.value = null
      messages.value = [
        { role: 'assistant', content: '会话已删除。' },
      ]
    }
  } catch { /* 静默 */ }
  await loadSessions()
}

/** 把一条消息追加到当前后端会话（失败静默，不阻塞聊天） */
async function persistMessage(role: 'user' | 'assistant', content: string) {
  if (!currentId.value || !content) return
  try {
    await appendChatMessage(currentId.value, role, content)
  } catch { /* 静默 */ }
}

async function send() {
  const text = input.value.trim()
  if (!text || sending.value) return
  messages.value.push({ role: 'user', content: text })
  input.value = ''
  sending.value = true
  const assistantMsg = ref({ role: 'assistant' as const, content: '' })
  messages.value.push(assistantMsg.value)
  await scrollToBottom()
  // 无会话时自动创建，使聊天内容可被历史保存
  if (!currentId.value) {
    try {
      const s = await createChatSession()
      currentId.value = s.id
      await loadSessions()
    } catch { /* 静默 */ }
  }
  // 确保用户消息先落库，避免与 AI 回复乱序（跨设备查看时消息顺序正确）
  await persistMessage('user', text)

  try {
    // 使用 SSE 流式接口
    const token = auth.token
    const resp = await fetch(`${getApiBase()}/ai/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({ messages: messages.value.filter(m => m.role !== 'system').slice(0, -1).map(m => ({ role: m.role, content: m.content })) }),
    })
    // 与 request.ts 拦截器保持一致的 401 策略（ai/chat 非登录接口，失效即清登录态跳转）
    if (resp.status === 401) {
      await handleUnauthorized()
      throw new Error('登录已失效，请重新登录')
    }
    if (!resp.body) throw new Error('无响应流')
    const reader = resp.body.getReader()
    const decoder = new TextDecoder()
    let errored = false
    // 共享 SSE 解析：处理跨 chunk 断行、[DONE] 终止、delta/error 分片（三端同一实现）
    const parser = createSSEParser({
      onDelta: async (delta) => {
        if (errored) return
        assistantMsg.value.content += delta
        await scrollToBottom()
      },
      onError: (msg) => {
        errored = true
        assistantMsg.value.content += `\n\n[错误] ${msg}`
      },
    })
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      parser.feed(decoder.decode(value, { stream: true }))
    }
    parser.flush()
    if (!assistantMsg.value.content) assistantMsg.value.content = '（无响应内容，请检查 AI 配置）'
  } catch (e: any) {
    assistantMsg.value.content = `请求失败：${e?.message || '未知错误'}`
  } finally {
    sending.value = false
    // 持久化 AI 回复到当前会话（失败静默）
    persistMessage('assistant', assistantMsg.value.content)
    await loadSessions()
    await scrollToBottom()
  }
}

function clearChat() {
  // 清空 = 开启新会话，确保后续内容仍能被历史保存
  newChat()
}

function onKeydown(e: KeyboardEvent) {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault()
    send()
  }
}

// 进入页面时加载会话列表
onMounted(() => {
  loadSessions()
})
</script>

<template>
  <div class="flex flex-col h-[calc(100dvh-9rem)]">
    <div class="flex items-center justify-between mb-3">
      <h1 class="text-2xl font-bold text-cocoa-900 flex items-center gap-2">
        <Bot class="w-6 h-6 text-butter-500" /> AI 助手
        <span v-if="currentId" class="text-sm font-normal text-cocoa-500 max-w-[16rem] truncate">· {{ currentTitle }}</span>
      </h1>
      <div class="flex items-center gap-2">
        <button
          class="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-butter-100 text-cocoa-700 hover:bg-butter-200 transition-colors text-sm font-medium"
          title="新建对话"
          @click="newChat"
        >
          <Plus class="w-4 h-4" /> 新对话
        </button>
        <button
          class="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-cream-100 text-cocoa-600 hover:bg-cream-200 transition-colors text-sm font-medium"
          title="会话历史"
          @click="showHistory = !showHistory"
        >
          <MessageSquare class="w-4 h-4" /> {{ showHistory ? '收起历史' : '会话历史' }}
        </button>
        <button class="p-2 rounded-xl hover:bg-cream-100 text-cocoa-500" title="清空对话" @click="clearChat">
          <Trash2 class="w-4 h-4" />
        </button>
      </div>
    </div>

    <div class="flex flex-1 min-h-0 gap-3">
      <!-- 会话历史侧栏 -->
      <aside v-if="showHistory" class="w-60 shrink-0 bg-surface rounded-2xl shadow-softer p-3 overflow-y-auto">
        <div class="flex items-center justify-between mb-2">
          <span class="text-sm font-semibold text-cocoa-900">会话历史</span>
          <span v-if="sessionsLoading" class="text-xs text-cocoa-400">加载中…</span>
        </div>
        <div v-if="sessions.length === 0 && !sessionsLoading" class="text-xs text-cocoa-400 py-4 text-center">
          暂无历史会话，点击「新对话」开始
        </div>
        <div
          v-for="s in sessions"
          :key="s.id"
          :class="[
            'group flex items-center gap-1.5 px-2.5 py-2 rounded-xl cursor-pointer transition-colors mb-1',
            currentId === s.id ? 'bg-butter-100' : 'hover:bg-cream-100',
          ]"
          @click="openSession(s.id)"
        >
          <Pin v-if="s.pinned" class="w-3.5 h-3.5 text-butter-500 shrink-0" />
          <div class="flex-1 min-w-0">
            <div class="text-sm font-medium text-cocoa-800 truncate">{{ s.title }}</div>
            <div class="text-xs text-cocoa-400 truncate">{{ s.preview || '暂无消息' }}</div>
          </div>
          <button
            class="opacity-0 group-hover:opacity-100 p-1 rounded text-cocoa-400 hover:text-butter-600"
            :title="s.pinned ? '取消置顶' : '置顶会话'"
            @click.stop="onTogglePin(s.id)"
          >
            <Pin class="w-3.5 h-3.5" :class="s.pinned ? 'text-butter-500' : ''" />
          </button>
          <button
            class="opacity-0 group-hover:opacity-100 p-1 rounded text-cocoa-400 hover:text-cocoa-700"
            title="删除会话"
            @click.stop="onDeleteSession(s.id)"
          >
            <Trash2 class="w-3.5 h-3.5" />
          </button>
        </div>
      </aside>

      <!-- 主对话区 -->
      <div class="flex flex-col flex-1 min-w-0">
        <!-- 消息列表 -->
        <div ref="listEl" class="flex-1 overflow-y-auto bg-surface rounded-2xl shadow-softer p-4 space-y-3">
          <div
            v-for="(m, i) in messages"
            :key="i"
            :class="['flex gap-2', m.role === 'user' ? 'flex-row-reverse' : '']"
          >
            <div :class="['w-8 h-8 rounded-full flex items-center justify-center shrink-0', m.role === 'user' ? 'bg-butter-300' : 'bg-mint-100']">
              <User v-if="m.role === 'user'" class="w-4 h-4 text-cocoa-700" />
              <Bot v-else class="w-4 h-4 text-mint-500" />
            </div>
            <div
              :class="[
                'max-w-[80%] px-3 py-2 rounded-2xl text-sm whitespace-pre-wrap break-words',
                m.role === 'user' ? 'bg-butter-500 text-white rounded-tr-sm' : 'bg-cream-50 text-cocoa-900 rounded-tl-sm',
              ]"
            >{{ m.content }}</div>
          </div>
        </div>

        <!-- 输入区 -->
        <div class="mt-3 flex gap-2">
          <textarea
            v-model="input"
            rows="2"
            placeholder="输入消息，Enter 发送，Shift+Enter 换行"
            class="flex-1 px-4 py-3 rounded-2xl border border-cream-200 bg-surface text-sm focus:outline-none focus:border-butter-400 resize-none"
            @keydown="onKeydown"
          />
          <button
            class="px-5 rounded-2xl bg-butter-500 text-white hover:bg-butter-600 disabled:opacity-60"
            :disabled="sending || !input.trim()"
            @click="send"
          >
            <Send class="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
