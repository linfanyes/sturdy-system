import request from './request'

/** 教师：学情画像（薄弱知识点清单） */
export function getLearningProfile(classId: string, studentId?: string) {
  return request.get<any, any>('/learning-loop/profile', { params: { classId, studentId } })
}

/** 教师：AI 生成薄弱点同类题练习 */
export function generateExercise(body: { studentId: string; knowledgePoint: string }) {
  return request.post<any, any>('/learning-loop/exercise', body)
}

/** 教师：保存学习计划（按学生+周 upsert） */
export function saveStudyPlan(body: any) {
  return request.post<any, any>('/learning-loop/plan', body)
}
