import api from '../common/request'

/** 通知列表 */
export function listNotifications(opts = {}) {
  return api.get('/notifications', opts)
}
/** 标记单条通知已读 */
export function markNotificationRead(id) {
  return api.patch('/notifications/' + id + '/read', {})
}
/** 标记全部通知已读 */
export function markAllNotificationsRead() {
  return api.post('/notifications/mark-all-read', {})
}
