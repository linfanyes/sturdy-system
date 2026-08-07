import api from '../common/request'

/** 资源列表 */
export function listResources(opts = {}) {
  return api.getList('/resources', opts)
}
/** 创建资源 */
export function createResource(payload) {
  return api.post('/resources', payload)
}
/** 删除资源 */
export function removeResource(id) {
  return api.del('/resources/' + id)
}
