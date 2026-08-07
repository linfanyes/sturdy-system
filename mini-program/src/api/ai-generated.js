import api from '../common/request'

/** AI 生成的教案列表 */
export function listLessonPlans() {
  return api.get('/generated/lesson-plans')
}

/** AI 生成的试卷列表 */
export function listPapers() {
  return api.get('/generated/papers')
}
