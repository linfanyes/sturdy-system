import { defineStore } from 'pinia'
import { ref, watch } from 'vue'
import type { AISettings, AIChat, AIMessage, AIAttachment } from '../types'
import { now, uid } from '../utils'
import { AI_DASHSCOPE_BASE_URL } from '../utils/aiBase'
import { getStorageKey, onUserChange } from '../utils/storage'

const SETTINGS_KEY = () => getStorageKey('ai-settings')
const CHATS_KEY = () => getStorageKey('ai-chats')

/** 默认模型列表（含 deepseek 系列） */
export const DEFAULT_AI_MODELS = ['qwen3.7-plus', 'qwen3-vl-plus']

const DEFAULT_SETTINGS: AISettings = {
  baseUrl: AI_DASHSCOPE_BASE_URL,
  apiKey: '',
  model: 'qwen3.7-plus',
  temperature: 0.6,
  aiName: '小林子',
  systemPrompt:
    '你是一位亲切、专业的教师助理，名字叫「小林子」。回答要简洁、清晰、有条理。涉及数据时尽量用列表或表格，方便老师快速理解。\n\n你已被自动注入本系统的「使用说明书」和老师本人的班级/学生/成绩/课表/笔记/待办/奖惩等真实数据。\n- 当老师问到「这个系统怎么用 / XX功能在哪里 / 如何操作」时, 优先基于说明书回答, 准确给出入口路径和操作步骤。\n- 当老师问到「我的XX班级/学生/成绩/课表/笔记」时, 基于已注入的真实数据回答, 不要编造。',
}

function loadSettings(): AISettings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY())
    if (raw) {
      const data = JSON.parse(raw)
      return { ...DEFAULT_SETTINGS, ...data }
    }
  } catch (e) {
    /* noop */
  }
  return { ...DEFAULT_SETTINGS }
}

function loadChats(): AIChat[] {
  try {
    const raw = localStorage.getItem(CHATS_KEY())
    if (raw) return JSON.parse(raw)
  } catch (e) {
    /* noop */
  }
  return []
}

export const useAIStore = defineStore('ai', () => {
  const settings = ref<AISettings>(loadSettings())
  const chats = ref<AIChat[]>(loadChats())
  const activeChatId = ref<string | null>(chats.value[0]?.id || null)

  function reload() {
    settings.value = loadSettings()
    chats.value = loadChats()
    activeChatId.value = chats.value[0]?.id || null
  }

  function setSettings(patch: Partial<AISettings>) {
    settings.value = { ...settings.value, ...patch }
  }
  function resetSettings() {
    settings.value = { ...DEFAULT_SETTINGS }
  }

  function createChat(title = '新对话'): AIChat {
    const chat: AIChat = {
      id: uid(),
      title,
      messages: [],
      createdAt: now(),
      updatedAt: now(),
    }
    chats.value.unshift(chat)
    activeChatId.value = chat.id
    return chat
  }
  function getActiveChat(): AIChat | null {
    if (!activeChatId.value) return null
    return chats.value.find((c) => c.id === activeChatId.value) || null
  }
  function setActiveChat(id: string | null) {
    activeChatId.value = id
  }
  function removeChat(id: string) {
    chats.value = chats.value.filter((c) => c.id !== id)
    if (activeChatId.value === id) {
      activeChatId.value = chats.value[0]?.id || null
    }
  }
  function clearChats() {
    chats.value = []
    activeChatId.value = null
  }
  function appendMessage(
    chatId: string,
    msg: {
      role: AIMessage['role']
      content: string
      attachments?: AIAttachment[]
    },
  ) {
    const chat = chats.value.find((c) => c.id === chatId)
    if (!chat) return
    chat.messages.push({
      id: uid(),
      role: msg.role,
      content: msg.content,
      createdAt: now(),
      attachments: msg.attachments,
    })
    chat.updatedAt = now()
  }
  function updateLastMessage(chatId: string, content: string) {
    const chat = chats.value.find((c) => c.id === chatId)
    if (!chat || !chat.messages.length) return
    chat.messages[chat.messages.length - 1].content = content
    chat.updatedAt = now()
  }
  function renameChatTitle(chatId: string, title: string) {
    const chat = chats.value.find((c) => c.id === chatId)
    if (chat) chat.title = title
  }

  watch(
    settings,
    (val) => {
      localStorage.setItem(SETTINGS_KEY(), JSON.stringify(val))
    },
    { deep: true },
  )
  watch(
    chats,
    (val) => {
      // 持久化时过滤掉图片 dataUrl (避免 localStorage 体积爆炸)
      const slim = val.map((c) => ({
        ...c,
        messages: c.messages.map((m) => ({
          ...m,
          attachments: m.attachments?.map((a) => {
            const { dataUrl: _drop, ...rest } = a
            return rest as AIAttachment
          }),
        })),
      }))
      localStorage.setItem(CHATS_KEY(), JSON.stringify(slim))
    },
    { deep: true },
  )

  onUserChange(() => {
    reload()
  })

  return {
    settings,
    chats,
    activeChatId,
    setSettings,
    resetSettings,
    createChat,
    getActiveChat,
    setActiveChat,
    removeChat,
    clearChats,
    appendMessage,
    updateLastMessage,
    renameChatTitle,
    reload,
  }
})
