import request from './request'

/** 教师：班级情绪看板 */
export function getMoodDashboard(params?: { classId?: string; dateFrom?: string; dateTo?: string }) {
  return request.get<any, any>('/mood/dashboard', { params })
}

/** 教师：心情打卡列表 */
export function listMoodCheckins(params?: { classId?: string; dateFrom?: string; dateTo?: string }) {
  return request.get<any, any[]>('/mood', { params })
}

/** 教师：树洞列表 */
export function listTreeHoles(params?: { classId?: string; status?: string }) {
  return request.get<any, any[]>('/mood/tree-holes', { params })
}

/** 教师：树洞详情 */
export function getTreeHole(id: string) {
  return request.get<any, any>('/mood/tree-holes/' + id)
}

/** 教师：回复/定级树洞 */
export function replyTreeHole(id: string, dto: { staffReply: string; riskLevel?: 'none' | 'low' | 'high'; status?: 'responded' | 'escalated' }) {
  return request.patch<any, any>('/mood/tree-holes/' + id, dto)
}
