import request from './request'

export interface AppNotification {
  id: string
  type: string
  title: string
  content?: string
  read: boolean
  createdAt: string
  link?: string
}

export function listNotifications(skip = 0, take = 20) {
  return request.get<any, { items: AppNotification[]; total: number } | AppNotification[]>('/notifications', { params: { skip, take } })
}

export function getUnreadCount() {
  return request.get<any, { count: number }>('/notifications/unread-count')
}

export function markAllRead() {
  return request.post('/notifications/mark-all-read')
}

export function markRead(id: string) {
  return request.post(`/notifications/${id}/read`)
}

export interface AppMessage {
  id: string
  category: string
  title: string
  content?: string
  read: boolean
  createdAt: string
}

export function listMessages(skip = 0, take = 20) {
  return request.get<any, { items: AppMessage[]; total: number } | AppMessage[]>('/messages', { params: { skip, take } })
}

export function markMessageRead(id: string) {
  return request.post(`/messages/${id}/read`)
}
