import api from '../common/request'

/** AI 生成的教案列表 */
export function listLessonPlans() {
  return api.get('/generated/lesson-plans')
}
/** AI 生成教案 */
export function createLessonPlan(payload) {
  return api.post('/generated/lesson-plans', payload)
}
/** AI 生成的试卷列表 */
export function listPapers() {
  return api.get('/generated/papers')
}
/** AI 生成试卷 */
export function createPaper(payload) {
  return api.post('/generated/papers', payload)
}
/** 按类型获取生成的试卷（如 exam-analysis） */
export function getPapersByType(type) {
  return api.get('/generated/papers', { params: { type } })
}
/** 知识点列表 */
export function listKnowledges(opts = {}) {
  return api.getList('/generated/knowledges', opts)
}
/** 创建知识点 */
export function createKnowledge(payload) {
  return api.post('/generated/knowledges', payload)
}
/** 更新知识点 */
export function updateKnowledge(id, payload) {
  return api.patch('/generated/knowledges/' + id, payload)
}
/** 删除知识点 */
export function removeKnowledge(id) {
  return api.del('/generated/knowledges/' + id)
}
/** 错题本/查询记录列表 */
export function listQueries(opts = {}) {
  return api.getList('/generated/queries', opts)
}
/** 创建查询记录 */
export function createQuery(payload) {
  return api.post('/generated/queries', payload)
}
/** 更新查询记录 */
export function updateQuery(id, payload) {
  return api.patch('/generated/queries/' + id, payload)
}
/** 删除查询记录 */
export function removeQuery(id) {
  return api.del('/generated/queries/' + id)
}
