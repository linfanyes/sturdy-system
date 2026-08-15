import api from '../common/request'
import { listClasses } from './teaching'

/** 教师列表 */
export function listTeachers(opts = {}) {
  return api.getList('/teachers', opts)
}
/** 创建教师 */
export function createTeacher(payload) {
  return api.post('/teachers', payload)
}
/** 更新教师 */
export function updateTeacher(id, payload) {
  return api.patch('/teachers/' + id, payload)
}
/** 删除教师 */
export function removeTeacher(id) {
  return api.del('/teachers/' + id)
}
/** 教师详情（聚合账号+通讯录+任课班级） */
export function getTeacherDetail(id, opts = {}) {
  return api.get('/teachers/' + id + '/detail', opts)
}
/** 本人任教的全部课程（跨班级），用于排课跨班撞课检测 */
export function listMySchedules(opts = {}) {
  return api.get('/schedules/my', opts)
}
