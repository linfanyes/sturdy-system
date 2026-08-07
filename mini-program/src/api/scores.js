import api from '../common/request'

/** 成绩记录列表 */
export function listScoreRecords(opts = {}) {
  return api.getList('/score-records', opts)
}
/** 创建成绩记录 */
export function createScoreRecord(payload) {
  return api.post('/score-records', payload)
}
/** 更新成绩记录 */
export function updateScoreRecord(id, payload) {
  return api.patch('/score-records/' + id, payload)
}
/** 删除成绩记录 */
export function removeScoreRecord(id) {
  return api.del('/score-records/' + id)
}
/** 奖励记录列表 */
export function listRewardRecords(opts = {}) {
  return api.getList('/reward-records', opts)
}
/** 创建奖励记录 */
export function createRewardRecord(payload) {
  return api.post('/reward-records', payload)
}
/** 更新奖励记录 */
export function updateRewardRecord(id, payload) {
  return api.patch('/reward-records/' + id, payload)
}
/** 删除奖励记录 */
export function removeRewardRecord(id) {
  return api.del('/reward-records/' + id)
}
/** 小组成绩列表 */
export function listGroupScores(opts = {}) {
  return api.getList('/group-scores', opts)
}
/** 创建小组成绩 */
export function createGroupScore(payload) {
  return api.post('/group-scores', payload)
}
/** 更新小组成绩 */
export function updateGroupScore(id, payload) {
  return api.patch('/group-scores/' + id, payload)
}
/** 删除小组成绩 */
export function removeGroupScore(id) {
  return api.del('/group-scores/' + id)
}
