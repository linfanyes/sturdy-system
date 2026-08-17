import request from '../request'

/* ============ 家校沟通 ============ */

/** 通知模板 */
export function listNoticeTemplates() {
  return request.get<any, any[]>('/notice-templates')
}

/** IM 家长通讯录（按班级） */
export function listImParents(classId: string) {
  return request.get<any, any>('/im/parents', { params: { classId } })
}

/** 获取 IM UserSig（腾讯云 IM 签名） */
export function getImUserSig() {
  return request.post<any, any>('/im/user-sig', {})
}

/** 创建 IM 班级群 */
export function createImClassGroup(data: { classId: string; groupId: string }) {
  return request.post<any, any>('/im/class-group', data)
}

/* ============ 教师办公 ============ */

/** 教学日历 */
export function listTeachingCalendar(params?: Record<string, any>) {
  return request.get<any, any>('/teaching-calendar', { params })
}

/** 新建教学日历事件 */
export function createTeachingCalendar(data: Record<string, any>) {
  return request.post<any, any>('/teaching-calendar', data)
}

/** 更新教学日历事件 */
export function updateTeachingCalendar(id: string, data: Record<string, any>) {
  return request.patch<any, any>('/teaching-calendar/' + id, data)
}

/** 删除教学日历事件 */
export function deleteTeachingCalendar(id: string) {
  return request.delete<any, void>('/teaching-calendar/' + id)
}

/** 教师通讯录 */
export function listTeachers() {
  return request.get<any, any[]>('/teachers')
}

/** 教师详情（含任课班级等） */
export function getTeacherDetail(id: string, userId?: string) {
  return request.get<any, any>(`/teachers/${id}/detail`, { params: userId ? { userId } : {} })
}

/** 课表列表 */
export function listSchedules(params?: Record<string, any>) {
  return request.get<any, any>('/schedules', { params })
}

/** 我的课表（个人课表视图） */
export function listMySchedules() {
  return request.get<any, any>('/schedules/my')
}

/** 新建课表条目 */
export function createSchedule(data: Record<string, any>) {
  return request.post<any, any>('/schedules', data)
}

/** 删除课表条目 */
export function deleteSchedule(id: string) {
  return request.delete<any, void>('/schedules/' + id)
}

/** AI 识别课表（图片走 OCR、Excel/CSV 提取文本，返回结构化预览，不落库） */
export function importSchedulesAi(data: { classId: string; mode: string; data: string; filename?: string }) {
  return request.post<any, { items: any[]; errors: any[] }>('/schedules/import-ai', data)
}

/** 提交 AI 识别的课表（批量落库） */
export function importSchedulesCommit(data: { classId: string; items: any[] }) {
  return request.post<any, any>('/schedules/import-commit', data)
}
