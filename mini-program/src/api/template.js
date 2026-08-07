import api from '../common/request'

/** 公告模板列表 */
export function listNoticeTemplates(opts = {}) {
  return api.getList('/notice-templates', opts)
}
/** 创建公告模板 */
export function createNoticeTemplate(payload) {
  return api.post('/notice-templates', payload)
}
/** 更新公告模板 */
export function updateNoticeTemplate(id, payload) {
  return api.patch('/notice-templates/' + id, payload)
}
/** 删除公告模板 */
export function removeNoticeTemplate(id) {
  return api.del('/notice-templates/' + id)
}
/** 教案模板列表 */
export function listLessonPlanTemplates(opts = {}) {
  return api.getList('/lesson-plan-templates', opts)
}
/** 创建教案模板 */
export function createLessonPlanTemplate(payload) {
  return api.post('/lesson-plan-templates', payload)
}
/** 更新教案模板 */
export function updateLessonPlanTemplate(id, payload) {
  return api.patch('/lesson-plan-templates/' + id, payload)
}
/** 删除教案模板 */
export function removeLessonPlanTemplate(id) {
  return api.del('/lesson-plan-templates/' + id)
}
