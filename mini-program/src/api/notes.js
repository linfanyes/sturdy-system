import api from '../common/request'

/** 笔记列表 */
export function listNotes(opts = {}) {
  return api.getList('/notes', opts)
}
/** 创建笔记 */
export function createNote(payload) {
  return api.post('/notes', payload)
}
/** 更新笔记 */
export function updateNote(id, payload) {
  return api.patch('/notes/' + id, payload)
}
/** 置顶/取消置顶 */
export function toggleNotePinned(id) {
  return api.patch('/notes/' + id, { pinned: true })
}
/** 收藏/取消收藏 */
export function toggleNoteFavorite(id) {
  return api.patch('/notes/' + id, { favorite: true })
}
/** 删除笔记 */
export function removeNote(id) {
  return api.del('/notes/' + id)
}
