import request from '../request'
import type { GradeImportRow } from './types'

/* ============ 成绩分析 API ============ */

/** 考试信息 */
export interface Exam {
  id: string
  name: string
  classId: string
  term?: string
  subjects?: string[]
  date?: string
  note?: string
  createdAt?: string
  updatedAt?: string
}

/** 成绩记录 */
export interface GradeScore {
  id: string
  examId: string
  studentId: string
  subject: string
  score: number | null
  classId?: string
  createdAt?: string
  updatedAt?: string
}

/** 考试统计结果 */
export interface ExamAnalysis {
  classId: string
  examId: string
  totalStudents?: number
  avgScore?: number
  maxScore?: number
  minScore?: number
  passRate?: number
  subjects?: Array<{
    subject: string
    avgScore: number
    maxScore: number
    minScore: number
    passRate: number
  }>
}

/** 班级内排名项 */
export interface RankItem {
  rank: number
  studentId: string
  name: string
  total?: number
  score?: number
  subject?: string
}

/** 历次考试趋势项 */
export interface TrendItem {
  examId: string
  examName: string
  date?: string
  avgScore?: number
  classId?: string
  subject?: string
}

/** 学生历史成绩项 */
export interface StudentHistoryItem {
  examId: string
  examName: string
  subject: string
  score: number | null
  date?: string
  classId?: string
}

/** 薄弱学生预警项 */
export interface WeakStudentItem {
  studentId: string
  name: string
  classId: string
  avgScore?: number
  failCount?: number
  subjects?: string[]
}

/** 导入预览结果 */
export interface ImportPreviewResult {
  total: number
  valid: number
  invalid: number
  rows: GradeImportRow[]
}

/** 导入提交结果 */
export interface ImportCommitResult {
  inserted: number
  updated: number
  failed: number
}

/** AI 导入结果 */
export interface ImportAiResult {
  success: boolean
  message?: string
  rows?: GradeImportRow[]
}

/** 某次考试统计（按班级+考试） */
export function getExamAnalysis(classId: string, examId: string, fullScoreMap?: Record<string, number>) {
  const params: Record<string, any> = { classId, examId }
  if (fullScoreMap) params.fullScoreMap = JSON.stringify(fullScoreMap)
  return request.get<ExamAnalysis>('/grades/analysis/exam', { params })
}

/** 班级内排名 */
export function getClassRank(classId: string, examId: string, subject?: string) {
  const params: Record<string, any> = { classId, examId }
  if (subject) params.subject = subject
  return request.get<{ ranks: RankItem[] }>('/grades/analysis/rank', { params })
}

/** 历次考试趋势 */
export function getExamTrend(classId: string, subject?: string) {
  const params: Record<string, any> = { classId }
  if (subject) params.subject = subject
  return request.get<TrendItem[]>('/grades/analysis/trend', { params })
}

/** 某学生历史成绩 */
export function getStudentHistory(studentId: string) {
  return request.get<StudentHistoryItem[]>(`/grades/analysis/student/${studentId}`)
}

/** 薄弱学生预警 */
export function getWeakStudents(classId: string, examId?: string) {
  const params: Record<string, any> = { classId }
  if (examId) params.examId = examId
  return request.get<WeakStudentItem[]>('/grades/analysis/weak', { params })
}

/* ============ 成绩 CRUD API ============ */

/** 考试列表 */
export function listExams(params?: Record<string, any>) {
  return request.get<Exam[]>('/exams', { params })
}

/** 创建考试 */
export function createExam(data: Partial<Exam>) {
  return request.post<Exam>('/exams', data)
}

/** 更新考试 */
export function updateExam(id: string, data: Partial<Exam>) {
  return request.patch<Exam>('/exams/' + id, data)
}

/** 删除考试 */
export function deleteExam(id: string) {
  return request.delete<void>('/exams/' + id)
}

/** 单个考试详情 */
export function getExam(id: string) {
  return request.get<Exam>('/exams/' + id)
}

/** 成绩列表（支持 classId / studentId / examId / subject 等过滤） */
export function listGrades(params?: Record<string, any>) {
  return request.get<GradeScore[]>('/grades', { params })
}

/** 导入预览 */
export function importGradesPreview(payload: { classId: string; filename: string; data: string }) {
  return request.post<ImportPreviewResult>('/grades/import-preview', payload)
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
  return request.post<ImportCommitResult>('/grades/import-commit', payload)
}

/** AI 导入 */
export function importGradesAi(payload: {
  classId: string
  mode: 'image' | 'file'
  data: string
  filename: string
}) {
  return request.post<ImportAiResult>('/grades/import-ai', payload)
}

/** 删除单条成绩记录 */
export function removeGrade(id: string) {
  return request.delete<void>('/grades/' + id)
}

/** 班级积分排行榜 */
export function getLeaderboard(classId: string) {
  return request.get<{ classId: string; total: number; items: Array<{ rank: number; studentId: string; name: string; total: number; count: number }> }>('/leaderboard', { params: { classId } })
}
