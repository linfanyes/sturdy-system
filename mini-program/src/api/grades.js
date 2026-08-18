import api from '../common/request'

/** 当前班级/筛选条件下的成绩列表 */
export function listGrades(opts = {}) {
  return api.getList('/grades', opts)
}

/** 单条成绩详情（用于合并/删除前的查询） */
export function getGrades(params = {}) {
  return api.get('/grades', params)
}

/** 保存单条成绩（幂等合并：重复保存=更新） */
export function mergeGrades(payload) {
  return api.post('/grades/merge', payload)
}
export function importGradesPreview(payload) {
  return api.post('/grades/import-preview', payload)
}

/** 批量导入确认 */
export function importGradesCommit(payload) {
  return api.post('/grades/import-commit', payload)
}

/** 删除成绩 */
export function removeGrade(id) {
  return api.del('/grades/' + id)
}

/** 批量删除成绩 */
export function batchRemoveGrades(ids) {
  return api.del('/grades/batch/ids', { ids })
}

/** 恢复已删除成绩 */
export function restoreGrade(id) {
  return api.patch('/grades/' + id + '/restore')
}

/** 查看已删除成绩（回收站） */
export function listDeletedGrades(opts = {}) {
  return api.getList('/grades/trash/deleted', opts)
}

/** 班级列表（用于筛选） */
export function listClasses(opts = {}) {
  return api.getList('/classes', opts)
}

/** 考试列表（用于筛选） */
export function listExams(opts = {}) {
  return api.getList('/exams', opts)
}

/** 学生列表（按班级） */
export function listStudents(classId, opts = {}) {
  const params = { ...opts }
  if (classId) params.classId = classId
  return api.getList('/students', params)
}

/** 公共配置 */
export function getPublicConfig() {
  return api.get('/config/public')
}

/** 学期列表 */
export function listSemesters() {
  return api.get('/semesters').catch(() => [])
}

/** AI 考试分析 */
export function analyzeExam(examId) {
  return api.post('/ai/analyze-exam', { examId })
}

/** AI 学生诊断 */
export function diagnoseStudent(studentId) {
  return api.post('/ai/diagnose', { studentId })
}

/** 某次考试统计（按班级+考试） */
export function getGradesAnalysisExam(classId, examId, fullScoreMap) {
  const params = { classId, examId }
  if (fullScoreMap) params.fullScoreMap = JSON.stringify(fullScoreMap)
  return api.get('/grades/analysis/exam', params)
}

/** 班级内排名 */
export function getGradesAnalysisRank(classId, examId, subject) {
  const params = { classId, examId }
  if (subject) params.subject = subject
  return api.get('/grades/analysis/rank', params)
}

/** 历次考试趋势 */
export function getGradesAnalysisTrend(classId, subject) {
  const params = { classId }
  if (subject) params.subject = subject
  return api.get('/grades/analysis/trend', params)
}

/** 某学生历史成绩 */
export function getStudentHistory(studentId) {
  return api.get('/grades/analysis/student/' + studentId)
}

/** 薄弱学生预警 */
export function getWeakStudents(classId, examId) {
  const params = { classId }
  if (examId) params.examId = examId
  return api.get('/grades/analysis/weak', params)
}
