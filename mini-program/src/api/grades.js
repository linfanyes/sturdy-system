import api from '../common/request'

/** 当前班级/筛选条件下的成绩列表 */
export function listGrades(opts = {}) {
  return api.getList('/grades', opts)
}

/** 单条成绩详情（用于合并/删除前的查询） */
export function getGrades(params = {}) {
  return api.get('/grades', params)
}

/** 保存单条成绩 */
export function saveGrade(payload) {
  return api.post('/grades', payload)
}

/** 批量导入预览 */
export function importGradesPreview(payload) {
  return api.post('/grades/import-preview', payload)
}

/** 批量导入确认 */
export function importGradesCommit(payload) {
  return api.post('/grades/import-commit', payload)
}

/** 合并成绩 */
export function mergeGrades(payload) {
  return api.post('/grades/merge', payload)
}

/** 删除成绩 */
export function removeGrade(id) {
  return api.del('/grades/' + id)
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
