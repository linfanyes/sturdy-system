import api from '../common/request'

/** 教学日历列表 */
export function listTeachingCalendar(opts = {}) {
  return api.get('/teaching-calendar', opts)
}
/** 创建教学日历 */
export function createTeachingCalendar(payload) {
  return api.post('/teaching-calendar', payload)
}
/** 更新教学日历 */
export function updateTeachingCalendar(id, payload) {
  return api.patch('/teaching-calendar/' + id, payload)
}
/** 删除教学日历 */
export function removeTeachingCalendar(id) {
  return api.del('/teaching-calendar/' + id)
}
