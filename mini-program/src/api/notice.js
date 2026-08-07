import api from '../common/request'

/** 班级列表 */
export function listClasses(opts = {}) {
  return api.getList('/classes', opts)
}
/** 公告列表 */
export function listNotices(opts = {}) {
  return api.getList('/notices', opts)
}
/** 创建公告 */
export function createNotice(payload) {
  return api.post('/notices', payload)
}
/** 更新公告 */
export function updateNotice(id, payload) {
  return api.patch('/notices/' + id, payload)
}
/** 推送公告 */
export function pushNotice(payload) {
  return api.post('/notices/push', payload)
}
/** 置顶/取消置顶 */
export function toggleNoticePinned(id) {
  return api.patch('/notices/' + id, { pinned: true })
}
/** 结束/重新开启公告 */
export function toggleNoticeEnded(id, ended) {
  return api.patch('/notices/' + id, { ended })
}
/** 删除公告 */
export function removeNotice(id) {
  return api.del('/notices/' + id)
}
/** 公告模板列表 */
export function listNoticeTemplates(opts = {}) {
  return api.getList('/notice-templates', opts)
}
