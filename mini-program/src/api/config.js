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
