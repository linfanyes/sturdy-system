import api from '../common/request'
import { listClasses } from './teaching'

/** 抽签历史列表 */
export function listPickerHistory(opts = {}) {
  return api.getList('/picker-history', opts)
}
/** 清空抽签历史 */
export function clearPickerHistory() {
  return api.getList('/picker-history', { loading: false })
}
/** 删除单条抽签历史 */
export function removePickerHistory(id) {
  return api.del('/picker-history/' + id)
}
