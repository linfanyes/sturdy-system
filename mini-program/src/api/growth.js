import api from '../common/request'

/** 成长档案列表 */
export function listGrowthEntries(opts = {}) {
  return api.getList('/growth-entries', opts)
}
/** 创建成长档案 */
export function createGrowthEntry(payload) {
  return api.post('/growth-entries', payload)
}
/** 删除成长档案 */
export function removeGrowthEntry(id) {
  return api.del('/growth-entries/' + id)
}
