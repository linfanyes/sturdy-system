import api from '../common/request'
import { listClasses } from './teaching'

export { listClasses }

/** 小组分数列表 */
export function listGroupScores(opts = {}) {
  return api.getList('/group-scores', opts)
}
/** 创建小组分数 */
export function createGroupScore(payload) {
  return api.post('/group-scores', payload)
}
/** 更新小组分数 */
export function updateGroupScore(id, payload) {
  return api.patch('/group-scores/' + id, payload)
}
/** 删除小组分数 */
export function removeGroupScore(id) {
  return api.del('/group-scores/' + id)
}
