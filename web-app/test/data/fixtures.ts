/**
 * 测试数据 fixtures：覆盖 4 级角色（super / school_admin / teacher / parent）。
 * 供组件测试、集成测试、全路由冒烟测试复用，即「造好的测试数据」。
 * 所有结构尽量贴合后端响应与组件消费字段。
 */
import type { AuthUser, Role } from '@/types/user'

/* ============ 账号 ============ */
export const mockAccounts: Record<Role, { username: string; password: string; name: string; role: Role }> = {
  teacher: { role: 'teacher', username: 'teacher01', password: 'Teacher@123', name: '王老师' },
  school_admin: { role: 'school_admin', username: 'admin01', password: 'Admin@123', name: '李主任' },
  parent: { role: 'parent', username: 'parent01', password: '123456', name: '张小宝家长' },
  super: { role: 'super', username: 'admin', password: 'admin', name: '超级管理员' },
}

/** 按角色构造 AuthUser（登录后 setAuth 用） */
export function makeAuthUser(role: Role, override: Partial<AuthUser> = {}): AuthUser {
  const base: Record<Role, AuthUser> = {
    super: { id: 'u-super', role: 'super', name: '超级管理员' },
    school_admin: { id: 'u-sa', role: 'school_admin', name: '李主任', schoolId: 's1', schoolName: '阳光小学' },
    teacher: { id: 'u-tea', role: 'teacher', name: '王老师', schoolId: 's1', schoolName: '阳光小学', features: [] },
    parent: { id: 'u-par', role: 'parent', name: '张小宝家长', studentId: 'st1', studentName: '张小宝', classId: 'c1' },
  }
  return { ...base[role], ...override }
}

/* ============ 通用：班级 ============ */
export const classes = [
  { id: 'c1', name: '一年级(1)班', grade: '一年级', headTeacher: '王老师', schoolId: 's1' },
  { id: 'c2', name: '二年级(3)班', grade: '二年级', headTeacher: '陈老师', schoolId: 's1' },
]

/* ============ 超级管理员 ============ */
export const schools = [
  { id: 's1', name: '阳光小学', code: 'YGXX', address: '幸福路 1 号', createdAt: '2025-09-01' },
  { id: 's2', name: '希望中学', code: 'XWZX', address: '希望路 8 号', createdAt: '2025-09-01' },
]

export const schoolAdmins = [
  { id: 'a1', username: 'admin01', name: '李主任', schoolId: 's1', schoolName: '阳光小学', enabled: true },
  { id: 'a2', username: 'admin02', name: '赵主任', schoolId: 's2', schoolName: '希望中学', enabled: false },
]

export const auditLogs = [
  { id: 'l1', action: 'create_school', operator: '超级管理员', target: '阳光小学', time: '2026-07-20 10:00' },
  { id: 'l2', action: 'update_config', operator: '超级管理员', target: 'defaultSubjects', time: '2026-07-21 14:30' },
  { id: 'l3', action: 'delete_school_admin', operator: '超级管理员', target: 'admin02', time: '2026-07-22 09:15' },
]

export const platformConfig = {
  defaultSubjects: ['语文', '数学', '英语'],
  aiApiKey: 'sk-****',
  wechatAppId: 'wx123',
  imEnabled: true,
}

/* ============ 学校管理员 ============ */
export const teachers = [
  { id: 't1', username: 'teacher01', name: '王老师', subject: '语文', schoolId: 's1', phone: '13800000001', enabled: true },
  { id: 't2', username: 'teacher02', name: '陈老师', subject: '数学', schoolId: 's1', phone: '13800000002', enabled: true },
]

export const students = [
  { id: 'st1', name: '张小宝', studentNo: '2024001', classId: 'c1', className: '一年级(1)班', parentName: '张伟', parentPhone: '13900000001' },
  { id: 'st2', name: '李小明', studentNo: '2024002', classId: 'c1', className: '一年级(1)班', parentName: '李强', parentPhone: '13900000002' },
]

