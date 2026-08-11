import api from '../common/request'

/** 古诗词列表 */
export function listPoems(params = {}) {
  return api.get('/resource-library/poems', { params })
}

/** 数学公式列表 */
export function listFormulas(params = {}) {
  return api.get('/resource-library/formulas', { params })
}

/** 英语单词列表 */
export function listWords(params = {}) {
  return api.get('/resource-library/words', { params })
}

/** 科学资源列表 */
export function listScience(params = {}) {
  return api.get('/resource-library/science', { params })
}

/** 道德与法治资源列表 */
export function listMoral(params = {}) {
  return api.get('/resource-library/moral', { params })
}

/** 单词分类列表 */
export function listWordCategories() {
  return api.get('/resource-library/words/categories')
}

/** 智慧中小学课程（后端代理） */
export function getZhzxCourses() {
  return api.get('/online-resources/zhzx/courses')
}
