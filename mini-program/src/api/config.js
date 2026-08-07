import api from '../common/request'

/** AI 设置 */
export function getAiSettings() {
  return api.get('/config/ai-settings')
}
export function updateAiSettings(payload) {
  return api.patch('/config/ai-settings', payload)
}
/** 应用配置 */
export function getAppConfig() {
  return api.get('/config/app-config')
}
export function updateAppConfig(payload) {
  return api.patch('/config/app-config', payload)
}
/** AI 提供商列表 */
export function getAiProviders() {
  return api.get('/config/ai-providers')
}
/** 公开配置（含 defaultSubjects） */
export function getPublicConfig() {
  return api.get('/config/public')
}
/** 保存 AI 配置（兼容新旧端点：优先 PATCH /config/ai-settings，回退 PUT /config/ai） */
export async function saveAiConfig(payload) {
  try {
    return await api.patch('/config/ai-settings', payload)
  } catch (_) {
    return await api.put('/config/ai', payload)
  }
}
