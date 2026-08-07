import api from '../common/request'
import { listClasses } from './teaching'
import { listStudents } from './students'

/** 班级列表（便捷：奖励页面需要先选班） */
export { listClasses }
/** 学生列表（按班级筛选） */
export { listStudents }

/** 奖励项目列表 */
export function listRewardItems(opts = {}) {
  return api.getList('/reward-items', opts)
}
/** 兑换记录列表 */
export function listRewardRecords(opts = {}) {
  return api.getList('/reward-records', opts)
}
/** 创建兑换记录 */
export function createRewardRecord(payload) {
  return api.post('/reward-records', payload)
}
/** 删除兑换记录 */
export function removeRewardRecord(id) {
  return api.del('/reward-records/' + id)
}
