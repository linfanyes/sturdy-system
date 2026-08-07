import api from '../common/request'
import { listClasses } from './teaching'

/** 值日表列表（按班级） */
export function listDutyRosters(opts = {}) {
  return api.getList('/duty-rosters', opts)
}
/** 创建值日表 */
export function createDutyRoster(payload) {
  return api.post('/duty-rosters', payload)
}
/** 更新值日表 */
export function updateDutyRoster(id, payload) {
  return api.patch('/duty-rosters/' + id, payload)
}
/** 删除值日表 */
export function removeDutyRoster(id) {
  return api.del('/duty-rosters/' + id)
}
