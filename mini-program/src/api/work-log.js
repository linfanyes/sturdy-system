import api from '../common/request'

/** 工作日志列表 */
export function listWorkLogs(opts = {}) {
  return api.getList('/work-logs', opts)
}
/** 创建工作日志 */
export function createWorkLog(payload) {
  return api.post('/work-logs', payload)
}
/** 更新工作日志 */
export function updateWorkLog(id, payload) {
  return api.patch('/work-logs/' + id, payload)
}
/** 删除工作日志 */
export function removeWorkLog(id) {
  return api.del('/work-logs/' + id)
}
