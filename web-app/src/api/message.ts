import request from './request'

/** 站内留言（家校留言）条目 */
export interface MessageItem {
  id: string
  senderId: string | null
  senderRole: string | null
  recipientId: string
  recipientRole: string
  title: string
  content: string
  type: string
  isRead: boolean
  createdAt: string
}

/** 发送留言（发件人取当前登录令牌，不传前端 sender 字段，避免伪造） */
export function sendMessage(dto: {
  recipientId: string
  recipientRole: string
  title: string
  content: string
  type?: string
}) {
  return request.post<any, MessageItem>('/messages', dto)
}

/** 当前用户作为收件人的留言列表 */
export function listMessages(skip = 0, take = 20) {
  return request.get<any, { items: MessageItem[]; total: number }>('/messages', { params: { skip, take } })
}

/** 当前用户发出的留言列表 */
export function listSentMessages(skip = 0, take = 20) {
  return request.get<any, { items: MessageItem[]; total: number }>('/messages/sent', { params: { skip, take } })
}

/** 当前用户未读留言数 */
export function unreadMessageCount() {
  return request.get<any, { count: number }>('/messages/unread-count')
}
