import { defineStore } from 'pinia'
import { ref, watch } from 'vue'
import type { AISettings, AIChat, AIMessage, AIAttachment } from '../types'
import { now, uid } from '../utils'
import { AI_DASHSCOPE_BASE_URL } from '../utils/aiBase'
import { getStorageKey, onUserChange } from '../utils/storage'

const SETTINGS_KEY = () => getStorageKey('ai-settings')
const CHATS_KEY = () => getStorageKey('ai-chats')

/** 默认文本模型列表 */
export const DEFAULT_TEXT_MODELS = ['qwen-plus', 'deepseek-chat', 'deepseek-reasoner']

/** 默认多模态模型列表 */
export const DEFAULT_VISION_MODELS = ['qwen-vl-plus', 'gpt-4o', 'qwen-vl-max']

const DEFAULT_SETTINGS: AISettings = {
  baseUrl: AI_DASHSCOPE_BASE_URL,
  apiKey: '',
  textModel: 'qwen-plus',
  visionModel: 'qwen-vl-plus',
  temperature: 0.8,
  aiName: '小林子',
  systemPrompt:
    '你是一位亲切、专业的教师助理，名字叫「小林子」。回答要简洁、清晰、有条理。涉及数据时尽量用列表或表格，方便老师快速理解。\n\n你已被自动注入本系统的「使用说明书」和老师本人的班级/学生/成绩/课表/笔记/待办/奖惩等真实数据。\n- 当老师问到「这个系统怎么用 / XX功能在哪里 / 如何操作」时, 优先基于说明书回答, 准确给出入口路径和操作步骤。\n- 当老师问到「我的XX班级/学生/成绩/课表/笔记」时, 基于已注入的真实数据回答, 不要编造。',
}

function migrateSettings(data: Partial<AISettings>): AISettings {
  const merged: AISettings = { ...DEFAULT_SETTINGS, ...data }
  // 兼容旧版单一 model 字段：若旧 model 是视觉模型则也作为 visionModel，否则仅作为 textModel
  if (merged.model && !merged.textModel && !merged.visionModel) {
    const m = merged.model.toLowerCase()
    const looksVision = /vl|vision|gpt-4o|gpt-4-turbo|glm-4v|qwen-vl|longcat|gemini|claude|doubao-vision|moonshot|kimi/i.test(m)
    merged.textModel = looksVision ? DEFAULT_SETTINGS.textModel : merged.model
    merged.visionModel = looksVision ? merged.model : DEFAULT_SETTINGS.visionModel
  }
  merged.textModel = merged.textModel || DEFAULT_SETTINGS.textModel
  merged.visionModel = merged.visionModel || DEFAULT_SETTINGS.visionModel
  return merged
}

function loadSettings(): AISettings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY())
    if (raw) {
      const data = JSON.parse(raw)
      return migrateSettings(data)
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

/** 单条消息最多允许的图片附件数量 (避免内存占用过大) */
export const MAX_IMAGES_PER_MESSAGE = 9

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
    if (id === activeChatId.value) return
    releaseInactiveImages(id)
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

  /** 释放非活跃对话中所有图片附件的 dataUrl，减少内存占用 */
  function releaseInactiveImages(keepChatId: string | null) {
    for (const c of chats.value) {
      if (c.id === keepChatId) continue
      for (const m of c.messages) {
        if (!m.attachments) continue
        for (const a of m.attachments) {
          if (a.kind === 'image' && a.dataUrl) {
            ;(a as AIAttachment).dataUrl = undefined
          }
        }
      }
    }
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
    let attachments = msg.attachments
    if (attachments && attachments.filter((a) => a.kind === 'image').length > MAX_IMAGES_PER_MESSAGE) {
      const imgs = attachments.filter((a) => a.kind === 'image').slice(0, MAX_IMAGES_PER_MESSAGE)
      const others = attachments.filter((a) => a.kind !== 'image')
      attachments = [...imgs, ...others]
    }
    chat.messages.push({
      id: uid(),
      role: msg.role,
      content: msg.content,
      createdAt: now(),
      attachments,
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
      // 安全提示：当前 API Key 以明文形式持久化到 localStorage（按用户隔离）。
      // 浏览器/纯前端环境无法安全地长期保存密钥，后续可考虑增加「仅当前会话记住」开关。
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
