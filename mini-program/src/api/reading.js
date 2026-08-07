import api from '../common/request'

/** 阅读日志列表 */
export function listReadingLogs(opts = {}) {
  return api.getList('/reading-logs', opts)
}
/** 创建阅读日志 */
export function createReadingLog(payload) {
  return api.post('/reading-logs', payload)
}
/** 更新阅读日志 */
export function updateReadingLog(id, payload) {
  return api.patch('/reading-logs/' + id, payload)
}
/** 删除阅读日志 */
export function removeReadingLog(id) {
  return api.del('/reading-logs/' + id)
}
