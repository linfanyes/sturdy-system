/**
 * 后端端点契约（API Endpoints Contract）—— Web 端 & 小程序端的单一事实来源。
 *
 * 【契约】每个端点定义 method / path 模板 / 请求与响应类型。
 * 两侧的请求实现（fetch / callContainer 等）各自保留，类型与 path 常量从这里导入。
 *
 * 【对齐】契约与 server/src/game-scores/*.controller.ts、server/src/chat-history/*.controller.ts 严格一致。
 * 若后端接口变更，只需改此处 + 对应 controller，两侧无需再同步。
 */

// ======== 小游戏得分 ========

/** 游戏得分提交 / 查询 endpoints */
export const GAME_SCORES_PATHS = {
  /** POST /game-scores —— 上报一次对局得分（幂等 upsert） */
  submit: '/game-scores',
  /** GET /game-scores —— 当前教师所有游戏得分（榜单） */
  list: '/game-scores',
  /** GET /game-scores/:gameKey —— 单游戏最高分 */
  byKey: (gameKey: string) => `/game-scores/${gameKey}`,
} as const

/** 提交得分的请求体（与后端 GameScore entity 对齐） */
export interface GameScoreSubmitDTO {
  gameKey: string
  gameName?: string
  score: number
  durationSec?: number
}

/** 后端游戏得分记录（GET /game-scores 返回的单项） */
export interface GameScoreRecord {
  id: string
  teacherId: string
  gameKey: string
  gameName?: string
  bestScore: number
  lastScore: number
  playCount: number
  durationSec: number
  createdAt: string
  updatedAt: string
}

// ======== AI 对话历史 ========

/** AI 对话 history endpoints */
export const CHAT_SESSIONS_PATHS = {
  /** POST /chat-sessions —— 新建会话 */
  create: '/chat-sessions',
  /** GET /chat-sessions —— 会话列表 */
  list: '/chat-sessions',
  /** GET /chat-sessions/:id —— 会话详情（含全部消息） */
  byId: (id: string) => `/chat-sessions/${id}`,
  /** PATCH /chat-sessions/:id/messages —— 追加一条消息 */
  appendMessage: (id: string) => `/chat-sessions/${id}/messages`,
  /** PATCH /chat-sessions/:id/pin —— 置顶/取消置顶 */
  togglePin: (id: string) => `/chat-sessions/${id}/pin`,
  /** DELETE /chat-sessions/:id —— 删除会话 */
  remove: (id: string) => `/chat-sessions/${id}`,
} as const

/** 单条聊天消息（会话内） */
export interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
  createdAt?: string
}

/** 后端会话记录（GET /chat-sessions list 返回的单项） */
export interface ChatSessionDTO {
  id: string
  title: string
  pinned: boolean
  messageCount: number
  updatedAt: string
  preview: string
}

/** 新建会话请求体 */
export interface CreateChatSessionDTO {
  title?: string
}

/** 会话详情（GET /chat-sessions/:id 返回） */
export interface ChatSessionDetailDTO {
  id: string
  title: string
  messages: ChatMessage[]
  pinned: boolean
}

/** 追加消息请求体 */
export interface AppendChatMessageDTO {
  role: 'user' | 'assistant'
  content: string
}

/** toggle pin 返回的会话片段 */
export interface ChatSessionPinResult {
  id: string
  pinned: boolean
}
