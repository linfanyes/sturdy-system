import request from './request'

/** 家长端：考试成绩 */
export interface ParentExam {
  examId: string
  examName: string
  date: string
  term?: string
  subjects: Array<{
    subject: string
    score: number | null
    fullScore: number
    classRank?: number | null
  }>
  totalScore: number | null
  totalFullScore: number | null
  classRank: number | null
  distribution: Array<{ label: string; count: number; pct: number; isStudent: boolean }>
  analysisNote?: string | null
}

/** 家长端：公告 */
export interface ParentNotice {
  id: string
  title: string
  content?: string
  classId: string
  pinned?: boolean
  ended?: boolean
  createdAt: string
}

/** 家长端：作业 */
export interface ParentHomework {
  id: string
  subject: string
  title: string
  content?: string
  startDate?: string
  deadline?: string
  status?: string
}

/** 当前家长信息 */
export function getParentMe() {
  return request.get<any, ParentMe>('/parent-auth/me')
}

export function getParentNotices() {
  return request.get<any, ParentNotice[]>('/parent-auth/notices')
}

export function getParentExams() {
  return request.get<any, { exams: ParentExam[] }>('/parent-auth/exams')
}

export function getParentHomework() {
  return request.get<any, ParentHomework[]>('/parent-auth/homework')
}

/** 家长端：孩子打卡/考勤汇总 */
export interface ParentAttendance {
  total: number
  summary: { reading: number; sport: number; behavior: number; homework: number }
  recent: Array<{ id: string; type: string; date: string; count: number; note: string | null }>
  byMonth: Array<{ month: string; count: number }>
}

export function getParentAttendance() {
  return request.get<any, ParentAttendance>('/parent-auth/attendance')
}

/** 家长端：修改登录密码（需已登录，校验原密码） */
export function changeParentPassword(oldPassword: string, newPassword: string) {
  return request.post<any, { ok: boolean }>('/parent-auth/change-password', { oldPassword, newPassword })
}

/** 家长基础信息（含多娃） */
export interface ParentMe {
  parentName: string
  studentId: string
  studentName: string
  studentNo: string
  classId: string
  className: string
  parentId?: string
  kids: Array<{
    studentId: string
    studentName: string
    studentNo: string
    classId: string
    className: string
    nickName: string
  }>
  /** 学生档案信息（家长可查看/申请修改） */
  studentInfo?: ParentStudentInfo
}

/** 学生档案信息 */
export interface ParentStudentInfo {
  name?: string
  gender?: string
  birthDate?: string
  parentName?: string
  parentPhone?: string
  studentPhone?: string
  address?: string
  note?: string
}

/** 学生信息修改申请 */
export interface StudentUpdateRequest {
  id: string
  studentName: string
  payload: Record<string, any>
  status: 'pending' | 'approved' | 'rejected'
  reviewNote?: string | null
  reviewedAt?: string | null
  createdAt: string
}

/** 切换孩子 */
export async function switchStudent(studentId: string): Promise<{ token: string; studentId: string; studentName: string; studentNo: string; classId: string }> {
  const r = await request.post('/parent-auth/switch-student', { studentId })
  return r.data
}

/** 跨娃成绩比对 */
export async function getKidsComparison(): Promise<any> {
  const r = await request.get('/parent-auth/compare-kids')
  return r.data
}

/** 家长端：孩子行为表现记录（按 studentId 隔离） */
export interface ParentBehavior {
  total: number
  summary: { praise: number; violation: number; other: number }
  recent: Array<{ id: string; date: string; behavior: string; note: string | null; category: 'praise' | 'violation' | 'other' }>
  byMonth: Array<{ month: string; count: number }>
}

export function getParentBehavior() {
  return request.get<any, ParentBehavior>('/parent-auth/behavior')
}

/** 家长端：孩子课表&值日（按 classId 隔离） */
export interface ParentScheduleItem {
  period: number
  section: string | null
  subject: string
  teacher: string
  note: string | null
}
export interface ParentSchedule {
  week: Array<{ dayOfWeek: number; items: ParentScheduleItem[] }>
  todayDow: number
  upcomingDuty: Array<{ date: string; name: string; type: string }>
}

export function getParentSchedule() {
  return request.get<any, ParentSchedule>('/parent-auth/schedule')
}

/** 家长端：家校沟通记录（按 studentId 隔离） */
export interface ParentCommunication {
  id: string
  date: string
  method: string
  content: string | null
  followUp: string | null
  parentName: string
  relation: string
}

export interface ParentCommunications {
  total: number
  recent: ParentCommunication[]
}

export function getParentCommunications() {
  return request.get<any, ParentCommunications>('/parent-auth/communications')
}

/** 家长端：提交学生信息修改申请（需老师审核） */
export function submitStudentUpdateRequest(payload: Record<string, any>) {
  return request.post<any, { ok: boolean }>('/parent-auth/student-update-request', { payload })
}

/** 家长端：查看自己提交的学生信息修改申请列表及审核状态 */
export function listStudentUpdateRequests() {
  return request.get<any, StudentUpdateRequest[]>('/parent-auth/student-update-requests')
}
