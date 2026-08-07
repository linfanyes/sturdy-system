import api from '../common/request'

/** 座位布局列表（按班级） */
export function listSeatLayouts(classId, opts = {}) {
  return api.getList('/seat-layouts', { ...opts, classId })
}
/** 学生列表（按班级，用于座位图） */
export function listSeatStudents(classId, opts = {}) {
  return api.getList('/students', { ...opts, classId })
}
/** 考试列表（按班级，用于座位图） */
export function listSeatExams(classId, opts = {}) {
  return api.getList('/exams', { ...opts, classId })
}
/** 创建座位布局 */
export function createSeatLayout(payload) {
  return api.post('/seat-layouts', payload)
}
/** 激活座位布局 */
export function activateSeatLayout(id) {
  return api.post('/seat-layouts/' + id + '/activate', {})
}
/** 更新座位布局 */
export function updateSeatLayout(id, payload) {
  return api.patch('/seat-layouts/' + id, payload)
}
