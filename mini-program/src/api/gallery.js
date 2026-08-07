import api from '../common/request'
import { listClasses } from './teaching'

/** 班级相册列表（按班级） */
export function listGalleries(opts = {}) {
  return api.getList('/class-galleries', opts)
}
/** 创建班级相册 */
export function createGallery(payload) {
  return api.post('/class-galleries', payload)
}
/** 更新班级相册照片 */
export function updateGalleryPhotos(id, photos) {
  return api.patch('/class-galleries/' + id, { photos })
}
/** 删除班级相册 */
export function removeGallery(id) {
  return api.del('/class-galleries/' + id)
}
