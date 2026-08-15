import request from './request'

export function getAssignments(classId: string) {
  return request.get('/assignment', { params: { classId } })
}
export function createAssignment(data: any) {
  return request.post('/assignment', data)
}
export function updateAssignment(id: string, data: any) {
  return request.put(`/assignment/${id}`, data)
}
export function deleteAssignment(id: string) {
  return request.delete(`/assignment/${id}`)
}
