// 管理端端点（超级管理员 / 学校管理员 / 教师认证 / 导入与通知）
import { HOMEWORK } from '../data.js'

export const adminEndpoints = {
  // 教师认证
  '/auth/password-login': { token: 'mock-teacher-token', user: { id: 'u1', name: '珊珊老师', school: '阳光实验小学' } },
  '/auth/unified-login': { role: 'teacher', token: 'mock-token', user: { id: 'u1', name: '珊珊老师' } },
  '/auth/wechat-login': { needsBind: false, role: 'teacher', token: 'mock-token', user: { id: 'u1', name: '珊珊老师' } },
  '/auth/bind-teacher': { role: 'teacher', token: 'mock-token', user: { id: 'u1', name: '珊珊老师' } },
  '/auth/bind-parent': { role: 'parent', token: 'mock-token', parent: { imUserId: 'p_demo', studentId: 's1', studentName: '张小明', classId: 'c1', studentNo: '2024001' } },

  // 学生导入 / 通知推送
  '/students/import': { success: 0, failed: 0, errors: [] },
  '/notices/push': { pushed: 0, students: [] },
  '/notice-templates': [
    { id: 'nt1', title: '家长会通知', category: '家长会', content: '各位家长好，我校定于[日期]召开家长会，地点为本班教室，请准时参加。' },
    { id: 'nt2', title: '作业提醒', category: '班级通知', content: '请提醒孩子今日完成[科目]作业，并于明日上交。' },
    { id: 'nt3', title: '假期安全提醒', category: '学校通知', content: '假期期间请注意防溺水、交通、消防等安全，合理安排作息。' },
    { id: 'nt4', title: '考试安排', category: '班级通知', content: '下周[日期]进行[科目]单元测试，请协助孩子做好复习。' },
  ],

  // 单个学生家长登录开关
  '/students/s1/toggle-parent-login': { studentId: 's1', parentLoginEnabled: true },

  // 超级管理员
  '/admin/login': { token: 'mock-super-token' },
  '/admin/schools': [{ id: 'sc1', name: '阳光实验小学', code: 'S3A7F2', status: 'active' }],
  '/admin/school-admins': [{ id: 'sa1', username: 'school1', name: '李校长', schoolId: 'sc1' }],
  '/admin/teachers': [],

  // 学校管理员
  '/school-admin/login': { token: 'mock-school-token', admin: { id: 'sa1', name: '李校长', schoolId: 'sc1' } },
  '/school-admin/teachers': [{ id: 'u1', name: '珊珊老师', username: 'teacher1', subject: '语文', phone: '', school: '阳光实验小学', features: [] }],
  '/school-admin/stats': { teacherCount: 1, studentCount: 9, noticeCount: 2 },
  '/school-admin/parent-logins': [{ studentId: 's1', name: '张小明', studentNo: '2024001', classId: 'c1', parentName: '张伟', parentPhone: '13800001001', parentLoginEnabled: true }],
}
