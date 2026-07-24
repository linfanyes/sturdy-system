<script setup lang="ts">
import { ref, nextTick, onMounted } from 'vue'
import { useAuthStore } from '@/stores/auth'
import request from '@/api/request'
import { Send, Bot, User, Trash2 } from 'lucide-vue-next'

const auth = useAuthStore()

interface Msg { role: 'user' | 'assistant' | 'system'; content: string }

const messages = ref<Msg[]>([
  { role: 'assistant', content: '你好，我是 AI 教学助手，可以帮你备课、生成教案、分析成绩、撰写评语等，请问有什么可以帮你？' },
])
const input = ref('')
const sending = ref(false)
const listEl = ref<HTMLElement | null>(null)

async function scrollToBottom() {
  await nextTick()
  if (listEl.value) listEl.value.scrollTop = listEl.value.scrollHeight
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

  try {
    // 使用 SSE 流式接口
    const token = auth.token
    const resp = await fetch(`${import.meta.env.VITE_API_BASE || ''}/ai/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({ messages: messages.value.filter(m => m.role !== 'system').slice(0, -1).map(m => ({ role: m.role, content: m.content })) }),
    })
    if (!resp.body) throw new Error('无响应流')
    const reader = resp.body.getReader()
    const decoder = new TextDecoder()
    let buf = ''
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      buf += decoder.decode(value, { stream: true })
      const lines = buf.split('\n')
      buf = lines.pop() || ''
      for (const line of lines) {
        if (!line.startsWith('data: ')) continue
        const data = line.slice(6).trim()
        if (data === '[DONE]') continue
        try {
          const obj = JSON.parse(data)
          if (obj.error) { assistantMsg.value.content += `\n\n[错误] ${obj.error}`; break }
          if (obj.delta) { assistantMsg.value.content += obj.delta; await scrollToBottom() }
        } catch {}
      }
    }
    if (!assistantMsg.value.content) assistantMsg.value.content = '（无响应内容，请检查 AI 配置）'
  } catch (e: any) {
    assistantMsg.value.content = `请求失败：${e?.message || '未知错误'}`
  } finally {
    sending.value = false
    await scrollToBottom()
  }
}

function clearChat() {
  messages.value = [{ role: 'assistant', content: '已清空对话，开始新的会话。' }]
}

function onKeydown(e: KeyboardEvent) {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault()
    send()
  }
}
</script>

<template>
  <div class="flex flex-col h-[calc(100vh-9rem)]">
    <div class="flex items-center justify-between mb-3">
      <h1 class="text-2xl font-bold text-cocoa-900 flex items-center gap-2">
        <Bot class="w-6 h-6 text-butter-500" /> AI 助手
      </h1>
      <button class="p-2 rounded-xl hover:bg-cream-100 text-cocoa-500" title="清空对话" @click="clearChat">
        <Trash2 class="w-4 h-4" />
      </button>
    </div>

    <!-- 消息列表 -->
    <div ref="listEl" class="flex-1 overflow-y-auto bg-white rounded-2xl shadow-softer p-4 space-y-3">
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
        class="flex-1 px-4 py-3 rounded-2xl border border-cream-200 bg-white text-sm focus:outline-none focus:border-butter-400 resize-none"
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
</template>
