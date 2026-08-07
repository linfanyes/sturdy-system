import api from '../common/request'

/** 班级列表 */
export function listClasses(opts = {}) {
  return api.getList('/classes', opts)
}
/** 创建班级 */
export function createClass(payload) {
  return api.post('/classes', payload)
}
/** 更新班级 */
export function updateClass(id, payload) {
  return api.patch('/classes/' + id, payload)
}
/** 删除班级 */
export function removeClass(id) {
  return api.del('/classes/' + id)
}
/** 批量更新班级字段（内部使用 batchRun） */
export async function batchUpdateClasses(items) {
  const { batchRun } = await import('../common/request')
  return batchRun(items.map(({ id, data }) => () => updateClass(id, data)))
}
/** 学生列表 */
export function listStudents(opts = {}) {
  return api.getList('/students', opts)
}
/** 成绩列表 */
export function listGrades(opts = {}) {
  return api.getList('/grades', opts)
}
/** 考试列表 */
export function listExams(opts = {}) {
  return api.getList('/exams', opts)
}
/** 通知列表 */
export function listNotices(opts = {}) {
  return api.getList('/notices', opts)
}
/** 考勤列表 */
export function listAttendances(opts = {}) {
  return api.getList('/attendances', opts)
}
/** 作业列表 */
export function listHomework(opts = {}) {
  return api.getList('/homework', opts)
}
/** 笔记列表 */
export function listNotes(opts = {}) {
  return api.getList('/notes', opts)
}
/** 待办列表 */
export function listTodos(opts = {}) {
  return api.getList('/todos', opts)
}
/** 学期列表 */
export function listSemesters(opts = {}) {
  return api.get('/semesters', opts)
}
/** 单个考试详情 */
export function getExam(id) {
  return api.get('/exams/' + id)
}
/** 成绩分析（按考试） */
export function getGradesAnalysisExam(classId, examId) {
  return api.get('/grades/analysis/exam', { classId, examId })
}
/** 成绩排名（按考试） */
export function getGradesAnalysisRank(classId, examId) {
  return api.get('/grades/analysis/rank', { classId, examId })
}
/** 学生详情 */
export function getStudent(id) {
  return api.get('/students/' + id)
}
/** 学生成绩分析 */
export function getStudentGradesAnalysis(studentId) {
  return api.get('/grades/analysis/student/' + studentId)
}

/** 本校教师列表（班主任特权） */
export function listSchoolTeachers() {
  return api.post('/classes/school-teachers')
}
/** 班级成员列表 */
export function listClassMembers(classId) {
  return api.post('/classes/' + classId + '/members/list')
}
/** 移除班级成员 */
export function removeClassMember(classId, teacherId) {
  return api.del('/classes/' + classId + '/members/' + teacherId)
}
/** 添加班级成员 */
export function addClassMember(classId, payload) {
  return api.post('/classes/' + classId + '/members', payload)
}
/** 将本学期同步到其他班级（返回 batchRun 结果） */
export async function syncTermToOthers(classId, term) {
  const { batchRun } = await import('../common/request')
  // 先在调用方获取其他班级列表，这里只负责批量 patch
  return async (others) => {
    const { success, failed } = await batchRun(
      others.map((c) => () => updateClass(c.id, { term })),
    )
    return { success, failed }
  }
}
/** 学校列表（超管用） */
export function listAdminSchools() {
  return api.get('/admin/schools')
}
