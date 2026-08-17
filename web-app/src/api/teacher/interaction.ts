import request from '../request'

/* ============ 课堂互动（带后端数据的） ============ */

/** 座位表布局 */
export function listSeatLayouts(classId: string) {
  return request.get<any, any[]>('/seat-layouts', { params: { classId } })
}
export function saveSeatLayout(data: any) {
  return request.post<any, any>('/seat-layouts', data)
}

/** 启用某座位布局：把行列回写到学生 seatRow/seatCol/seatNo */
export function activateSeatLayout(id: string) {
  return request.post<any, any>('/seat-layouts/' + id + '/activate', {})
}

/** 抽签历史 */
export function listPickerHistory(classId?: string) {
  return request.get<any, any[]>('/picker-history', { params: classId ? { classId } : {} })
}
export function addPickerHistory(data: { classId?: string; mode: string; result: string[] }) {
  return request.post<any, any>('/picker-history', data)
}
/** 清空点名历史（后端 DELETE /picker-history 整表清空） */
export function clearPickerHistory(classId?: string) {
  return request.delete<any, void>('/picker-history', { params: classId ? { classId } : {} })
}

/** 奖惩记录（后端表 reward_records，路径 /reward-records） */
export function listRewards(classId?: string) {
  return request.get<any, any>('/reward-records', { params: classId ? { classId } : {} })
}
export function createReward(data: any) {
  return request.post<any, any>('/reward-records', data)
}

/** 加减分记录 */
export function listScoreRecords(classId?: string) {
  return request.get<any, any>('/score-records', { params: classId ? { classId } : {} })
}
export function createScoreRecord(data: any) {
  return request.post<any, any>('/score-records', data)
}

/** 获奖记录（学生详情页引用；奖项类别管理走 SchemaCrudPage） */
export function listAwards(classId?: string) {
  return request.get<any, any[]>('/award-records', { params: classId ? { classId } : {} })
}

/** 班级职务配置 */
export function listClassDutyConfigs(classId: string) {
  return request.get<any, any[]>('/class-duty-configs', { params: { classId } })
}
export function createClassDutyConfig(data: any) {
  return request.post<any, any>('/class-duty-configs', data)
}
export function updateClassDutyConfig(id: string, data: any) {
  return request.patch<any, any>('/class-duty-configs/' + id, data)
}
export function deleteClassDutyConfig(id: string) {
  return request.delete<any, void>('/class-duty-configs/' + id)
}

/** 行为记录（后端表 behavior_records，路径 /behavior-records） */
export function listBehaviors(classId?: string) {
  return request.get<any, any>('/behavior-records', { params: classId ? { classId } : {} })
}

/** 错题本 */
export function listMathMistakes(classId?: string) {
  return request.get<any, any[]>('/math-mistakes', { params: classId ? { classId } : {} })
}
export function createMathMistake(data: any) {
  return request.post<any, any>('/math-mistakes', data)
}
export function deleteMathMistake(id: string) {
  return request.delete<any, void>('/math-mistakes/' + id)
}
