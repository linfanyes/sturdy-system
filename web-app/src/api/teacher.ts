import request from './request'

/**
 * 教师端 API 封装：对接小程序后端统一 CRUD 接口（base.controller.ts 模式）。
 * 所有写操作由后端从 JWT 注入 teacherId，前端无需手动传。
 * GET 列表支持 ?classId=&skip=&take=&term= 过滤。
 */

/** 教师端：班级列表项（复用 ClassItem 结构） */
export interface TeacherClass {
  id: string
  teacherId: string
  name: string
  grade: string
  classNo: string
  headTeacher: string
  term: string
  subjects?: string[]
  color?: string
  createdAt: string
}

/** 教师端：学生列表项 */
export interface TeacherStudent {
  id: string
  classId: string
  name: string
  gender: string
  studentNo: string
  parentName?: string
  parentPhone?: string
  parentLoginEnabled?: boolean
  createdAt: string
}

/** 班级成员（教师） */
export interface ClassMember {
  id: string
  classId: string
  teacherId: string
  teacherName: string
  role: 'head' | 'subject'
  subjects?: string[]
  term: string
}

/* ============ 班级与学生 ============ */

/** 获取当前教师的班级列表 */
export function listMyClasses() {
  return request.get<any, TeacherClass[]>('/classes')
}

/** 获取某班级的学生列表 */
export function listClassStudents(classId: string) {
  return request.get<any, TeacherStudent[]>('/students', { params: { classId } })
}

/** 获取班级成员（协作教师） */
export function listClassMembers(classId: string) {
  return request.get<any, ClassMember[]>('/classes/' + classId + '/members')
}

/* ============ 班级运营：轮值/值日/班费/活动/风采 ============ */

/** 轮值表 */
export function listDutyRosters(classId: string) {
  return request.get<any, any[]>('/duty-rosters', { params: { classId } })
}
export function createDutyRoster(data: any) {
  return request.post<any, any>('/duty-rosters', data)
}
export function updateDutyRoster(id: string, data: any) {
  return request.patch<any, any>('/duty-rosters/' + id, data)
}
export function deleteDutyRoster(id: string) {
  return request.delete<any, void>('/duty-rosters/' + id)
}

/** 值日配置 */
export function listDutyConfigs(classId: string) {
  return request.get<any, any[]>('/class-duty-configs', { params: { classId } })
}

/** 班费 */
export function listClassExpenses(classId: string) {
  return request.get<any, any[]>('/class-expenses', { params: { classId } })
}

/** 班级活动 */
export function listClassActivities(classId: string) {
  return request.get<any, any[]>('/class-activities', { params: { classId } })
}

/** 班级风采（照片墙） */
export function listClassGalleries(classId: string) {
  return request.get<any, any[]>('/class-galleries', { params: { classId } })
}

/** 我的相册 */
export function listMyGalleries(classId?: string) {
  return request.get<any, any[]>('/my-galleries', { params: classId ? { classId } : {} })
}

/* ============ 家校沟通 ============ */

/** 家长联系记录 */
export function listParentContacts(classId: string) {
  return request.get<any, any[]>('/parent-contacts', { params: { classId } })
}

/** 通知模板 */
export function listNoticeTemplates() {
  return request.get<any, any[]>('/notice-templates')
}

/** IM 会话与消息 */
export function listImConversations() {
  return request.get<any, any[]>('/im/conversations')
}
export function listImMessages(conversationId: string, before?: string) {
  return request.get<any, any[]>('/im/messages', { params: { conversationId, before } })
}
export function sendImMessage(data: { conversationId: string; content: string; type?: string }) {
  return request.post<any, any>('/im/messages', data)
}

/* ============ 教师办公 ============ */

/** 工作日志 */
export function listWorkLogs() {
  return request.get<any, any[]>('/work-logs')
}

/** 听课记录 */
export function listLessonObservations() {
  return request.get<any, any[]>('/lesson-observations')
}

/** 教学日历 */
export function listTeachingCalendar() {
  return request.get<any, any[]>('/teaching-calendar')
}

/** 教师通讯录 */
export function listTeachers() {
  return request.get<any, any[]>('/teachers')
}

/* ============ 课堂互动（带后端数据的） ============ */

/** 座位表布局 */
export function listSeatLayouts(classId: string) {
  return request.get<any, any[]>('/seat-layouts', { params: { classId } })
}
export function saveSeatLayout(data: any) {
  return request.post<any, any>('/seat-layouts', data)
}
export function updateSeatLayout(id: string, data: any) {
  return request.patch<any, any>('/seat-layouts/' + id, data)
}
export function deleteSeatLayout(id: string) {
  return request.delete<any, void>('/seat-layouts/' + id)
}

/** 抽签历史 */
export function listPickerHistory(classId?: string) {
  return request.get<any, any[]>('/picker-history', { params: classId ? { classId } : {} })
}
export function addPickerHistory(data: { classId?: string; mode: string; result: string[] }) {
  return request.post<any, any>('/picker-history', data)
}
export function clearPickerHistory(classId?: string) {
  return request.delete<any, void>('/picker-history', { params: classId ? { classId } : {} })
}

