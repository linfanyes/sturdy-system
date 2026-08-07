import api from '../common/request'
import { listClasses } from './teaching'

/** 获奖记录列表 */
export function listAwardRecords(opts = {}) {
  return api.getList('/award-records', opts)
}
/** 创建获奖记录 */
export function createAwardRecord(payload) {
  return api.post('/award-records', payload)
}
/** 更新获奖记录 */
export function updateAwardRecord(id, payload) {
  return api.patch('/award-records/' + id, payload)
}
/** 删除获奖记录 */
export function removeAwardRecord(id) {
  return api.del('/award-records/' + id)
}
