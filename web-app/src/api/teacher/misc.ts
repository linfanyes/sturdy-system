import request from '../request'

/* ============ 通用列表辅助（Dashboard 等） ============ */

/** 考勤列表 */
export function listAttendances(classId?: string) {
  return request.get<any, any[]>('/attendances', { params: classId ? { classId } : {} })
}
/** 待办列表 */
export function listTodos(params?: Record<string, any>) {
  return request.get<any, any[]>('/todos', { params: params || {} })
}
/** 笔记列表 */
export function listNotes(params?: Record<string, any>) {
  return request.get<any, any[]>('/notes', { params: params || {} })
}
/** 公告列表 */
export function listNotices(params?: Record<string, any>) {
  return request.get<any, any[]>('/notices', { params: params || {} })
}
/** 创建公告 */
export function createNotice(payload: Record<string, any>) {
  return request.post<any, any>('/notices', payload)
}
/** 更新公告（含置顶/结束等） */
export function updateNotice(id: string, payload: Record<string, any>) {
  return request.patch<any, any>('/notices/' + id, payload)
}
/** 删除公告 */
export function deleteNotice(id: string) {
  return request.delete<any, void>('/notices/' + id)
}
/** 备份列表（数据管理） */
export function listBackups(params?: Record<string, any>) {
  return request.get<any, any>('/backups', { params: params || {} })
}
/** 创建备份 */
export function createBackup(label: string) {
  return request.post<any, any>('/backups', { label })
}
/** 获取备份详情（下载） */
export function getBackup(id: string) {
  return request.get<any, any>('/backups/' + id)
}
/** 作业列表 */
export function listHomework(params?: Record<string, any>) {
  return request.get<any, any[]>('/homework', { params: params || {} })
}

/* ============ 教师批量导入学生 ============ */

/** 预览解析文件：POST /students/import（返回 { rows, validCount, errorCount }） */
export function previewTeacherStudentsImport(payload: { filename: string; data: string }) {
  return request.post('/students/import', payload)
}
/** AI 识别学生名单：POST /students/import-ai（mode=image 走 OCR，否则走文本提取） */
export function aiTeacherStudentsImport(payload: { mode: string; data: string; filename?: string }) {
  return request.post('/students/import-ai', payload)
}
/** 提交落库：POST /students/import-commit（仅班主任可导入本班学生） */
export function commitTeacherStudentsImport(payload: { classId: string; items: any[] }) {
  return request.post('/students/import-commit', payload)
}

/** 已登录教师自助修改密码（校验原密码） */
export function changeMyPassword(oldPassword: string, newPassword: string) {
  return request.post<any, { ok: boolean }>('/auth/change-password', { oldPassword, newPassword })
}
