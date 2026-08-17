import request from '../request'

/* ============ 通用配置 / 消息 ============ */

/** AI 供应商列表 */
export function listAiProviders() {
  return request.get<any, any>('/ai-providers')
}

/** 校管：本校可用 AI 供应商 */
export function listSchoolAiProviders() {
  return request.get<any, any>('/config/ai-providers')
}

/** 保存 AI 模型配置 */
export function saveAiModels(data: Record<string, any>) {
  return request.post<any, any>('/config/ai/models', data)
}

/** 教师 AI 默认参数 */
export function getTeacherAiDefaults() {
  return request.get<any, any>('/config/teacher/ai-defaults')
}

/** AI 全局设置 */
export function getAiSettings() {
  return request.get<any, any>('/config/ai-settings')
}

/** 更新 AI 全局设置 */
export function updateAiSettings(data: Record<string, any>) {
  return request.patch<any, any>('/config/ai-settings', data)
}

/** 应用配置 */
export function getAppConfig() {
  return request.get<any, any>('/config/app-config')
}

/** 更新应用配置 */
export function updateAppConfig(data: Record<string, any>) {
  return request.patch<any, any>('/config/app-config', data)
}

/** 更新当前用户资料 */
export function updateMe(data: Record<string, any>) {
  return request.patch<any, any>('/users/me', data)
}

/** 推送公告到家长端 */
export function pushNotice(noticeId: string) {
  return request.post<any, any>('/security/push-notice', { noticeId })
}

/* ============ 留言板 ============ */

/** 留言板：可选收件人列表 */
export function listMessageRecipients() {
  return request.get<any, any>('/messages/recipients')
}

/** 留言板：会话列表 */
export function listMessages(params?: Record<string, any>) {
  return request.get<any, any>('/messages', { params })
}

/** 留言板：未读数 */
export function unreadMessageCount() {
  return request.get<any, { count: number }>('/messages/unread-count')
}

/** 留言板：已发送列表 */
export function listMessagesSent(params?: Record<string, any>) {
  return request.get<any, any>('/messages/sent', { params })
}

/** 标记单条留言已读 */
export function markMessageRead(id: string) {
  return request.patch<any, void>('/messages/' + id + '/read')
}

/** 全部已读 */
export function markAllMessagesRead() {
  return request.patch<any, void>('/messages/mark-all-read')
}

/** 删除留言 */
export function deleteMessage(id: string) {
  return request.delete<any, void>('/messages/' + id)
}

/** 发送留言 */
export function sendMessage(data: Record<string, any>) {
  return request.post<any, any>('/messages', data)
}
