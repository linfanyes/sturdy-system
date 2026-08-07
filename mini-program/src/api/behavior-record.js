import api from '../common/request'
import { listStudents } from './students'
import { listClasses } from './teaching'

/** 行为记录列表 */
export function listBehaviorRecords(opts = {}) {
  return api.getList('/behavior-records', opts)
}
/** 创建行为记录 */
export function createBehaviorRecord(payload) {
  return api.post('/behavior-records', payload)
}
/** 更新行为记录 */
export function updateBehaviorRecord(id, payload) {
  return api.patch('/behavior-records/' + id, payload)
}
/** 删除行为记录 */
export function removeBehaviorRecord(id) {
  return api.del('/behavior-records/' + id)
}