export const schoolNotices = [
  { id: 'n1', title: '开学典礼通知', content: '9 月 1 日举行开学典礼', published: true, createdAt: '2026-08-20' },
  { id: 'n2', title: '家长会安排', content: '请家长准时参加', published: false, createdAt: '2026-08-21' },
]

export const schoolAdminDashboard = {
  teacherCount: 2,
  classCount: 2,
  studentCount: 2,
  parentLoginCount: 1,
}

export const searchResults = {
  teachers: [{ id: 't1', name: '王老师', subject: '语文', username: 'teacher01' }],
  classes: [{ id: 'c1', name: '一年级(1)班', grade: '一年级', headTeacher: '王老师' }],
  students: [{ id: 'st1', name: '张小宝', className: '一年级(1)班', studentNo: '2024001' }],
}

/* ============ 教师 ============ */
export const dutyRosters = [
  { id: 'd1', date: '2026-07-25', studentName: '张小宝', task: '擦黑板', classId: 'c1' },
]
export const dutyConfigs = [
  { id: 'dc1', name: '扫地', classId: 'c1' },
]
export const exams = [
  { id: 'e1', name: '期中语文', subject: '语文', classId: 'c1', date: '2026-07-10' },
]
export const grades = [
  { id: 'g1', examId: 'e1', studentId: 'st1', studentName: '张小宝', score: 92, classId: 'c1' },
]
export const homeworks = [
  { id: 'h1', title: '背诵古诗', classId: 'c1', dueDate: '2026-07-30', corrected: false, overdue: true },
  { id: 'h2', title: '数学练习册', classId: 'c1', dueDate: '2026-08-05', corrected: true, overdue: false },
]
export const rewardRecords = [
  { id: 'r1', studentName: '张小宝', type: 'add', points: 5, reason: '助人为乐', classId: 'c1' },
]
export const notifications = [
  { id: 'nt1', title: '系统升级', content: '本周末维护', read: false, createdAt: '2026-07-24' },
  { id: 'nt2', title: '作业截止提醒', content: '请尽快批改', read: true, createdAt: '2026-07-23' },
]
export const messages = [
  { id: 'm1', from: '张小宝家长', content: '老师好', read: false, createdAt: '2026-07-24' },
]
export const imConversations = [
  { id: 'ic1', peerName: '张小宝家长', lastMessage: '老师好', unread: 1 },
]
export const imMessages = [
  { id: 'im1', fromMe: false, content: '老师好', time: '2026-07-24 20:00' },
]
export const classMembers = [
  { id: 'cm1', name: '张小宝', role: '学生', classId: 'c1' },
  { id: 'cm2', name: '王老师', role: '班主任', classId: 'c1' },
]

/* ============ 家长 ============ */
export const parentMe = {
  studentId: 'st1',
  studentName: '张小宝',
  className: '一年级(1)班',
}
export const parentExams = [
  { id: 'pe1', name: '期中语文', subject: '语文', score: 92, classAvg: 85, rank: 3 },
]
export const parentHomework = [
  { id: 'ph1', title: '背诵古诗', dueDate: '2026-07-30', corrected: false, overdue: true },
]
export const parentNotices = [
  { id: 'pn1', title: '家长会通知', content: '请准时参加', createdAt: '2026-08-20' },
]
/** 家长成绩分布（供柱状图 v-html） */
export const parentExamDistribution = [
  { label: '语文', count: 92, pct: 0.92, isStudent: true },
  { label: '数学', count: 88, pct: 0.88, isStudent: false },
]

/* ============ 通用 CRUD 记录（供 CrudTable 测试） ============ */
export const crudSampleRows = [
  { id: 'cr1', title: '样例待办', content: '完成单元测试', done: false, classId: 'c1', createdAt: '2026-07-25' },
  { id: 'cr2', title: '样例笔记', content: '复习知识点', done: true, classId: 'c1', createdAt: '2026-07-24' },
]

/** 通用列表响应包裹（后端 list 接口常返回 {items,total} 或数组） */
export function listResponse(rows: any[]): { items: any[]; total: number } {
  return { items: rows, total: rows.length }
}
