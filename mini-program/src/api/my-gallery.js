import api from '../common/request'

/** 我的相册列表 */
export function listMyGalleries(opts = {}) {
  return api.getList('/my-galleries', opts)
}
/** 创建我的相册 */
export function createMyGallery(payload) {
  return api.post('/my-galleries', payload)
}
/** 更新我的相册照片 */
export function updateMyGalleryPhotos(id, photos) {
  return api.patch('/my-galleries/' + id, { photos })
}
/** 删除我的相册 */
export function removeMyGallery(id) {
  return api.del('/my-galleries/' + id)
}
