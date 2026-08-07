import api from '../common/request'

/** 收件箱列表 */
export function listMessages(opts = {}) {
  return api.get('/messages', opts)
}
/** 发件箱列表 */
export function listSentMessages(opts = {}) {
  return api.get('/messages/sent', opts)
}
/** 收件人列表 */
export function listRecipients(opts = {}) {
  return api.get('/messages/recipients', opts)
}
/** 发送留言 */
export function sendMessage(payload) {
  return api.post('/messages', payload)
}
/** 标记单条已读 */
export function markMessageRead(id) {
  return api.patch('/messages/' + id + '/read', {})
}
/** 标记全部已读 */
export function markAllRead() {
  return api.patch('/messages/mark-all-read', {})
}
/** 删除留言 */
export function removeMessage(id) {
  return api.del('/messages/' + id)
}
