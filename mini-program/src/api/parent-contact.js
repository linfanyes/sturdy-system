import api from '../common/request'
import { listStudents } from './students'
import { listClasses } from './teaching'

/** 家长联系记录列表 */
export function listParentContacts(opts = {}) {
  return api.getList('/parent-contacts', opts)
}
/** 创建家长联系记录 */
export function createParentContact(payload) {
  return api.post('/parent-contacts', payload)
}
/** 更新家长联系记录 */
export function updateParentContact(id, payload) {
  return api.patch('/parent-contacts/' + id, payload)
}
/** 删除家长联系记录 */
export function removeParentContact(id) {
  return api.del('/parent-contacts/' + id)
}
