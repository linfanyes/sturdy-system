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
  return request
    .get<any, { items: any[]; total: number } | any[]>('/messages', { params: { skip, take } })
    .then((res) => {
      // 后端返回 isRead / type；前端视图按 read / category 渲染，在此统一适配
      const normalize = (m: any) => ({
        ...m,
        read: m.isRead ?? m.read ?? false,
        category: 'message',
      })
      if (Array.isArray(res)) {
        return res.map(normalize)
      }
      const items = (res?.items || []).map(normalize)
      return { items, total: res?.total ?? items.length }
    })
}

export function markMessageRead(id: string) {
  return request.patch(`/messages/${id}/read`)
}
