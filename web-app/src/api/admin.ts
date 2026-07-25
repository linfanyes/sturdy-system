import request from './request'

/** 超管：学校列表 */
export function listSchools(skip = 0, take = 100) {
  return request.get<any, { items: any[]; total: number }>('/admin/schools', { params: { skip, take } })
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

/** 超管：校管列表 */
export function listSchoolAdmins(skip = 0, take = 100) {
  return request.get<any, { items: any[]; total: number }>('/admin/school-admins', { params: { skip, take } })
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

/** 超管：审计日志 */
export function listAuditLogs(skip = 0, take = 50, schoolId?: string) {
  return request.get<any, { items: any[]; total: number }>('/admin/audit-logs', { params: { skip, take, schoolId } })
}
