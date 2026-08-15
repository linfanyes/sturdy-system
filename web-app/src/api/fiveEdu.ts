import request from './request'

/** 教师：班级五育档案（含 AI 点评）+ 可选单学生 */
export function getFiveEduProfile(classId: string, studentId?: string) {
  return request.get<any, any>('/five-edu/profile', { params: { classId, studentId } })
}

/** 教师：保存过程性评价 / 家务打卡 */
export function saveFiveEduRecord(body: any) {
  return request.post<any, any>('/five-edu/record', body)
}

/** 教师：过程性评价记录列表 */
export function listFiveEduRecords(studentId?: string) {
  return request.get<any, any>('/five-edu/records', { params: { studentId } })
}
