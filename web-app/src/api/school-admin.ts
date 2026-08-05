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
  /** 职务列表（多选），兼容旧单值 position 字段 */
  positions?: string[]
  /** 任教学段/年级（如 一年级） */
  grade?: string
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
  position?: string
  positions?: string[]
  grade?: string
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

export function resetTeacherPassword(id: string, password?: string) {
  return request.post(`/school-admin/teachers/${id}/reset-password`, { password: password || '' })
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

export interface SubjectTeacherItem {
  teacherId: string
  subjects?: string[]
}

export function updateClass(id: string, dto: Partial<Omit<ClassItem, 'subjectTeachers'> & { headTeacherId: string; subjectTeachers?: SubjectTeacherItem[] }>) {
  return request.patch(`/school-admin/classes/${id}`, dto)
}

export function deleteClass(id: string) {
  return request.delete(`/school-admin/classes/${id}`)
}

/** 班级升级：三年级一班 → 四年级一班（年级+1，名称自动更新，学生和班主任保留） */
export function promoteClass(id: string, targetGrade?: string) {
  return request.post(`/school-admin/classes/${id}/promote`, { targetGrade })
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

/* ============ 学生管理 ============ */

/** 学生记录（对齐 server Student 实体 + className 附加字段） */
export interface StudentItem {
  id: string
  classId: string
  className?: string
  name: string
  gender: string
  studentNo: string
  birthDate?: string | null
  seatNo?: number
  parentName: string
  parentPhone: string
  parentLoginEnabled: boolean
  note?: string
  tags?: string[]
  createdAt: string
}

export function listSchoolStudents() {
  return request.get<any, { items: StudentItem[]; total: number }>('/school-admin/students')
}

export function updateStudent(id: string, dto: Partial<Pick<StudentItem, 'name' | 'gender' | 'parentName' | 'parentPhone'>>) {
  return request.patch(`/school-admin/students/${id}`, dto)
}

export function deleteStudent(id: string) {
  return request.delete(`/school-admin/students/${id}`)
}

/* ============ 家长登录 ============ */

export interface ParentLoginItem {
  studentId: string
  name: string
  studentNo: string
  classId: string
  parentName: string
  parentPhone: string
  parentLoginEnabled: boolean
}

export function listParentLogins() {
  return request.get<any, { items: ParentLoginItem[]; total: number }>('/school-admin/parent-logins')
}

/** 开通/关闭某学生的家长登录（后端翻转状态并初始化/清空密码），返回 { studentId, parentLoginEnabled, initialPassword? } */
export function toggleParentLogin(id: string) {
  return request.post<unknown, { studentId: string; parentLoginEnabled: boolean; initialPassword?: string }>(`/students/${id}/toggle-parent-login`)
}

/** 班主任重置某学生家长登录口令为学号后 6 位，返回 { studentId, ok, defaultPassword } */
export function resetParentPassword(id: string, password?: string) {
  return request.post<unknown, { studentId: string; ok: boolean; defaultPassword: string }>(`/students/${id}/reset-parent-password`, { password: password || '' })
}

/* ============ 全局搜索 ============ */

export interface SearchResult {
  students: Array<StudentItem & { className?: string }>
  teachers: Array<{ id: string; name: string; username: string; teacherNo: string; subject: string }>
  classes: ClassItem[]
}

export function search(q: string) {
  return request.get<any, SearchResult>('/school-admin/search', { params: { q } })
}

/* ============ 数据导出（返回 CSV 文本，触发浏览器下载） ============ */

export async function exportTeachersCsv(): Promise<void> {
  const blob = await request.get('/school-admin/export/teachers', { responseType: 'blob' })
  downloadCsv(blob as unknown as Blob, 'teachers.csv')
}

export async function exportStudentsCsv(): Promise<void> {
  const blob = await request.get('/school-admin/export/students', { responseType: 'blob' })
  downloadCsv(blob as unknown as Blob, 'students.csv')
}

/* ============ 批量导入：教师 ============ */

export function previewTeachersFile(payload: { filename: string; data: string }) {
  return request.post('/school-admin/teachers/import-preview', payload)
}
export function aiTeachersFile(payload: { filename: string; data: string }) {
  return request.post('/school-admin/teachers/import-ai', payload)
}
export function importTeachersFile(payload: { filename: string; data: string }) {
  return request.post('/school-admin/teachers/import', payload)
}

/* ============ 批量导入：学生 ============ */

export function previewStudentsFile(payload: { filename: string; data: string }) {
  return request.post('/school-admin/students/import-preview', payload)
}
export function aiStudentsFile(payload: { filename: string; data: string }) {
  return request.post('/school-admin/students/import-ai', payload)
}
export function importStudentsFile(payload: { classId: string; filename: string; data: string }) {
  return request.post('/school-admin/students/import', payload)
}
export function batchCreateStudents(
  students: Array<{ name: string; gender?: string; studentNo?: string; parentName?: string; parentPhone?: string; classId: string }>,
) {
  return request.post('/school-admin/students/batch', { students })
}

/* ============ 批量导入：班级 ============ */

export function previewClassesFile(payload: { filename: string; data: string }) {
  return request.post('/school-admin/classes/import-preview', payload)
}
export function aiClassesFile(payload: { filename: string; data: string }) {
  return request.post('/school-admin/classes/import-ai', payload)
}
export function importClassesFile(payload: { filename: string; data: string }) {
  return request.post('/school-admin/classes/import', payload)
}
export function batchCreateClasses(
  classes: Array<{ name: string; grade: string; classNo?: string; headTeacher: string; term?: string }>,
) {
  return request.post('/school-admin/classes/batch', { classes })
}

/* ============ xlsx 二进制导出 ============ */

export async function exportTeachersXls(): Promise<void> {
  const blob = await request.get('/school-admin/export/teachers-xls', { responseType: 'blob' })
  downloadBlob(blob as unknown as Blob, 'teachers.xlsx')
}
export async function exportStudentsXls(): Promise<void> {
  const blob = await request.get('/school-admin/export/students-xls', { responseType: 'blob' })
  downloadBlob(blob as unknown as Blob, 'students.xlsx')
}
export async function exportClassesXls(): Promise<void> {
  const blob = await request.get('/school-admin/export/classes-xls', { responseType: 'blob' })
  downloadBlob(blob as unknown as Blob, 'classes.xlsx')
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

function downloadCsv(blob: Blob, filename: string) {
  downloadBlob(blob, filename)
}
