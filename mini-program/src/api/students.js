import api from '../common/request'
import { listGrades, getGrades } from './grades'

/** 学生列表（按班级筛选） */
export function listStudents(classId, opts = {}) {
  const params = { ...opts }
  if (classId) params.classId = classId
  return api.getList('/students', params)
}

/** 班级列表 */
export function listClasses(opts = {}) {
  return api.getList('/classes', opts)
}

/** 创建学生 */
export function createStudent(payload) {
  return api.post('/students', payload)
}

/** 更新学生 */
export function updateStudent(id, payload) {
  return api.patch('/students/' + id, payload)
}

/** 删除学生 */
export function removeStudent(id) {
  return api.del('/students/' + id)
}

/** 批量删除学生 */
export function batchRemoveStudents(ids) {
  return Promise.all(ids.map((id) => api.del('/students/' + id)))
}

/** 切换家长登录权限 */
export function toggleParentLogin(id) {
  return api.post('/students/' + id + '/toggle-parent-login')
}

/** 重置家长密码 */
export function resetParentPassword(id, payload) {
  return api.post('/students/' + id + '/reset-parent-password', payload)
}

/** 导入学生预览 */
export function importStudents(payload) {
  return api.post('/students/import', payload)
}

/** AI 识图导入预览 */
export function importStudentsAi(payload) {
  return api.post('/students/import-ai', payload)
}

/** 导入确认 */
export function importStudentsCommit(payload) {
  return api.post('/students/import-commit', payload)
}

/** 生成评语（AI chat-sync） */
export function generateComment(payload) {
  return api.post('/ai/chat-sync', payload)
}

/** 学生档案：成绩 */
export function getStudentGrades() {
  return getGrades()
}

/** 学生档案：考勤 */
export function getStudentAttendances() {
  return api.get('/attendances').catch(() => [])
}

/** 学生档案：行为记录 */
export function getStudentBehaviorRecords() {
  return api.get('/behavior-records').catch(() => [])
}