/** 奖惩记录 */
export function listRewards(classId?: string) {
  return request.get<any, any[]>('/rewards', { params: classId ? { classId } : {} })
}
export function createReward(data: any) {
  return request.post<any, any>('/rewards', data)
}
export function updateReward(id: string, data: any) {
  return request.patch<any, any>('/rewards/' + id, data)
}
export function deleteReward(id: string) {
  return request.delete<any, void>('/rewards/' + id)
}

/** 加减分记录 */
export function listScoreRecords(classId?: string) {
  return request.get<any, any[]>('/score-records', { params: classId ? { classId } : {} })
}
export function createScoreRecord(data: any) {
  return request.post<any, any>('/score-records', data)
}
export function deleteScoreRecord(id: string) {
  return request.delete<any, void>('/score-records/' + id)
}

/** 小组评分 */
export function listGroupScores(classId: string) {
  return request.get<any, any[]>('/group-scores', { params: { classId } })
}
export function createGroupScore(data: any) {
  return request.post<any, any>('/group-scores', data)
}

/** 排行榜 */
export function listLeaderboard(classId: string) {
  return request.get<any, any[]>('/leaderboard', { params: { classId } })
}

/** 奖项管理 */
export function listAwardCategories(classId?: string) {
  return request.get<any, any[]>('/award-categories', { params: classId ? { classId } : {} })
}
export function createAwardCategory(data: any) {
  return request.post<any, any>('/award-categories', data)
}
export function listAwards(classId?: string) {
  return request.get<any, any[]>('/awards', { params: classId ? { classId } : {} })
}
export function createAward(data: any) {
  return request.post<any, any>('/awards', data)
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

/** 成长记录 */
export function listGrowthRecords(classId?: string) {
  return request.get<any, any[]>('/growth-records', { params: classId ? { classId } : {} })
}
export function createGrowthRecord(data: any) {
  return request.post<any, any>('/growth-records', data)
}

/** 行为记录 */
export function listBehaviors(classId?: string) {
  return request.get<any, any[]>('/behaviors', { params: classId ? { classId } : {} })
}
export function createBehavior(data: any) {
  return request.post<any, any>('/behaviors', data)
}

/** 课外阅读 */
export function listReadingLogs(classId?: string) {
  return request.get<any, any[]>('/reading-logs', { params: classId ? { classId } : {} })
}
export function createReadingLog(data: any) {
  return request.post<any, any>('/reading-logs', data)
}

/** 学生打卡 */
export function listCheckins(classId?: string) {
  return request.get<any, any[]>('/checkins', { params: classId ? { classId } : {} })
}
export function createCheckin(data: any) {
  return request.post<any, any>('/checkins', data)
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

/* ============ AI 工具统一入口 ============ */

/** AI 流式对话（SSE），返回可读流 */
export async function aiChatStream(
  messages: { role: string; content: string }[],
  onDelta: (delta: string) => void,
  onError?: (msg: string) => void,
) {
  const token = localStorage.getItem('trace_web_token')
  const base = import.meta.env.VITE_API_BASE || '/api'
  const resp = await fetch(base + '/ai/chat', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ messages }),
  })
  if (!resp.body) throw new Error('当前浏览器不支持流式响应')
  const reader = resp.body.getReader()
  const decoder = new TextDecoder()
  let buf = ''
  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    buf += decoder.decode(value, { stream: true })
    const lines = buf.split('\n')
    buf = lines.pop() || ''
    for (const line of lines) {
      if (!line.startsWith('data: ')) continue
      const data = line.slice(6).trim()
      if (data === '[DONE]') continue
      try {
        const obj = JSON.parse(data)
        if (obj.delta) onDelta(obj.delta)
        if (obj.error && onError) onError(obj.error)
      } catch {
        /* 忽略解析错误 */
      }
    }
  }
}

/** AI 同步对话（非流式） */
export function aiChatSync(messages: { role: string; content: string }[]) {
  return request.post<any, { content: string }>('/ai/chat-sync', { messages })
}

/** AI 解析（自由文本转结构化） */
export function aiParse(text: string, instruction?: string) {
  return request.post<any, any>('/ai/parse', { text, instruction })
}

/** AI 文生图 */
export function aiGenImage(data: any) {
  return request.post<any, any>('/ai/gen-image', data)
}

/** 考试 AI 分析 */
export function aiAnalyzeExam(examId: string) {
  return request.post<any, { content: string }>('/ai/analyze-exam', { examId })
}

/** 学生 AI 诊断 */
export function aiDiagnose(studentId: string) {
  return request.post<any, { content: string }>('/ai/diagnose', { studentId })
}

/* ============ 通用 CRUD 辅助 ============ */

/** 通用列表查询 */
export function crudList<T = any>(path: string, params?: Record<string, any>) {
  return request.get<any, T[]>(path, { params })
}
/** 通用新增 */
export function crudCreate<T = any>(path: string, data: any) {
  return request.post<any, T>(path, data)
}
/** 通用更新 */
export function crudUpdate<T = any>(path: string, id: string, data: any) {
  return request.patch<any, T>(path + '/' + id, data)
}
/** 通用删除 */
export function crudDelete(path: string, id: string) {
  return request.delete<any, void>(path + '/' + id)
}
