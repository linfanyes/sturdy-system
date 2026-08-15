import request from './request'

/** 教师：本人各班级最新洞察 */
export function getMyInsights() {
  return request.get<any, any[]>('/insight')
}

/** 教师：重新生成并推送某班洞察 */
export function regenerateInsight(classId: string) {
  return request.post<any, any>(`/insight/regenerate/${classId}`)
}
