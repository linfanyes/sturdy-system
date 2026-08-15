import { parentApi } from '../common/request'

/** 家长：当前学生学习计划 + 练习列表 */
export function getLearningPlan() {
  return parentApi.get('/parent/learning-loop/plan')
}

/** 家长：生成薄弱点同类题练习 */
export function generateExercise(knowledgePoint) {
  return parentApi.post('/parent/learning-loop/exercise', { knowledgePoint })
}

/** 家长：标记练习已完成 */
export function markExerciseDone(id) {
  return parentApi.post(`/parent/learning-loop/exercise/${id}/done`)
}
