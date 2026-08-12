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

/** 收件人候选列表（按当前登录角色动态返回：家长/教师/校管/超管） */
export interface RecipientItem {
  id: string
  name: string
  role: 'teacher' | 'parent' | 'school_admin' | 'super'
  schoolId?: string
  extra?: Record<string, any>
}
export function listRecipients() {
  return request.get<any, RecipientItem[]>('/messages/recipients')
}

/** 标记单条留言已读 */
export function markMessageRead(id: string) {
  return request.patch<any, { id: string; isRead: boolean }>(`/messages/${id}/read`)
}

/** 一键全部已读 */
export function markAllMessagesRead() {
  return request.patch<any, { ok: boolean }>('/messages/mark-all-read')
}

/** 删除留言 */
export function removeMessage(id: string) {
  return request.delete<any, { id: string; deleted: boolean }>(`/messages/${id}`)
}
