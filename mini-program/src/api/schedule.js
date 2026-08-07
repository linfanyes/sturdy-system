import api from '../common/request'

/** 课程表列表（按班级筛选） */
export function listSchedules(classId, opts = {}) {
  return api.get('/schedules', { ...opts, classId })
}
/** 创建课程 */
export function createSchedule(payload) {
  return api.post('/schedules', payload)
}
/** 更新课程 */
export function updateSchedule(id, payload) {
  return api.patch('/schedules/' + id, payload)
}
/** 删除课程 */
export function removeSchedule(id) {
  return api.del('/schedules/' + id)
}
/** 批量删除课程 */
export function batchRemoveSchedules(ids) {
  return Promise.all(ids.map((id) => api.del('/schedules/' + id)))
}
/** AI 识别课表（图片→结构化预览） */
export function importSchedulesAi(payload) {
  return api.post('/schedules/import-ai', payload)
}
/** 提交 AI 识别的课表 */
export function importSchedulesCommit(payload) {
  return api.post('/schedules/import-commit', payload)
}
