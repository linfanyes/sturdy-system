import request from './request'

export function getReports(classId: string, type?: string) {
  return request.get('/report', { params: { classId, type } })
}
export function getLatestReport(classId: string, type: 'weekly' | 'monthly' = 'weekly') {
  return request.get('/report/latest', { params: { classId, type } })
}
export function generateReport(data: { classId: string; type: 'weekly' | 'monthly' }) {
  return request.post('/report/generate', data)
}
