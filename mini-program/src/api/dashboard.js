import api from '../common/request'
import { listClasses, listStudents } from './students'
import { listGrades } from './grades'

/** 全局搜索（学生/教师/班级） */
export function globalSearch(q) {
  return api.get('/school-admin/search?q=' + encodeURIComponent(q))
}

/** AI 对话 */
export function chatSync(payload) {
  return api.post('/ai/chat-sync', payload)
}

/** 通知未读数 */
export function getUnreadCount() {
  return api.get('/notifications/unread-count')
}

/** 学期列表 */
export function listSemesters() {
  return api.get('/semesters')
}

/** 班级列表 */
export function listDashboardClasses() {
  return listClasses()
}

/** 学生列表 */
export function listDashboardStudents() {
  return listStudents()
}

/** 笔记列表 */
export function listNotes() {
  return api.get('/notes')
}

/** 成绩列表 */
export function listDashboardGrades() {
  return listGrades()
}

/** 待办列表 */
export function listTodos() {
  return api.get('/todos')
}

/** 课表列表 */
export function listSchedules() {
  return api.get('/schedules')
}

/** 公告列表 */
export function listNotices() {
  return api.get('/notices')
}

/** 考勤列表 */
export function listAttendances() {
  return api.get('/attendances')
}

/** 作业列表 */
export function listHomework() {
  return api.get('/homework')
}

/** 校级公告 */
export function listSchoolNotices() {
  return api.get('/notices?scope=school')
}

/** 行为记录列表 */
export function listBehaviorRecords() {
  return api.get('/behavior-records')
}

/** 创建待办 */
export function createTodo(payload) {
  return api.post('/todos', payload)
}

/** 更新待办 */
export function updateTodo(id, payload) {
  return api.patch('/todos/' + id, payload)
}

/** 删除待办 */
export function deleteTodo(id) {
  return api.del('/todos/' + id)
}
