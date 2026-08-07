import api from '../common/request'

/** 作业列表 */
export function listHomework(opts = {}) {
  return api.getList('/homework', opts)
}
/** 创建作业 */
export function createHomework(payload) {
  return api.post('/homework', payload)
}
/** 更新作业 */
export function updateHomework(id, payload) {
  return api.patch('/homework/' + id, payload)
}
/** 删除作业 */
export function removeHomework(id) {
  return api.del('/homework/' + id)
}
