import request, { getApiBase } from './request'
import { parseSSELn } from '@gardener/shared/utils/sse-parser'

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
  studentPhone?: string
  address?: string
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

/** 获取当前教师所有学生（不传 classId 返回全部） */
export function listAllStudents(params?: { classId?: string; skip?: number; take?: number }) {
  return request.get<any, any>('/students', { params: params || {} })
}

/** 新增学生（单个录入） */
export function createStudent(data: {
  name: string
  gender: string
  studentNo?: string
  parentName?: string
  parentPhone?: string
  studentPhone?: string
  address?: string
  classId: string
}) {
  return request.post<any, TeacherStudent>('/students', data)
}

/** 更新学生信息 */
export function updateStudent(id: string, data: Partial<{
  name: string
  gender: string
  studentNo: string
  parentName: string
  parentPhone: string
  studentPhone: string
  address: string
  classId: string
}>) {
  return request.patch<any, TeacherStudent>('/students/' + id, data)
}

/** 获取单个学生详情 */
export function getStudent(id: string) {
  return request.get<any, TeacherStudent>('/students/' + id)
}

/** 删除学生 */
export function deleteStudent(id: string) {
  return request.delete<any, void>('/students/' + id)
}

/** 开通/关闭家长登录 */
export function toggleStudentParentLogin(id: string) {
  return request.post<any, { studentId: string; parentLoginEnabled: boolean; initialPassword?: string }>('/students/' + id + '/toggle-parent-login')
}

/** 重置家长登录口令 */
export function resetStudentParentPassword(id: string, password?: string) {
  return request.post<any, { studentId: string; ok: boolean; defaultPassword: string }>('/students/' + id + '/reset-parent-password', { password: password || '' })
}

/** 获取班级成员（协作教师）
 * 注意：后端用 POST /classes/:id/members/list 查询（避免与基类 GET :id 路由冲突），
 * POST /classes/:id/members 是"添加科任老师"，GET /classes/:id/members 无对应路由会 404。
 */
export function listClassMembers(classId: string) {
  return request.post<any, ClassMember[]>('/classes/' + classId + '/members/list')
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
  return request.get<any, any[]>('/reward-records', { params: classId ? { classId } : {} })
}
export function createReward(data: any) {
  return request.post<any, any>('/reward-records', data)
}
export function updateReward(id: string, data: any) {
  return request.patch<any, any>('/reward-records/' + id, data)
}
export function deleteReward(id: string) {
  return request.delete<any, void>('/reward-records/' + id)
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

/** 奖项管理（后端表 award_records / award_categories） */
export function listAwardCategories(classId?: string) {
  return request.get<any, any[]>('/award-categories', { params: classId ? { classId } : {} })
}
export function createAwardCategory(data: any) {
  return request.post<any, any>('/award-categories', data)
}
export function listAwards(classId?: string) {
  return request.get<any, any[]>('/award-records', { params: classId ? { classId } : {} })
}
export function createAward(data: any) {
  return request.post<any, any>('/award-records', data)
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

/** 成长记录（后端表 growth_entries，路径 /growth-entries） */
export function listGrowthRecords(classId?: string) {
  return request.get<any, any[]>('/growth-entries', { params: classId ? { classId } : {} })
}
export function createGrowthRecord(data: any) {
  return request.post<any, any>('/growth-entries', data)
}

/** 行为记录（后端表 behavior_records，路径 /behavior-records） */
export function listBehaviors(classId?: string) {
  return request.get<any, any[]>('/behavior-records', { params: classId ? { classId } : {} })
}
export function createBehavior(data: any) {
  return request.post<any, any>('/behavior-records', data)
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
  const base = getApiBase()
  const resp = await fetch(base + '/ai/chat', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ messages }),
  })
  // 与 request.ts 拦截器保持一致的 401 策略（ai/chat 非登录接口，失效即清登录态跳转）
  if (resp.status === 401) {
    localStorage.removeItem('trace_web_token')
    localStorage.removeItem('trace_web_user')
    if (!location.hash.startsWith('#/login')) location.hash = '#/login'
    throw new Error('登录已失效，请重新登录')
  }
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
      // 共享 SSE 行解析：剥离 "data: " 前缀 + 识别 [DONE] 终止标记
      const { data, done: evDone } = parseSSELn(line)
      if (evDone) continue
      if (data == null) continue
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

