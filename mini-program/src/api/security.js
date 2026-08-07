import api from '../common/request'

/** 文本内容安全审核 */
export function checkText(content) {
  return api.post('/security/msg-check', { content })
}
/** 图片内容安全审核 */
export function checkImage(image) {
  return api.post('/security/img-check', { image })
}
