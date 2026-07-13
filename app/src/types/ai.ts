/** AI 模型设置 */
export interface AISettings {
  /** 基础 URL（默认 deepseek） */
  baseUrl: string
  /** API Key */
  apiKey: string
  /** 模型名 */
  model: string
  /** 温度 */
  temperature: number
  /** AI 名字 */
  aiName: string
  /** 系统提示词前缀（可编辑） */
  systemPrompt: string
}

/** AI 对话附件 (用户上传到 AI 对话) */
export type AIAttachmentKind = 'text' | 'image' | 'doc' | 'unsupported'

export interface AIAttachment {
  id: string
  name: string
  kind: AIAttachmentKind
  mime: string
  size: number
  /** 文本内容 (kind=text 时使用) */
  text?: string
  /** 图片 base64 dataURL (仅运行时存在, 不持久化到 localStorage) */
  dataUrl?: string
}

/** AI 对话消息 */
export interface AIMessage {
  id: string
  role: 'system' | 'user' | 'assistant'
  content: string
  /** 关联时间戳 */
  createdAt: number
  /** 附件 (仅 user 消息; 文本附件会存到 text, 图片 dataUrl 仅运行时保留) */
  attachments?: AIAttachment[]
}

/** AI 对话会话 */
export interface AIChat {
  id: string
  title: string
  messages: AIMessage[]
  createdAt: number
  updatedAt: number
}
