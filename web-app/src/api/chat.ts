import request from './request'

/**
 * AI 对话历史 API：会话的增删改查、追加消息、置顶。
 * 后端按教师租户隔离，数据可跨设备同步。
 */
export interface ChatSessionDTO {
  id: string
  title: string
  pinned: boolean
  messageCount: number
  updatedAt: string
  preview: string
}

export interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
  createdAt: string
}

/** 新建会话 */
export function createChatSession(title?: string) {
  return request.post('/chat-sessions', { title })
}

/** 会话列表 */
export function fetchChatSessions() {
  return request.get<ChatSessionDTO[]>('/chat-sessions')
}

/** 会话详情（含全部消息） */
export function fetchChatSession(id: string) {
  return request.get<{ id: string; title: string; messages: ChatMessage[]; pinned: boolean }>(`/chat-sessions/${id}`)
}

/** 追加一条消息 */
export function appendChatMessage(id: string, role: 'user' | 'assistant', content: string) {
  return request.patch(`/chat-sessions/${id}/messages`, { role, content })
}

/** 置顶/取消置顶 */
export function toggleChatPin(id: string) {
  return request.patch(`/chat-sessions/${id}/pin`)
}

/** 删除会话 */
export function deleteChatSession(id: string) {
  return request.delete(`/chat-sessions/${id}`)
}