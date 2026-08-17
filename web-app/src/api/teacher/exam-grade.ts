import request from '../request'
import type { GradeImportRow } from './types'

/* ============ 成绩分析 API ============ */

/** 某次考试统计（按班级+考试） */
export function getExamAnalysis(classId: string, examId: string, fullScoreMap?: Record<string, number>) {
  const params: Record<string, any> = { classId, examId }
  if (fullScoreMap) params.fullScoreMap = JSON.stringify(fullScoreMap)
  return request.get<any, any>('/grades/analysis/exam', { params })
}

/** 班级内排名 */
export function getClassRank(classId: string, examId: string, subject?: string) {
  const params: Record<string, any> = { classId, examId }
  if (subject) params.subject = subject
  return request.get<any, { ranks: any[] }>('/grades/analysis/rank', { params })
}

/** 历次考试趋势 */
export function getExamTrend(classId: string, subject?: string) {
  const params: Record<string, any> = { classId }
  if (subject) params.subject = subject
  return request.get<any, any>('/grades/analysis/trend', { params })
}

/** 某学生历史成绩 */
export function getStudentHistory(studentId: string) {
  return request.get<any, any>(`/grades/analysis/student/${studentId}`)
}

/** 薄弱学生预警 */
export function getWeakStudents(classId: string, examId?: string) {
  const params: Record<string, any> = { classId }
  if (examId) params.examId = examId
  return request.get<any, any>('/grades/analysis/weak', { params })
}

/* ============ 成绩 CRUD API ============ */

/** 考试列表 */
export function listExams(params?: Record<string, any>) {
  return request.get<any, any>('/exams', { params })
}

/** 创建考试 */
export function createExam(data: Record<string, any>) {
  return request.post<any, any>('/exams', data)
}

/** 更新考试 */
export function updateExam(id: string, data: Record<string, any>) {
  return request.patch<any, any>('/exams/' + id, data)
}

/** 删除考试 */
export function deleteExam(id: string) {
  return request.delete<any, void>('/exams/' + id)
}

/** 单个考试详情 */
export function getExam(id: string) {
  return request.get<any, any>('/exams/' + id)
}

/** 成绩列表（支持 classId / studentId / examId / subject 等过滤） */
export function listGrades(params?: Record<string, any>) {
  return request.get<any, any>('/grades', { params })
}

/** 导入预览 */
export function importGradesPreview(payload: { classId: string; filename: string; data: string }) {
  return request.post<any, any>('/grades/import-preview', payload)
}

/** 导入确认提交 */
export function importGradesCommit(payload: {
  classId: string
  examName: string
  examId: string
  subject: string
  date: string
  rows: GradeImportRow[]
}) {
  return request.post<any, any>('/grades/import-commit', payload)
}

/** AI 导入 */
export function importGradesAi(payload: {
  classId: string
  mode: 'image' | 'file'
  data: string
  filename: string
}) {
  return request.post<any, any>('/grades/import-ai', payload)
}

/** 删除单条成绩记录 */
export function removeGrade(id: string) {
  return request.delete<any, void>('/grades/' + id)
}

/** 班级积分排行榜 */
export function getLeaderboard(classId: string) {
  return request.get<any, { classId: string; total: number; items: Array<{ rank: number; studentId: string; name: string; total: number; count: number }> }>('/leaderboard', { params: { classId } })
}
