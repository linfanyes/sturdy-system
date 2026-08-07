import api from '../common/request'

/** 值日配置列表（按班级） */
export function listDutyConfigs(classId, opts = {}) {
  return api.getList('/class-duty-configs', { ...opts, classId })
}
/** 创建值日配置 */
export function createDutyConfig(payload) {
  return api.post('/class-duty-configs', payload)
}
/** 更新值日配置 */
export function updateDutyConfig(id, payload) {
  return api.patch('/class-duty-configs/' + id, payload)
}
/** 删除值日配置 */
export function removeDutyConfig(id) {
  return api.del('/class-duty-configs/' + id)
}
