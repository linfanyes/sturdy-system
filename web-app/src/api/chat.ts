import request from './request'
import {
  type ChatSessionDTO,
  type ChatMessage,
  type ChatSessionDetailDTO,
  type CreateChatSessionDTO,
  type AppendChatMessageDTO,
  CHAT_SESSIONS_PATHS,
} from '@gardener/shared/api/endpoints'

export type {
  ChatSessionDTO,
  ChatMessage,
  ChatSessionDetailDTO,
  CreateChatSessionDTO,
  AppendChatMessageDTO,
}

/**
 * AI 对话历史 API：会话的增删改查、追加消息、置顶。
 * 后端按教师租户隔离，数据可跨设备同步。
 *
 * 【共享】端点路径、请求/响应类型已从 @gardener/shared 导入，
 * 与小程序端共用同一份端点契约（server 唯一事实来源）。
 * 函数实现仍走 request（Web 适配层）。
 */

/** 新建会话 */
export function createChatSession(title?: string) {
  return request.post(CHAT_SESSIONS_PATHS.create, { title } satisfies CreateChatSessionDTO)
}

/** 会话列表 */
export function fetchChatSessions() {
  return request.get<ChatSessionDTO[]>(CHAT_SESSIONS_PATHS.list)
}

/** 会话详情（含全部消息） */
export function fetchChatSession(id: string) {
  return request.get<ChatSessionDetailDTO>(CHAT_SESSIONS_PATHS.byId(id))
}

/** 追加一条消息 */
export function appendChatMessage(id: string, role: 'user' | 'assistant', content: string) {
  return request.patch(CHAT_SESSIONS_PATHS.appendMessage(id), { role, content } satisfies AppendChatMessageDTO)
}

/** 置顶/取消置顶 */
export function toggleChatPin(id: string) {
  return request.patch(CHAT_SESSIONS_PATHS.togglePin(id))
}

/** 删除会话 */
export function deleteChatSession(id: string) {
  return request.delete(CHAT_SESSIONS_PATHS.remove(id))
}
