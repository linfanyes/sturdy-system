import api from '../common/request'

/** 获取当前用户信息 */
export function getMe() {
  return api.get('/users/me')
}
/** 更新当前用户信息 */
export function updateMe(payload) {
  return api.put('/users/me', payload)
}
