import { parentApi } from '../common/request'

/** 家长/学生端：微课列表（可选分类） */
export function listLessons(category) {
  const qs = category ? `?category=${category}` : ''
  return parentApi.get('/parent/literacy/lessons' + qs)
}

/** 家长/学生端：完成微课得徽章 */
export function complete(lessonId) {
  return parentApi.post('/parent/literacy/complete', { lessonId })
}

/** 家长/学生端：我的徽章 */
export function myBadges() {
  return parentApi.get('/parent/literacy/my-badges')
}
