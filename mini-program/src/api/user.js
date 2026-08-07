import api from '../common/request'

/** 获取当前用户信息 */
export function getMe() {
  return api.get('/users/me')
}
/** 更新当前用户信息（全量 PUT） */
export function updateMe(payload) {
  return api.put('/users/me', payload)
}
/** 部分更新当前用户信息（PATCH，用于主题/颜色等单字段更新） */
export function patchMe(payload) {
  return api.patch('/users/me', payload)
}
/** 统一登录 */
export function unifiedLogin(payload) {
  return api.post('/auth/unified-login', payload)
}
