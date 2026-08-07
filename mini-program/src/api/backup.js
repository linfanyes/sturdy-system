import api from '../common/request'

/** 备份列表 */
export function listBackups(opts = {}) {
  return api.get('/backups', opts)
}
/** 创建手动备份 */
export function createBackup(payload) {
  return api.post('/backups', payload)
}
/** 获取备份详情 */
export function getBackup(id) {
  return api.get('/backups/' + id)
}
/** 删除备份 */
export function removeBackup(id) {
  return api.del('/backups/' + id)
}
/** 自动备份 */
export function autoBackup() {
  return api.post('/backups/auto')
}
