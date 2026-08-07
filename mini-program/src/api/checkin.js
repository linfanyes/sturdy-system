import api from '../common/request'

/** 打卡列表 */
export function listCheckins(opts = {}) {
  return api.getList('/checkins', opts)
}
/** 创建打卡 */
export function createCheckin(payload) {
  return api.post('/checkins', payload)
}
/** 删除打卡 */
export function removeCheckin(id) {
  return api.del('/checkins/' + id)
}