/* ============ 成绩分析 API ============ */

/** 某次考试统计（按班级+考试） */
export function getExamAnalysis(classId: string, examId: string, fullScoreMap?: Record<string, number>) {
  const params: Record<string, any> = { classId, examId }
  if (fullScoreMap) params.fullScoreMap = JSON.stringify(fullScoreMap)
  return request.get<any, any>('/grades/analysis/exam', { params })
}

/** 班级内排名 */
export function getClassRank(classId: string, examId: string, subject?: string) {
  const params: Record<string, any> = { classId, examId }
  if (subject) params.subject = subject
  return request.get<any, { ranks: any[] }>('/grades/analysis/rank', { params })
}

/** 历次考试趋势 */
export function getExamTrend(classId: string, subject?: string) {
  const params: Record<string, any> = { classId }
  if (subject) params.subject = subject
  return request.get<any, any>('/grades/analysis/trend', { params })
}

/** 某学生历史成绩 */
export function getStudentHistory(studentId: string) {
  return request.get<any, any>(`/grades/analysis/student/${studentId}`)
}

/** 薄弱学生预警 */
export function getWeakStudents(classId: string, examId?: string) {
  const params: Record<string, any> = { classId }
  if (examId) params.examId = examId
  return request.get<any, any>('/grades/analysis/weak', { params })
}

/* ============ 成绩 CRUD API ============ */

/** 考试列表 */
export function listExams(params?: Record<string, any>) {
  return request.get<any, any>('/exams', { params })
}

/** 单个考试详情 */
export function getExam(id: string) {
  return request.get<any, any>('/exams/' + id)
}

/** 成绩列表（支持 classId / studentId / examId / subject 等过滤） */
export function listGrades(params?: Record<string, any>) {
  return request.get<any, any>('/grades', { params })
}

/** 导入预览 */
export function importGradesPreview(payload: { classId: string; filename: string; data: string }) {
  return request.post<any, any>('/grades/import-preview', payload)
}

/** 导入确认提交 */
export function importGradesCommit(payload: {
  classId: string
  examName: string
  examId: string
  subject: string
  date: string
  rows: Array<{ studentId: string; score: number; valid?: boolean }>
}) {
  return request.post<any, any>('/grades/import-commit', payload)
}

/** AI 导入 */
export function importGradesAi(payload: {
  classId: string
  mode: 'image' | 'file'
  data: string
  filename: string
}) {
  return request.post<any, any>('/grades/import-ai', payload)
}

/** 删除单条成绩记录 */
export function removeGrade(id: string) {
  return request.delete<any, void>('/grades/' + id)
}

/* ============ 班级排行榜（积分榜） ============ */

/** 班级积分排行榜（加分/减分/奖励汇总） */
export function getLeaderboard(classId: string) {
  return request.get<any, { classId: string; total: number; items: Array<{ rank: number; studentId: string; name: string; total: number; count: number }> }>('/leaderboard', { params: { classId } })
}

/* ============ 通用列表辅助（Dashboard 等） ============ */

/** 考勤列表 */
export function listAttendances(classId?: string) {
  return request.get<any, any[]>('/attendances', { params: classId ? { classId } : {} })
}
/** 待办列表 */
export function listTodos() {
  return request.get<any, any[]>('/todos')
}
/** 笔记列表 */
export function listNotes() {
  return request.get<any, any[]>('/notes')
}
/** 公告列表 */
export function listNotices() {
  return request.get<any, any[]>('/notices')
}
/** 作业列表 */
export function listHomework() {
  return request.get<any, any[]>('/homework')
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

/* ============ 教师批量导入学生（走 /students 教师专属接口） ============ */
/** 预览解析文件：POST /students/import（返回 { rows, validCount, errorCount }） */
export function previewTeacherStudentsImport(payload: { filename: string; data: string }) {
  return request.post('/students/import', payload)
}
/** AI 识别学生名单：POST /students/import-ai（mode=image 走 OCR，否则走文本提取） */
export function aiTeacherStudentsImport(payload: { mode: string; data: string; filename?: string }) {
  return request.post('/students/import-ai', payload)
}
/** 提交落库：POST /students/import-commit（仅班主任可导入本班学生） */
export function commitTeacherStudentsImport(payload: { classId: string; items: any[] }) {
  return request.post('/students/import-commit', payload)
}
