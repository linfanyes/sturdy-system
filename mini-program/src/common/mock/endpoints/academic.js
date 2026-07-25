// 教学核心域 mock 端点（班级/学生/成绩/考试/考勤/课表/作业/获奖/活动/班费/相册/成长等）
import {
  CLASSES, STUDENTS, GRADES, EXAMS, ATTENDANCES, TEACHERS,
  BEHAVIOR_RECORDS, HOMEWORK, AWARD_RECORDS, CLASS_ACTIVITIES,
  DUTY_ROSTERS, CLASS_EXPENSES, CLASS_GALLERIES, MY_GALLERIES,
  NOTES, TODOS, SCHEDULES, NOTICES, IMG_DEMO,
} from '../data.js'

export const academicEndpoints = {
  '/classes': CLASSES,
  '/students': STUDENTS,
  '/grades': GRADES,
  '/exams': EXAMS,
  '/attendances': ATTENDANCES,
  '/teachers': TEACHERS,
  '/behavior-records': BEHAVIOR_RECORDS,
  '/homework': HOMEWORK,
  '/award-records': AWARD_RECORDS,
  '/duty-rosters': DUTY_ROSTERS,
  '/class-activities': CLASS_ACTIVITIES,
  '/class-expenses': CLASS_EXPENSES,
  '/class-galleries': CLASS_GALLERIES,
  '/my-galleries': MY_GALLERIES,
  '/notes': NOTES,
  '/todos': TODOS,
  '/schedules': SCHEDULES,
  '/notices': NOTICES,

  /* ========== 缺失业务实体的模拟数据 ========== */

  // 备份
  '/backups': [
    { id: 'bk1', teacherId: 'u1', label: '手动备份 2026-07-18', type: 'manual', payload: { note: '备份前数据正常' }, createdAt: '2026-07-18T10:30:00' },
    { id: 'bk2', teacherId: 'u1', label: '自动备份 2026-07-22', type: 'auto', payload: { note: '每日自动备份' }, createdAt: '2026-07-22T14:00:00' },
    { id: 'bk3', teacherId: 'u1', label: '期末数据备份', type: 'manual', payload: { note: '期末全量备份' }, createdAt: '2026-07-23T08:00:00' },
  ],

  // 教学资源
  '/resources': [
    { id: 'r1', title: '一年级语文课件-春天的发现', category: '课件', tags: ['语文', '春天'], url: '', image: IMG_DEMO, description: '包含春天的古诗、生字与课堂活动设计', createdAt: '2026-07-15' },
    { id: 'r2', title: '数学口算题卡100题', category: '习题', tags: ['数学', '口算'], url: '', image: '', description: '100道100以内加减法口算题，附答案', createdAt: '2026-07-16' },
    { id: 'r3', title: '英语单词卡片（Unit 3）', category: '课件', tags: ['英语', '单词'], url: '', image: IMG_DEMO, description: 'Unit 3 核心词汇闪卡，含音标与例句', createdAt: '2026-07-17' },
    { id: 'r4', title: '小学科学实验指导手册', category: '资料', tags: ['科学', '实验'], url: '', image: '', description: '适合小学段的家庭小实验指导', createdAt: '2026-07-10' },
    { id: 'r5', title: '三年级阅读练习精选', category: '习题', tags: ['语文', '阅读'], url: '', image: '', description: '三年级课内外阅读理解专项训练', createdAt: '2026-07-12' },
  ],

  // 成长记录
  '/growth-entries': [
    { id: 'grow1', studentId: 's1', studentName: '张小明', type: '学习', title: '本周课堂表现', date: '2026-07-18', content: '本周上课积极发言，语文课主动回答问题，数学需要加强计算练习。' },
    { id: 'grow2', studentId: 's5', studentName: '刘思琪', type: '品德', title: '帮助同学', date: '2026-07-19', content: '帮助同桌完成数学作业，耐心讲解难题，体现了互助精神。' },
    { id: 'grow3', studentId: 's2', studentName: '李小华', type: '特长', title: '书法获奖', date: '2026-07-20', content: '在校书法比赛中获得一等奖，作品将在学校展板展示。' },
    { id: 'grow4', studentId: 's1', studentName: '张小明', type: '荣誉', title: '担任升旗手', date: '2026-07-22', content: '因表现优异，被选为本周升旗仪式旗手。' },
    { id: 'grow5', studentId: 's9', studentName: '周雅婷', type: '学习', title: '英语进步明显', date: '2026-07-21', content: '英语期中考试比上次提高15分，口语表达更加自信。' },
  ],

  // 课堂积分
  '/score-records': [
    { id: 'sr1', classId: 'c1', studentId: 's5', studentName: '刘思琪', delta: 5, reason: '课堂回答问题正确', date: '2026-07-18' },
    { id: 'sr2', classId: 'c1', studentId: 's1', studentName: '张小明', delta: 3, reason: '帮助同学', date: '2026-07-18' },
    { id: 'sr3', classId: 'c1', studentId: 's8', studentName: '孙浩然', delta: 2, reason: '作业书写认真', date: '2026-07-18' },
    { id: 'sr4', classId: 'c1', studentId: 's4', studentName: '赵小刚', delta: 1, reason: '上课遵守纪律', date: '2026-07-18' },
    { id: 'sr5', classId: 'c1', studentId: 's2', studentName: '李小华', delta: 4, reason: '英语口语展示', date: '2026-07-18' },
  ],

  // 小组积分
  '/group-scores': [
    { id: 'gs1', classId: 'c1', name: '第一组（阳光组）', color: '#07c160', points: 85, date: '2026-07-18' },
    { id: 'gs2', classId: 'c1', name: '第二组（星光组）', color: '#409eff', points: 92, date: '2026-07-18' },
    { id: 'gs3', classId: 'c1', name: '第三组（月亮组）', color: '#e6a23c', points: 78, date: '2026-07-18' },
    { id: 'gs4', classId: 'c2', name: 'A组', color: '#07c160', points: 88, date: '2026-07-18' },
    { id: 'gs5', classId: 'c2', name: 'B组', color: '#e06c75', points: 76, date: '2026-07-18' },
  ],

  // 奖励记录
  '/reward-records': [
    { id: 'rw1', classId: 'c1', studentId: 's5', studentName: '刘思琪', type: '免作业卡', points: 50, reason: '课堂表现优异兑换', date: '2026-07-18' },
    { id: 'rw2', classId: 'c1', studentId: 's2', studentName: '李小华', type: '选座特权', points: 30, reason: '英语口语展示兑换', date: '2026-07-18' },
    { id: 'rw3', classId: 'c1', studentId: 's8', studentName: '孙浩然', type: '游戏管理员', points: 20, reason: '作业书写认真兑换', date: '2026-07-18' },
  ],

  // 学生打卡
  '/checkins': [
    { id: 'ck1', classId: 'c1', studentId: 's1', studentName: '张小明', type: 'reading', date: '2026-07-18', count: 1, note: '完成《西游记》15页' },
    { id: 'ck2', classId: 'c1', studentId: 's2', studentName: '李小华', type: 'reading', date: '2026-07-18', count: 1, note: '完成《三字经》诵读' },
    { id: 'ck3', classId: 'c1', studentId: 's3', studentName: '王小芳', type: 'reading', date: '2026-07-18', count: 1, note: '' },
    { id: 'ck4', classId: 'c1', studentId: 's4', studentName: '赵小刚', type: 'sport', date: '2026-07-18', count: 1, note: '跳绳200个' },
    { id: 'ck5', classId: 'c1', studentId: 's5', studentName: '刘思琪', type: 'reading', date: '2026-07-18', count: 1, note: '完成《小王子》25页' },
    { id: 'ck6', classId: 'c1', studentId: 's8', studentName: '孙浩然', type: 'homework', date: '2026-07-18', count: 1, note: '口算全对' },
  ],

  // 课外阅读
  '/reading-logs': [
    { id: 'rl1', classId: 'c1', studentId: 's5', studentName: '刘思琪', bookTitle: '《小王子》', author: '圣埃克苏佩里', pages: 25, minutes: 30, note: '喜欢玫瑰花的情节', date: '2026-07-18' },
    { id: 'rl2', classId: 'c1', studentId: 's1', studentName: '张小明', bookTitle: '《西游记（少儿版）》', author: '吴承恩', pages: 15, minutes: 20, note: '孙悟空最厉害', date: '2026-07-18' },
    { id: 'rl3', classId: 'c1', studentId: 's9', studentName: '周雅婷', bookTitle: '《安徒生童话》', author: '安徒生', pages: 30, minutes: 40, note: '卖火柴的小女孩很感人', date: '2026-07-18' },
    { id: 'rl4', classId: 'c1', studentId: 's2', studentName: '李小华', bookTitle: '《三字经》', author: '佚名', pages: 10, minutes: 15, note: '会背第一段', date: '2026-07-18' },
    { id: 'rl5', classId: 'c2', studentId: 's6', studentName: '陈子轩', bookTitle: '《十万个为什么》', author: '少儿编辑部', pages: 20, minutes: 25, note: '恐龙专题很有趣', date: '2026-07-18' },
  ],

  // 家访记录
  '/home-visits': [
    { id: 'hv1', classId: 'c1', studentId: 's4', studentName: '赵小刚', address: '幸福小区3栋', content: '了解课堂注意力不集中问题，家长表示孩子在家做作业不够专注。', date: '2026-07-15', followUp: '建议减少屏幕时间，增加户外活动', photos: [], status: '已完成' },
    { id: 'hv2', classId: 'c1', studentId: 's5', studentName: '刘思琪', address: '阳光花园5栋', content: '表扬近期突出表现，学生在校表现优异。', date: '2026-07-18', followUp: '建议家长持续鼓励，适当拓展课外阅读', photos: [], status: '已完成' },
  ],

  // 学期管理
  '/semesters': [
    { id: 'sem1', name: '2025-2026学年第一学期', startDate: '2025-09-01', endDate: '2026-01-15', current: false },
    { id: 'sem2', name: '2025-2026学年第二学期', startDate: '2026-02-15', endDate: '2026-07-05', current: true },
  ],

  // 家长联系记录
  '/parent-contacts': [
    { id: 'pc1', classId: 'c1', studentId: 's1', studentName: '张小明', method: '电话', parentName: '张伟', phone: '13800001001', relation: '父亲', wechat: '', content: '告知孩子最近上课表现良好', date: '2026-07-10', followUp: '' },
    { id: 'pc2', classId: 'c1', studentId: 's4', studentName: '赵小刚', method: '微信', parentName: '赵建军', phone: '13800001004', relation: '父亲', wechat: 'zhao_jj', content: '沟通孩子注意力问题，建议家长配合', date: '2026-07-12', followUp: '下周回访' },
    { id: 'pc3', classId: 'c1', studentId: 's5', studentName: '刘思琪', method: '面谈', parentName: '刘洋', phone: '13800001005', relation: '母亲', wechat: '', content: '表扬孩子进步，鼓励继续保持', date: '2026-07-15', followUp: '' },
  ],

  // 生成的试卷
  '/generated/papers': [
    { id: 'gp1', title: '一年级语文期末模拟卷', grade: '一年级', subject: '语文', prompt: '生成一份一年级语文期末模拟卷，含基础、阅读、写话。', content: '# 一年级语文期末模拟卷\n一、看拼音写词语\n二、阅读理解\n三、看图写话', createdAt: '2026-07-20' },
    { id: 'gp2', title: '一年级数学计算专项', grade: '一年级', subject: '数学', prompt: '出20道100以内加减法计算题。', content: '# 一年级数学计算专项\n1. 23+45=  2. 67-28=  3. 50+39=', createdAt: '2026-07-21' },
  ],

  // 生成的教案
  '/generated/lesson-plans': [
    { id: 'gl1', title: '一年级语文《荷叶圆圆》教案', topic: '荷叶圆圆', subject: '语文', grade: '一年级', prompt: '写一份《荷叶圆圆》第一课时教案。', content: '# 《荷叶圆圆》教案\n目标：认识生字，朗读课文。\n过程：导入→初读→精读→拓展', createdAt: '2026-07-19' },
    { id: 'gl2', title: '一年级数学《分类与整理》教案', topic: '分类与整理', subject: '数学', grade: '一年级', prompt: '设计分类与整理的教学活动。', content: '# 《分类与整理》教案\n目标：体验分类过程。\n过程：情境→操作→汇报', createdAt: '2026-07-20' },
  ],

  // 生成的知识点
  '/generated/knowledges': [
    { id: 'gk1', title: '拼音声调规则', grade: '一年级', subject: '语文', textbook: '部编版', term: '上', prompt: '总结拼音四声的标调规则。', content: '# 拼音标调规则\n有a不放过，没a找o e；i u并列标在后。', createdAt: '2026-07-18' },
    { id: 'gk2', title: '20以内进位加法', grade: '一年级', subject: '数学', textbook: '人教版', term: '上', prompt: '讲清“凑十法”。', content: '# 凑十法\n9+5=9+1+4=14', createdAt: '2026-07-19' },
  ],

  // 卷宗检索
  '/generated/queries': [
    { id: 'pq1', keyword: '识字教学', title: '低年级识字教学方法汇编', source: '小学语文教学', year: '2024', abstract: '归类识字、字理识字、游戏识字等策略。', content: '一、归类识字；二、字理识字；三、生活识字', createdAt: '2026-07-17' },
    { id: 'pq2', keyword: '计算能力', title: '低年级计算能力培养', source: '小学数学教育', year: '2025', abstract: '算理理解+口算训练+错题订正。', content: '一、理解算理；二、每日口算；三、错题本', createdAt: '2026-07-18' },
  ],

  // 教案模板
  '/lesson-plan-templates': [
    { id: 'lp1', title: '新授课教案模板', subject: '通用', grade: '通用', lessonType: '新授课', content: '教学目标→教学重点→教学难点→教学过程→板书设计→作业布置', isFavorite: true },
    { id: 'lp2', title: '复习课教案模板', subject: '通用', grade: '通用', lessonType: '复习课', content: '知识梳理→典型例题→巩固练习→小结提升', isFavorite: false },
    { id: 'lp3', title: '语文阅读课教学设计', subject: '语文', grade: '三年级', lessonType: '新授课', content: '导入→初读感知→精读赏析→拓展延伸→总结', isFavorite: true },
  ],

  // 座位表
  '/seat-layouts': [
    { id: 'sl1', classId: 'c1', name: '默认座位', rows: 3, cols: 3, active: true, aisleCols: [1],
      seats: [
        ['s1', 's2', 's3'],
        ['s4', 's5', 's8'],
        ['s9', 's10', 's16'],
      ] },
  ],

  // 荣誉分类
  '/award-categories': [
    { id: 'ac1', name: '学习之星', color: '#e6a23c' },
    { id: 'ac2', name: '文明之星', color: '#07c160' },
    { id: 'ac3', name: '体育之星', color: '#409eff' },
    { id: 'ac4', name: '进步之星', color: '#e06c75' },
  ],

  // 听课记录
  '/lesson-observations': [
    { id: 'lo1', teacherName: '王老师', classId: 'c2', className: '二年级二班', subject: '数学', topic: '认识分数', date: '2026-07-15', strengths: '教学思路清晰，课堂互动好', suggestions: '可增加更多动手操作环节', overallRating: '优秀' },
    { id: 'lo2', teacherName: '陈老师', classId: 'c1', className: '一年级一班', subject: '音乐', topic: '学唱《春天在哪里》', date: '2026-07-18', strengths: '氛围活跃，学生参与度高', suggestions: '节奏练习可增加乐器辅助', overallRating: '良好' },
  ],

  // 工作日志
  '/work-logs': [
    { id: 'wl1', date: '2026-07-18', content: '批改作文，完成单元测试分析，与家长沟通3人次', classCount: 1, homeworkCount: 2, note: '今日事务较多，注意劳逸结合' },
    { id: 'wl2', date: '2026-07-19', content: '准备公开课教案，参加教研组会议', classCount: 1, homeworkCount: 1, note: '' },
    { id: 'wl3', date: '2026-07-22', content: '期末复习安排，整理学生成长档案', classCount: 1, homeworkCount: 3, note: '档案整理进度过半' },
  ],

  // 自习/签到
  '/picker-history': [
    { id: 'ph1', classId: 'c1', type: 'random', result: { name: '张小明' }, date: '2026-07-18' },
    { id: 'ph2', classId: 'c1', type: 'random', result: { name: '刘思琪' }, date: '2026-07-18' },
    { id: 'ph3', classId: 'c1', type: 'quiz', result: { name: '周雅婷' }, date: '2026-07-18' },
  ],

  // 值日排班配置
  '/class-duty-configs': [
    { id: 'dc1', classId: 'c1', duties: ['擦黑板', '扫地', '倒垃圾', '摆桌椅', '关灯'], assignments: { '擦黑板': ['s1', 's5'], '扫地': ['s2', 's8'], '倒垃圾': ['s4'], '摆桌椅': ['s9', 's10'], '关灯': ['s16'] } },
    { id: 'dc2', classId: 'c2', duties: ['擦黑板', '扫地', '倒垃圾', '浇花'], assignments: { '擦黑板': ['s6'], '扫地': ['s7', 's11'], '倒垃圾': ['s12'], '浇花': ['s17'] } },
  ],

  // 消息中心
  '/messages': [
    { id: 'msg1', title: '系统通知', content: '您的班级备份已完成', type: 'system', read: false, createdAt: '2026-07-18' },
    { id: 'msg2', title: '家长留言', content: '张小明家长：老师您好，孩子明天请假一天', type: 'parent', read: false, createdAt: '2026-07-18' },
    { id: 'msg3', title: '系统通知', content: '期末成绩提交截止时间为7月30日', type: 'system', read: true, createdAt: '2026-07-20' },
    { id: 'msg4', title: '📢 学校公告', content: '下周期末考试安排：请各位家长协助孩子做好复习准备', type: 'notice', read: false, createdAt: '2026-07-18' },
    { id: 'msg5', title: '📢 学校公告', content: '暑假安全注意事项：防溺水、防中暑、注意交通安全', type: 'notice', read: true, createdAt: '2026-07-22' },
  ],

  // 通知（教师端通知系统）
  '/notifications': [
    { id: 'nf1', teacherId: 'u1', title: '新公告发布', content: '学校发布了新公告：下周期末考试安排', type: 'notice', read: false, link: '/pages/notice/notice', createdAt: '2026-07-18' },
    { id: 'nf2', teacherId: 'u1', title: '家长留言', content: '张小明家长发送了一条消息，请注意查看', type: 'parent', read: false, link: '/pages/im/im', createdAt: '2026-07-18' },
    { id: 'nf3', teacherId: 'u1', title: '作业批改提醒', content: '您有 5 份语文作业待批改', type: 'homework', read: true, link: '/pages/homework/homework', createdAt: '2026-07-22' },
    { id: 'nf4', teacherId: 'u1', title: '考勤异常', content: '今日赵小刚迟到，请关注', type: 'attendance', read: false, link: '/pages/attendance/attendance', createdAt: '2026-07-18' },
    { id: 'nf5', teacherId: 'u1', title: '成绩录入提醒', content: '期末模拟成绩还未录入完成', type: 'grade', read: true, link: '/pages/grades/grades', createdAt: '2026-07-21' },
  ],

  // 教学日历（函数形式，根据参数返回不同月份数据）
  '/teaching-calendar': (params) => {
    const now = new Date()
    const y = params?.year || now.getFullYear()
    const m = params?.month || now.getMonth() + 1
    const mStr = String(m).padStart(2, '0')
    const daysInMonth = new Date(y, m, 0).getDate()
    const items = [
      { id: 'tc1', title: '语文单元备课', date: `${y}-${mStr}-05`, grade: '一年级', subject: '语文', color: '#e8f1fb', type: 'normal', note: '备课第一单元' },
      { id: 'tc2', title: '期中考试', date: `${y}-${mStr}-10`, grade: '一年级', subject: '语文', color: '#fde8ea', type: 'exam', note: '期中考试安排' },
      { id: 'tc3', title: '教研组会议', date: `${y}-${mStr}-12`, grade: '', subject: '', color: '#fff3e0', type: 'meeting', note: '讨论下学期教学计划' },
      { id: 'tc4', title: '数学公开课', date: `${y}-${mStr}-15`, grade: '一年级', subject: '数学', color: '#e8f9e8', type: 'normal', note: '公开课展示' },
      { id: 'tc5', title: '家长会', date: `${y}-${mStr}-18`, grade: '', subject: '', color: '#fff8e1', type: 'other', note: '一年级家长会' },
      { id: 'tc6', title: '语文单元备课', date: `${y}-${mStr}-22`, grade: '一年级', subject: '语文', color: '#e8f1fb', type: 'normal', note: '备课第二单元' },
      { id: 'tc7', title: '期末复习', date: `${y}-${mStr}-25`, grade: '一年级', subject: '语文', color: '#fde8ea', type: 'normal', note: '期末复习计划' },
      { id: 'tc8', title: '期末考试', date: `${y}-${mStr}-${Math.min(28, daysInMonth)}`, grade: '一年级', subject: '语文', color: '#fde8ea', type: 'exam', note: '期末考试' },
    ]
    return { items, total: items.length }
  },
}
