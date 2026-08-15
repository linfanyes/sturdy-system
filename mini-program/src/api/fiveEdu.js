import { parentApi } from '../common/request'

/** 家长：当前绑定学生的五育档案 + 过程性评价记录 */
export function getFiveEduProfile() {
  return parentApi.get('/parent/five-edu/profile')
}
