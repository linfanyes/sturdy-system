import api from '../common/request'
import { listClasses } from './teaching'

/** 听课记录列表 */
export function listLessonObservations(opts = {}) {
  return api.getList('/lesson-observations', opts)
}
/** 创建听课记录 */
export function createLessonObservation(payload) {
  return api.post('/lesson-observations', payload)
}
/** 更新听课记录 */
export function updateLessonObservation(id, payload) {
  return api.patch('/lesson-observations/' + id, payload)
}
/** 删除听课记录 */
export function removeLessonObservation(id) {
  return api.del('/lesson-observations/' + id)
}
