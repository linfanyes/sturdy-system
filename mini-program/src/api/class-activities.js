import api from '../common/request'
import { listClasses } from './teaching'

/** 班级活动列表 */
export function listClassActivities(opts = {}) {
  return api.get('/class-activities', opts)
}
/** 创建班级活动 */
export function createClassActivity(payload) {
  return api.post('/class-activities', payload)
}
/** 更新班级活动 */
export function updateClassActivity(id, payload) {
  return api.patch('/class-activities/' + id, payload)
}
/** 删除班级活动 */
export function removeClassActivity(id) {
  return api.del('/class-activities/' + id)
}
