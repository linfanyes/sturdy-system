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
  return request.get<any, {
    imUserId: string
    studentId: string
    studentName: string
    classId: string
    className: string
    studentNo: string
    nickName: string
  }>('/parent-auth/me')
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
