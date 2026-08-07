import api from '../common/request'

/** 奖项分类列表 */
export function listAwardCategories(opts = {}) {
  return api.get('/award-categories', opts)
}
/** 创建奖项分类 */
export function createAwardCategory(payload) {
  return api.post('/award-categories', payload)
}
/** 更新奖项分类 */
export function updateAwardCategory(id, payload) {
  return api.patch('/award-categories/' + id, payload)
}
/** 删除奖项分类 */
export function removeAwardCategory(id) {
  return api.del('/award-categories/' + id)
}
