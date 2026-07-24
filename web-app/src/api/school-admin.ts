import request from './request'

/** 校管仪表盘统计 */
export interface SchoolAdminDashboard {
  teacherCount: number
  classCount: number
  studentCount: number
  parentLoginCount: number
  [k: string]: any
}

/** 教师记录 */
export interface TeacherItem {
  id: string
  name: string
  username: string
  teacherNo: string
  phone: string
  gender: string
  subject: string
  schoolId: string
  enabled: boolean
  features: string[]
  createdAt: string
}

/** 班级记录（对齐 server ClassItem 实体） */
export interface ClassItem {
  id: string
  teacherId: string
  name: string
  grade: string
  classNo: string
  slogan?: string
  headTeacher: string
  teachers?: string[]
  color?: string
  term: string
  semesterId?: string
  subjects?: string[]
  subjectTeachers?: Record<string, string>
  imGroupId?: string
  createdAt: string
}

/** 仪表盘 */
export function getDashboard() {
  return request.get<any, SchoolAdminDashboard>('/school-admin/dashboard')
}

/* ============ 教师 CRUD ============ */

export function listTeachers(skip = 0, take = 100) {
  return request.get<any, { items: TeacherItem[]; total: number }>('/school-admin/teachers', { params: { skip, take } })
}

export function createTeacher(dto: {
  name: string
  phone?: string
  gender?: string
  subject?: string
  username?: string
  password?: string
}) {
  return request.post('/school-admin/teachers', dto)
}

export function batchCreateTeachers(teachers: Array<{ name: string; phone?: string; gender?: string; subject?: string; password?: string }>) {
  return request.post('/school-admin/teachers/batch', { teachers })
}

export function updateTeacher(id: string, dto: Partial<TeacherItem>) {
  return request.patch(`/school-admin/teachers/${id}`, dto)
}

export function updateTeacherFeatures(id: string, features: string[]) {
  return request.patch(`/school-admin/teachers/${id}/features`, { features })
}

export function resetTeacherPassword(id: string) {
  return request.post(`/school-admin/teachers/${id}/reset-password`)
}

export function deleteTeacher(id: string) {
  return request.delete(`/school-admin/teachers/${id}`)
}

/* ============ 班级 CRUD ============ */

export function listClasses(skip = 0, take = 100) {
  return request.get<any, { items: ClassItem[]; total: number }>('/school-admin/classes', { params: { skip, take } })
}

export function createClass(dto: {
  name: string
  grade: string
  classNo?: string
  headTeacher: string
  headTeacherId: string
  term?: string
  subjects?: string[]
  subjectTeachers?: Array<{ teacherId: string; subjects?: string[] }>
}) {
  return request.post('/school-admin/classes', dto)
}

export function updateClass(id: string, dto: Partial<Pick<ClassItem, 'name' | 'grade' | 'classNo' | 'headTeacher' | 'term'> & { headTeacherId: string }>) {
  return request.patch(`/school-admin/classes/${id}`, dto)
}

export function deleteClass(id: string) {
  return request.delete(`/school-admin/classes/${id}`)
}

/* ============ 学校公告 ============ */

export function listSchoolNotices(skip = 0, take = 50) {
  return request.get<any, { items: any[]; total: number }>('/school-admin/notices', { params: { skip, take } })
}

export function createSchoolNotice(dto: { title: string; content: string; pinned?: boolean }) {
  return request.post('/school-admin/notices', dto)
}

export function deleteSchoolNotice(id: string) {
  return request.delete(`/school-admin/notices/${id}`)
}
