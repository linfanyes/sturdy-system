import request from './request'

export function getSchedule(classId: string) {
  return request.get('/schedule', { params: { classId } })
}
export function createSchedule(data: any) {
  return request.post('/schedule', data)
}
export function updateSchedule(id: string, data: any) {
  return request.put(`/schedule/${id}`, data)
}
export function deleteSchedule(id: string) {
  return request.delete(`/schedule/${id}`)
}
/** 调课并通知全班家长 */
export function adjustSchedule(id: string, data: any) {
  return request.post(`/schedule/${id}/adjust`, data)
}
