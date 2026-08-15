import api, { parentApi } from '../common/request'

/* ==================== 教师端（常规令牌） ==================== */

/** 教师：本班心情打卡列表（可按班级/日期区间过滤） */
export function listMoodCheckins(classId, dateFrom, dateTo) {
  const params = {}
  if (classId) params.classId = classId
  if (dateFrom) params.dateFrom = dateFrom
  if (dateTo) params.dateTo = dateTo
  return api.get('/mood', { params })
}

/** 教师：班级情绪看板（分布/趋势/连续低落/树洞概览） */
export function getMoodDashboard(classId, dateFrom, dateTo) {
  const params = {}
  if (classId) params.classId = classId
  if (dateFrom) params.dateFrom = dateFrom
  if (dateTo) params.dateTo = dateTo
  return api.get('/mood/dashboard', { params })
}

/** 教师：树洞列表（可按班级/状态过滤） */
export function listTreeHoles(classId, status) {
  const params = {}
  if (classId) params.classId = classId
  if (status) params.status = status
  return api.get('/mood/tree-holes', { params })
}

/** 教师：树洞详情 */
export function getTreeHole(id) {
  return api.get('/mood/tree-holes/' + id)
}

/** 教师：回复/定级树洞 */
export function replyTreeHole(id, dto) {
  return api.patch('/mood/tree-holes/' + id, dto)
}

/* ==================== 家长/学生端（家长令牌） ==================== */

/** 家长：提交当日心情（归属 JWT 当前学生） */
export function checkInMood(dto) {
  return parentApi.post('/parent/mood/checkin', dto)
}

/** 家长：我的近期心情 */
export function listMyMood() {
  return parentApi.get('/parent/mood/mine')
}

/** 家长：匿名提交树洞 */
export function submitTreeHole(dto) {
  return parentApi.post('/parent/mood/tree-hole', dto)
}

/** 家长：我的树洞倾诉（按当前学生） */
export function listMyTreeHoles() {
  return parentApi.get('/parent/mood/tree-holes/mine')
}
