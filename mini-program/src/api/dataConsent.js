import { parentApi } from '../common/request'

// 家长端数据授权（监护人同意 / 撤回）
export function getConsent() {
  return parentApi.get('/parent/consent/me')
}
export function upsertConsent(dto) {
  return parentApi.put('/parent/consent/me', dto)
}
export function withdrawConsent() {
  return parentApi.post('/parent/consent/withdraw')
}
