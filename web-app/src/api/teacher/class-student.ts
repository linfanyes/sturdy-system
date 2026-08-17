import request from '../request'
import type { TeacherClass, TeacherStudent, ClassMember, ParentFeatureOption } from './types'

/* ============ 班级与学生 ============ */

/** 获取当前教师的班级列表（支持 term 等筛选） */
export function listMyClasses(params?: { term?: string }) {
  return request.get<any, TeacherClass[]>('/classes', { params: params || {} })
}

/** 获取某班级的学生列表 */
export function listClassStudents(classId: string) {
  return request.get<any, TeacherStudent[]>('/students', { params: { classId } })
}

/** 获取当前教师所有学生（不传 classId 返回全部） */
export function listAllStudents(params?: { classId?: string; skip?: number; take?: number; term?: string }) {
  return request.get<any, any>('/students', { params: params || {} })
}

/** 新增学生（单个录入） */
export function createStudent(data: {
  name: string
  gender: string
  studentNo?: string
  parentName?: string
  parentPhone?: string
  studentPhone?: string
  address?: string
  classId: string
}) {
  return request.post<any, TeacherStudent>('/students', data)
}

/** 更新学生信息 */
export function updateStudent(id: string, data: Partial<{
  name: string
  gender: string
  studentNo: string
  parentName: string
  parentPhone: string
  studentPhone: string
  address: string
  classId: string
}>) {
  return request.patch<any, TeacherStudent>('/students/' + id, data)
}

/** 获取单个学生详情（含 examComments 等扩展字段） */
export function getStudent(id: string) {
  return request.get<any, TeacherStudent & { examComments?: Record<string, any> }>('/students/' + id)
}

/** 删除学生 */
export function deleteStudent(id: string) {
  return request.delete<any, void>('/students/' + id)
}

/** 学生信息变更申请列表 */
export function listStudentInfoUpdates(params?: Record<string, any>) {
  return request.get<any, any>('/student-info-updates', { params })
}

/** 审批学生信息变更（approve / reject） */
export function reviewStudentInfoUpdate(id: string, payload: { action: 'approve' | 'reject'; note?: string }) {
  return request.post<any, any>(`/student-info-updates/${id}/review`, payload)
}

/** 开通/关闭家长登录 */
export function toggleStudentParentLogin(id: string) {
  return request.post<any, { studentId: string; parentLoginEnabled: boolean; initialPassword?: string }>('/students/' + id + '/toggle-parent-login')
}

/** 重置家长登录口令 */
export function resetStudentParentPassword(id: string, password?: string) {
  return request.post<any, { studentId: string; ok: boolean; defaultPassword: string }>('/students/' + id + '/reset-parent-password', { password: password || '' })
}

/** 获取班级成员（协作教师） */
export function listClassMembers(classId: string) {
  return request.post<any, ClassMember[]>('/classes/' + classId + '/members/list')
}

/** 获取班级家长功能包配置 */
export function getClassParentFeatures(classId: string) {
  return request.get<any, {
    configured: boolean
    features: string[] | null
    options: ParentFeatureOption[]
  }>('/classes/' + classId + '/parent-features')
}

/** 更新班级家长功能包（班主任；features=null 恢复跟随默认） */
export function updateClassParentFeatures(classId: string, features: string[] | null) {
  return request.patch<any, { ok: boolean; features: string[] | null }>('/classes/' + classId + '/parent-features', { features })
}

/** 更新班级课程设置（班主任权限：科目 + 科任老师映射） */
export function updateClassSubjects(classId: string, data: { subjects?: string[]; subjectTeachers?: Record<string, string> }) {
  return request.patch<any, any>('/classes/' + classId, data)
}
