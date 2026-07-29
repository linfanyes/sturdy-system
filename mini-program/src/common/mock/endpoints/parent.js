// 家长端端点（登录/个人/通知/考试/作业）
import { HOMEWORK } from '../data.js'

export const parentEndpoints = {
  '/parent-auth/login': { token: 'mock-parent-token', parent: { imUserId: 'p_demo_zhang', studentId: 's1', studentName: '张小明', classId: 'c1', studentNo: '2024001' } },
  '/parent-auth/me': {
    parentName: '家长',
    parentId: 'parent-001',
    studentId: 'stu-1',
    studentName: '小明',
    studentNo: '2024001',
    classId: 'class-a',
    className: '三年级一班',
    kids: [
      { studentId: 'stu-1', studentName: '小明', studentNo: '2024001', classId: 'class-a', className: '三年级一班', nickName: '小明' },
      { studentId: 'stu-2', studentName: '小红', studentNo: '2024002', classId: 'class-b', className: '二年级三班', nickName: '小红' },
    ],
  },
  '/parent-auth/im-user-sig': { sdkAppId: '', userSig: 'demo-parent-sig' },
  '/parent-auth/notices': [
    { id: 'n1', title: '下周期末考试安排', content: '请各位家长协助孩子做好复习准备，具体时间另行通知。', classId: 'c1', pinned: true, ended: false, createdAt: '2026-07-18' },
    { id: 'n2', title: '暑假安全注意事项', content: '防溺水、防中暑、注意交通安全。', classId: 'c1', pinned: false, ended: false, createdAt: '2026-07-18' },
  ],
  '/parent-auth/exams': {
    exams: [
      {
        examId: 'e1', examName: '期中考试', date: '2026-07-18', term: '2025-2026学年第二学期',
        totalScore: 91.7,
        totalFullScore: 100,
        classRank: 8,
        distribution: [],
        analysisNote: '数学较强，语文需加强。',
        subjects: [
          { subject: '语文', score: 92, fullScore: 100, classRank: 12 },
          { subject: '数学', score: 88, fullScore: 100, classRank: 5 },
          { subject: '英语', score: 95, fullScore: 100, classRank: 3 },
        ],
      },
      {
        examId: 'e4', examName: '期末模拟', date: '2026-07-18', term: '2025-2026学年第二学期',
        totalScore: 93.0,
        totalFullScore: 100,
        classRank: 6,
        distribution: [{ label: '90-100', count: 5, pct: 25, isStudent: true }, { label: '80-89', count: 8, pct: 40 }, { label: '70-79', count: 4, pct: 20 }, { label: '60-69', count: 2, pct: 10 }, { label: '<60', count: 1, pct: 5 }],
        analysisNote: '',
        subjects: [
          { subject: '语文', score: 95, fullScore: 100, classRank: 4 },
          { subject: '数学', score: 91, fullScore: 100, classRank: 7 },
        ],
      },
    ],
    analysis: {
      overallAverage: 91.7,
      bestSubject: '英语', bestAvg: 95.0,
      worstSubject: '数学', worstAvg: 89.5,
      trend: { diff: 1.3, direction: 'up' },
      examCount: 2,
    },
  },
  '/parent-auth/homework': HOMEWORK.filter((h) => h.classId === 'c1'),
  '/parent-auth/attendance': {
    total: 8,
    summary: { reading: 3, sport: 2, behavior: 1, homework: 2 },
    recent: [
      { id: 'a1', type: 'reading', date: '2026-07-22', count: 1, note: '' },
      { id: 'a2', type: 'sport', date: '2026-07-22', count: 1, note: '' },
      { id: 'a3', type: 'reading', date: '2026-07-21', count: 1, note: '' },
      { id: 'a4', type: 'homework', date: '2026-07-21', count: 1, note: '' },
    ],
    byMonth: [
      { month: '2026-07', count: 8 },
      { month: '2026-06', count: 5 },
    ],
  },
  '/parent-auth/behavior': {
    total: 8,
    summary: { praise: 5, violation: 1, other: 2 },
    recent: [
      { id: 'b1', date: '2026-07-22', behavior: '课堂表扬', note: '积极回答问题，思路清晰', category: 'praise' },
      { id: 'b2', date: '2026-07-20', behavior: '助人为乐', note: '主动帮助同学打扫卫生', category: 'praise' },
      { id: 'b3', date: '2026-07-18', behavior: '作业优秀', note: '书写工整，全对', category: 'praise' },
      { id: 'b4', date: '2026-07-15', behavior: '违纪', note: '课间追逐打闹', category: 'violation' },
      { id: 'b5', date: '2026-07-12', behavior: '进步奖', note: '数学进步明显', category: 'praise' },
    ],
    byMonth: [
      { month: '2026-07', count: 8 },
      { month: '2026-06', count: 5 },
    ],
  },
  '/parent-auth/schedule': {
    week: [
      { dayOfWeek: 1, items: [
        { period: 1, section: null, subject: '语文', teacher: '王老师', note: '' },
        { period: 2, section: null, subject: '数学', teacher: '李老师', note: '' },
        { period: 3, section: '早读', subject: '英语', teacher: '陈老师', note: '' },
        { period: 4, section: null, subject: '体育', teacher: '刘老师', note: '' },
      ] },
      { dayOfWeek: 2, items: [
        { period: 1, section: null, subject: '数学', teacher: '李老师', note: '' },
        { period: 2, section: null, subject: '科学', teacher: '赵老师', note: '' },
        { period: 5, section: null, subject: '音乐', teacher: '孙老师', note: '' },
      ] },
      { dayOfWeek: 3, items: [
        { period: 1, section: null, subject: '英语', teacher: '陈老师', note: '' },
        { period: 2, section: '早读', subject: '语文', teacher: '王老师', note: '' },
        { period: 3, section: null, subject: '美术', teacher: '周老师', note: '' },
      ] },
      { dayOfWeek: 4, items: [
        { period: 1, section: null, subject: '语文', teacher: '王老师', note: '' },
        { period: 4, section: null, subject: '信息技术', teacher: '吴老师', note: '' },
      ] },
      { dayOfWeek: 5, items: [
        { period: 1, section: null, subject: '数学', teacher: '李老师', note: '' },
        { period: 2, section: null, subject: '班会', teacher: '王老师', note: '' },
        { period: 6, section: '晚自习', subject: '自习', teacher: '', note: '' },
      ] },
    ],
    todayDow: 3,
    upcomingDuty: [
      { date: '2026-07-30', name: '教室值日', type: 'daily' },
      { date: '2026-08-02', name: '包干区清扫', type: 'weekly' },
    ],
  },
  '/parent-auth/communications': {
    total: 3,
    recent: [
      { id: 'pc1', date: '2026-07-19', method: '微信', content: '孩子近期课堂表现积极，请注意保持作息规律。', followUp: '', parentName: '张爸爸', relation: '父亲' },
      { id: 'pc2', date: '2026-07-10', method: '电话', content: '关于运动会报名事宜已与您沟通。', followUp: '已确认报名', parentName: '张爸爸', relation: '父亲' },
      { id: 'pc3', date: '2026-06-28', method: '面谈', content: '期末学情反馈，孩子总体平稳。', followUp: '建议关注阅读习惯', parentName: '张爸爸', relation: '父亲' },
    ],
  },
  'POST /parent-auth/switch-student': (params) => {
    const kids = {
      'stu-1': { studentId: 'stu-1', studentName: '小明', studentNo: '2024001', classId: 'class-a' },
      'stu-2': { studentId: 'stu-2', studentName: '小红', studentNo: '2024002', classId: 'class-b' },
    }
    const target = kids[params.studentId]
    if (!target) return { code: 403, msg: '学生不属于该家长' }
    return {
      token: 'demo-parent-switch-' + params.studentId,
      ...target,
    }
  },
  '/parent-auth/compare-kids': {
    kids: [
      { studentId: 'stu-1', studentName: '小明', classId: 'class-a' },
      { studentId: 'stu-2', studentName: '小红', classId: 'class-b' },
    ],
    exams: [
      {
        examName: '期中考试',
        date: '2026-06-15',
        term: '2026春',
        rows: {
          'stu-1': { totalScore: 302, totalFullScore: 350, classRank: 3, subjects: [{ subject: '语文', score: 88 }, { subject: '数学', score: 95 }] },
          'stu-2': { totalScore: 285, totalFullScore: 350, classRank: 12, subjects: [{ subject: '语文', score: 78 }, { subject: '数学', score: 82 }] },
        },
      },
      {
        examName: '月考',
        date: '2026-05-20',
        term: '2026春',
        rows: {
          'stu-1': { totalScore: 296, totalFullScore: 350, classRank: 5, subjects: [{ subject: '语文', score: 85 }, { subject: '数学', score: 92 }] },
          'stu-2': { totalScore: 278, totalFullScore: 350, classRank: 15, subjects: [{ subject: '语文', score: 76 }, { subject: '数学', score: 80 }] },
        },
      },
    ],
  },
}
