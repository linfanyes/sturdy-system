import request from './request'

/** 教师/校管：微课列表 */
export function listLessons(category?: string) {
  return request.get('/literacy/lessons', { params: category ? { category } : {} })
}

/** 教师/校管：班级徽章统计 */
export function classBadges(classId: string) {
  return request.get('/literacy/class-badges', { params: { classId } })
}
