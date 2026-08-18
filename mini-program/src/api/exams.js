import api from '../common/request'

/** 考试列表（带班级筛选） */
export function listExams(opts = {}) {
  return api.getList('/exams', opts)
}

/** 创建考试 */
export function createExam(payload) {
  return api.post('/exams', payload)
}

/** 更新考试 */
export function updateExam(id, payload) {
  return api.patch('/exams/' + id, payload)
}

/** 删除考试 */
export function removeExam(id) {
  return api.del('/exams/' + id)
}

/** 批量删除考试 */
export function batchRemoveExams(ids) {
  return api.del('/exams/batch/ids', { ids })
}

/** 恢复已删除考试 */
export function restoreExam(id) {
  return api.patch('/exams/' + id + '/restore')
}

/** 查看已删除考试（回收站） */
export function listDeletedExams(opts = {}) {
  return api.getList('/exams/trash/deleted', opts)
}

/** 班级列表（用于筛选） */
export function listClasses(opts = {}) {
  return api.getList('/classes', opts)
}

/** 公共配置（科目等） */
export function getPublicConfig() {
  return api.get('/config/public')
}
