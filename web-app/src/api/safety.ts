import request from './request'

export interface SafetyReportItem {
  id: string
  type: 'bullying' | 'security' | 'other'
  content: string
  level: 'low' | 'medium' | 'high'
  status: 'pending' | 'processing' | 'resolved'
  anonymous: boolean
  classId: string | null
  handlerName: string
  note: string | null
  createdAt: string
}

/** 教师/校管：举报列表 */
export function listReports(params: { classId?: string; status?: string } = {}) {
  return request.get('/safety/reports', { params })
}

/** 教师/校管：处理举报 */
export function respondReport(id: string, body: { status?: string; level?: string; note?: string; handlerName?: string }) {
  return request.post(`/safety/reports/${id}/respond`, body)
}

/** 教师/校管：考勤异常预警 */
export function getAnomalies(classId: string) {
  return request.get('/safety/anomalies', { params: { classId } })
}
