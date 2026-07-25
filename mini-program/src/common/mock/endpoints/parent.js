// 家长端端点（登录/个人/通知/考试/作业）
import { HOMEWORK } from '../data.js'

export const parentEndpoints = {
  '/parent-auth/login': { token: 'mock-parent-token', parent: { imUserId: 'p_demo_zhang', studentId: 's1', studentName: '张小明', classId: 'c1', studentNo: '2024001' } },
  '/parent-auth/me': { imUserId: 'p_demo_zhang', studentId: 's1', studentName: '张小明', classId: 'c1', studentNo: '2024001', kids: [{ studentId: 's1', studentName: '张小明', classId: 'c1' }] },
  '/parent-auth/im-user-sig': { sdkAppId: '', userSig: 'demo-parent-sig' },
  '/parent-auth/notices': [
    { id: 'n1', title: '下周期末考试安排', content: '请各位家长协助孩子做好复习准备，具体时间另行通知。', classId: 'c1', pinned: true, ended: false, createdAt: '2026-07-18' },
    { id: 'n2', title: '暑假安全注意事项', content: '防溺水、防中暑、注意交通安全。', classId: 'c1', pinned: false, ended: false, createdAt: '2026-07-18' },
  ],
  '/parent-auth/exams': {
    exams: [
      {
        examId: 'e1', examName: '期中考试', date: '2026-07-18', term: '2025-2026学年第二学期',
        subjects: [
          { subject: '语文', score: 92, fullScore: 100 },
          { subject: '数学', score: 88, fullScore: 100 },
          { subject: '英语', score: 95, fullScore: 100 },
        ],
        totalScore: '91.7',
      },
      {
        examId: 'e4', examName: '期末模拟', date: '2026-07-18', term: '2025-2026学年第二学期',
        subjects: [
          { subject: '语文', score: 95, fullScore: 100 },
          { subject: '数学', score: 91, fullScore: 100 },
        ],
        totalScore: '93.0',
      },
    ],
    analysis: {
      overallAverage: '91.7',
      bestSubject: '英语', bestAvg: '95.0',
      worstSubject: '数学', worstAvg: '89.5',
      trend: { diff: '1.3', direction: 'up' },
      examCount: 2,
    },
  },
  '/parent-auth/homework': HOMEWORK.filter((h) => h.classId === 'c1'),
}
