import request from './request'

/** 教师：本人各班级最新洞察 */
export function getMyInsights() {
  return request.get<any, any[]>('/insight')
}

/** 教师：重新生成并推送某班洞察 */
export function regenerateInsight(classId: string) {
  return request.post<any, any>(`/insight/regenerate/${classId}`)
}

/** 教师：基于本班数据一键生成班级文案（letter/speech/summary/blessing） */
export function generateClassDoc(classId: string, type: 'letter' | 'speech' | 'summary' | 'blessing') {
  return request.post<any, any>('/insight/generate-doc', { classId, type })
}
