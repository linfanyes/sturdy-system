import request from './request'

/* ============ DTO 类型定义 ============ */

/** 超管：学校列表项 */
export interface SchoolItem {
  id: string
  name: string
  code: string
  prefix: string
  status: 'enabled' | 'disabled'
  address?: string
  teacherCount?: number
  studentCount?: number
  classCount?: number
  createdAt: string
}

/** 超管：校管列表项 */
export interface SchoolAdminItem {
  id: string
  schoolId: string
  name: string
  username: string
  enabled: boolean
  createdAt: string
}

/** 超管：审计日志项 */
export interface AuditLogItem {
  id: string
  action: string
  operatorId: string
  operatorName?: string
  target?: string
  detail?: string
  schoolId?: string
  createdAt: string
}

/** 超管：AI 供应商 */
export interface AiProviderItem {
  code: string
  name: string
  baseUrl?: string
  textModel?: string
  visionModel?: string
  enabled: boolean
  createdAt: string
}

/** 超管：平台配置项 */
export interface PlatformConfigItem {
  key: string
  value: string
  description?: string
  updatedAt: string
}

/* ============ 超管：学校 CRUD ============ */

/** 超管：学校列表 */
export function listSchools(skip = 0, take = 100) {
  return request.get<any, { items: SchoolItem[]; total: number }>('/admin/schools', { params: { skip, take } })
}

/** 超管：创建学校（编号 = 2 位前缀 + 随机 + 平台后缀 H/W，共 8 位） */
export function createSchool(dto: { name: string; prefix: string; platform?: 'web' | 'mini'; address?: string; status?: string }) {
  return request.post('/admin/schools', dto)
}

/** 超管：更新学校 */
export function updateSchool(id: string, dto: any) {
  return request.patch(`/admin/schools/${id}`, dto)
}

/** 超管：删除学校 */
export function deleteSchool(id: string) {
  return request.delete(`/admin/schools/${id}`)
}

/** 超管：批量启用/禁用学校 */
export function batchToggleSchool(ids: string[], enabled: boolean) {
  return request.post('/admin/schools/batch-toggle', { ids, enabled })
}

/** 超管：校管列表 */
export function listSchoolAdmins(skip = 0, take = 100) {
  return request.get<any, { items: SchoolAdminItem[]; total: number }>('/admin/school-admins', { params: { skip, take } })
}

/** 超管：创建校管 */
export function createSchoolAdmin(dto: { schoolId: string; username: string; password: string; name: string }) {
  return request.post('/admin/school-admins', dto)
}

/** 超管：更新校管 */
export function updateSchoolAdmin(id: string, dto: any) {
  return request.patch(`/admin/school-admins/${id}`, dto)
}

/** 超管：重置校管密码 */
export function resetSchoolAdminPassword(id: string, password: string) {
  return request.patch(`/admin/school-admins/${id}/password`, { password })
}

/** 超管：启用/停用校管 */
export function toggleSchoolAdminEnabled(id: string, enabled: boolean) {
  return request.patch(`/admin/school-admins/${id}/enabled`, { enabled })
}

/** 超管：删除校管 */
export function deleteSchoolAdmin(id: string) {
  return request.delete(`/admin/school-admins/${id}`)
}

/** 超管：批量启用/禁用校管 */
export function batchToggleAdmin(ids: string[], enabled: boolean) {
  return request.post('/admin/school-admins/batch-toggle', { ids, enabled })
}

/** 超管：审计日志 */
export function listAuditLogs(skip = 0, take = 50, schoolId?: string) {
  return request.get<any, { items: AuditLogItem[]; total: number }>('/admin/audit-logs', { params: { skip, take, schoolId } })
}

/** 超管：一键重置（需 confirm: true） */
export function resetAll(confirm = true) {
  return request.post('/admin/reset-all', { confirm })
}

/** 超管：获取所有教师列表 */
export function listTeachers(skip = 0, take = 500) {
  return request.get<any, { items: any[]; total: number }>('/admin/teachers', { params: { skip, take } })
}

/** 超管：获取所有班级列表（可按 schoolId 过滤） */
export function listClasses(schoolId?: string, skip = 0, take = 500) {
  return request.get<any, { items: any[]; total: number }>('/admin/classes', { params: { schoolId, skip, take } })
}

/** 超管：获取所有学生列表（可按 schoolId/classId 过滤） */
export function listStudents(schoolId?: string, classId?: string, skip = 0, take = 500) {
  return request.get<any, { items: any[]; total: number }>('/admin/students', { params: { schoolId, classId, skip, take } })
}

/** 超管：清除单个教师业务数据 */
export function clearTeacherData(teacherId: string) {
  return request.post(`/admin/teachers/${teacherId}/clear-data`)
}

/* ============ 超管：AI 供应商与平台配置 ============ */

/** 超管：创建 AI 供应商 */
export function createAiProvider(body: Record<string, any>) {
  return request.post<any, any>('/ai-providers', body)
}

/** 超管：更新 AI 供应商 */
export function updateAiProvider(code: string, body: Record<string, any>) {
  return request.patch<any, any>(`/ai-providers/${code}`, body)
}

/** 超管：删除 AI 供应商 */
export function deleteAiProvider(code: string) {
  return request.delete<any, void>(`/ai-providers/${code}`)
}

/** 超管：平台配置（key-value items） */
export function getPlatformConfig() {
  return request.get<any, { items: PlatformConfigItem[] }>('/config/app')
}

/** 超管：保存平台配置 */
export function updatePlatformConfig(data: { items: PlatformConfigItem[] }) {
  return request.put<any, void>('/config/app', data)
}

/* ============ 超管只读：考试 / 成绩审计（P4）============ */

/** 超管：全校考试审计列表 */
export function listAuditExams(params: { schoolId?: string; classId?: string; skip?: number; take?: number } = {}) {
  return request.get('/admin/audit-exams', { params })
}

/** 超管：全校成绩审计列表 */
export function listAuditGrades(params: { schoolId?: string; classId?: string; subject?: string; examName?: string; skip?: number; take?: number } = {}) {
  return request.get('/admin/audit-grades', { params })
}

/** 超管：成绩审计汇总（按学科聚合） */
export function getAuditGradeSummary(params: { schoolId?: string; classId?: string } = {}) {
  return request.get('/admin/audit-grade-summary', { params })
}
