import api from '../common/request'
import { listTodos } from './teaching'

/** 创建待办 */
export function createTodo(payload) {
  return api.post('/todos', payload)
}
/** 更新待办 */
export function updateTodo(id, payload) {
  return api.patch('/todos/' + id, payload)
}
/** 删除待办 */
export function removeTodo(id) {
  return api.del('/todos/' + id)
}
