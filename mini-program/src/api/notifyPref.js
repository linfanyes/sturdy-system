import { parentApi } from '../common/request'

// 家长端通知偏好与成绩分级可见
export function getNotifyPref() {
  return parentApi.get('/parent/notify-prefs/me')
}
export function upsertNotifyPref(dto) {
  return parentApi.put('/parent/notify-prefs/me', dto)
}
