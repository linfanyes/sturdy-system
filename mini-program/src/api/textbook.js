import api from '../common/request'

/** 教材树 */
export function getTextbookTree(params = {}) {
  return api.get('/textbooks/tree', { params })
}

/** 搜索知识点 */
export function searchTextbooks(params = {}) {
  return api.get('/textbooks/search', { params })
}
