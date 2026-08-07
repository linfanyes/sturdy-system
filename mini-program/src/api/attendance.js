import api from '../common/request'

/** 考勤记录列表 */
export function listAttendances(opts = {}) {
  return api.get('/attendances', opts)
}
/** 创建考勤记录 */
export function createAttendance(payload) {
  return api.post('/attendances', payload)
}
/** 更新考勤记录 */
export function updateAttendance(id, payload) {
  return api.patch('/attendances/' + id, payload)
}
