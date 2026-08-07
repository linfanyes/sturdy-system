import api from '../common/request'
import { listClasses } from './teaching'

/** 班级费用列表（按班级） */
export function listClassExpenses(opts = {}) {
  return api.getList('/class-expenses', opts)
}
/** 创建班级费用 */
export function createClassExpense(payload) {
  return api.post('/class-expenses', payload)
}
/** 删除班级费用 */
export function removeClassExpense(id) {
  return api.del('/class-expenses/' + id)
}
