/**
 * 演示模式模拟数据 —— 免后端可预览所有页面结构与交互流程。
 * 由 request.js 中的 setMockMode(true) 启用。
 *
 * 约定：
 * - 班级 c1=一年级一班(珊珊老师) / c2=二年级二班(张老师) / c3=三年级一班(李老师)
 * - 学生共 18 人（c1=9 / c2=5 / c3=4）
 * - 成绩使用 examName 字段（与 grades.vue / ai-exam.vue 匹配），并附带 examId
 */
const todayStr = new Date().toISOString().slice(0, 10)
const todayDow = new Date().getDay() || 7

/* ---------------- 班级 ---------------- */
const CLASSES = [
  { id: 'c1', name: '一年级一班', teacherName: '珊珊老师', studentCount: 9, imGroupId: '' },
  { id: 'c2', name: '二年级二班', teacherName: '张老师', studentCount: 5, imGroupId: '' },
  { id: 'c3', name: '三年级一班', teacherName: '李老师', studentCount: 4, imGroupId: '' },
]

/* ---------------- 学生（共 18 人） ---------------- */
const STUDENTS = [
  // c1 一年级一班（珊珊老师）—— 9 人
  { id: 's1', name: '张小明', classId: 'c1', gender: '男', seatNo: 1, seatRow: 1, seatCol: 1, studentNo: '2024001', birthDate: '2015-03-12', phone: '13800001001', parentName: '张伟', duty: '班长', tags: ['活泼', '运动'] },
  { id: 's2', name: '李小华', classId: 'c1', gender: '女', seatNo: 2, seatRow: 1, seatCol: 2, studentNo: '2024002', birthDate: '2015-07-08', phone: '13800001002', parentName: '李强', tags: ['细心'] },
  { id: 's3', name: '王小芳', classId: 'c1', gender: '女', seatNo: 3, seatRow: 1, seatCol: 3, studentNo: '2024003', birthDate: '2016-01-22', phone: '13800001003', parentName: '王磊', tags: ['进步明显'] },
  { id: 's4', name: '赵小刚', classId: 'c1', gender: '男', seatNo: 4, seatRow: 1, seatCol: 4, studentNo: '2024004', birthDate: '2015-11-05', phone: '13800001004', parentName: '赵建军', tags: ['好动'] },
  { id: 's5', name: '刘思琪', classId: 'c1', gender: '女', seatNo: 5, seatRow: 1, seatCol: 5, studentNo: '2024005', birthDate: '2015-09-18', phone: '13800001005', parentName: '刘洋', duty: '语文课代表', tags: ['优秀', '勤奋'] },
  { id: 's8', name: '孙浩然', classId: 'c1', gender: '男', seatNo: 6, seatRow: 1, seatCol: 6, studentNo: '2024006', birthDate: '2015-04-02', phone: '13800001006', parentName: '孙斌', tags: ['篮球'] },
  { id: 's9', name: '周雅婷', classId: 'c1', gender: '女', seatNo: 7, seatRow: 2, seatCol: 1, studentNo: '2024007', birthDate: '2015-12-11', phone: '13800001007', parentName: '周敏', tags: ['绘画', '文静'] },
  { id: 's10', name: '吴梓涵', classId: 'c1', gender: '男', seatNo: 8, seatRow: 2, seatCol: 2, studentNo: '2024008', birthDate: '2016-02-19', phone: '13800001008', parentName: '吴磊', tags: ['阅读'] },
  { id: 's16', name: '郑欣然', classId: 'c1', gender: '女', seatNo: 9, seatRow: 2, seatCol: 3, studentNo: '2024009', birthDate: '2015-10-30', phone: '13800001009', parentName: '郑华', duty: '英语课代表', tags: ['开朗', '口语好'] },

  // c2 二年级二班（张老师）—— 5 人
  { id: 's6', name: '陈子轩', classId: 'c2', gender: '男', seatNo: 1, seatRow: 1, seatCol: 1, studentNo: '2024011', birthDate: '2014-06-15', phone: '13800002001', parentName: '陈伟', duty: '班长', tags: ['聪明'] },
  { id: 's7', name: '杨一诺', classId: 'c2', gender: '女', seatNo: 2, seatRow: 1, seatCol: 2, studentNo: '2024012', birthDate: '2014-08-30', phone: '13800002002', parentName: '杨帆', tags: ['乖巧'] },
  { id: 's11', name: '郑凯', classId: 'c2', gender: '男', seatNo: 3, seatRow: 1, seatCol: 3, studentNo: '2024013', birthDate: '2014-10-21', phone: '13800002003', parentName: '郑强', tags: ['足球'] },
  { id: 's12', name: '冯雪', classId: 'c2', gender: '女', seatNo: 4, seatRow: 1, seatCol: 4, studentNo: '2024014', birthDate: '2014-05-09', phone: '13800002004', parentName: '冯丽', tags: ['书法'] },
  { id: 's17', name: '黄子涵', classId: 'c2', gender: '男', seatNo: 5, seatRow: 1, seatCol: 5, studentNo: '2024015', birthDate: '2014-03-17', phone: '13800002005', parentName: '黄涛', tags: ['围棋', '专注'] },

  // c3 三年级一班（李老师）—— 4 人
  { id: 's13', name: '何苗', classId: 'c3', gender: '女', seatNo: 1, seatRow: 1, seatCol: 1, studentNo: '2024021', birthDate: '2014-09-03', phone: '13800003001', parentName: '何军', tags: ['活泼'] },
  { id: 's14', name: '许乐', classId: 'c3', gender: '男', seatNo: 2, seatRow: 1, seatCol: 2, studentNo: '2024022', birthDate: '2014-11-27', phone: '13800003002', parentName: '许兵', tags: ['幽默'] },
  { id: 's15', name: '邓欣', classId: 'c3', gender: '女', seatNo: 3, seatRow: 1, seatCol: 3, studentNo: '2024023', birthDate: '2014-03-16', phone: '13800003003', parentName: '邓辉', duty: '数学课代表', tags: ['优秀'] },
  { id: 's18', name: '曹宇轩', classId: 'c3', gender: '男', seatNo: 4, seatRow: 1, seatCol: 4, studentNo: '2024024', birthDate: '2014-07-22', phone: '13800003004', parentName: '曹勇', tags: ['航模', '动手强'] },
]

const idsOf = (cid) => STUDENTS.filter((s) => s.classId === cid).map((s) => s.id)

/* ---------------- 考试 ---------------- */
const EXAMS = [
  { id: 'e1', name: '期中考试', classId: 'c1', term: '2025-2026学年第二学期', date: todayStr, subjects: ['语文', '数学', '英语'], subjectFullScores: { 语文: 100, 数学: 100, 英语: 100 } },
  { id: 'e4', name: '期末模拟', classId: 'c1', term: '2025-2026学年第二学期', date: todayStr, subjects: ['语文', '数学'], subjectFullScores: { 语文: 100, 数学: 100 } },
  { id: 'e2', name: '期中考试', classId: 'c2', term: '2025-2026学年第二学期', date: todayStr, subjects: ['语文', '数学', '英语'], subjectFullScores: { 语文: 100, 数学: 100, 英语: 100 } },
  { id: 'e3', name: '期中考试', classId: 'c3', term: '2025-2026学年第二学期', date: todayStr, subjects: ['语文', '数学', '英语'], subjectFullScores: { 语文: 100, 数学: 100, 英语: 100 } },
]

/* ---------------- 成绩（程序化生成，覆盖全部班级/学生） ---------------- */
// 依据 base 与序号生成 56~100 之间的稳定分数
function makeScores(ids, base, seed = 0) {
  return ids.map((id, i) => {
    const v = base + ((i * 11 + seed * 3) % 23) - 9
    const score = Math.max(56, Math.min(100, v))
    return { studentId: id, score }
  })
}

const GRADES = [
  // 一年级一班 · 期中考试
  { id: 'g1', classId: 'c1', examId: 'e1', examName: '期中考试', subject: '语文', date: todayStr, scores: makeScores(idsOf('c1'), 84) },
  { id: 'g2', classId: 'c1', examId: 'e1', examName: '期中考试', subject: '数学', date: todayStr, scores: makeScores(idsOf('c1'), 81, 1) },
  { id: 'g3', classId: 'c1', examId: 'e1', examName: '期中考试', subject: '英语', date: todayStr, scores: makeScores(idsOf('c1'), 79, 2) },
  // 一年级一班 · 期末模拟
  { id: 'g4', classId: 'c1', examId: 'e4', examName: '期末模拟', subject: '语文', date: todayStr, scores: makeScores(idsOf('c1'), 86, 3) },
  { id: 'g5', classId: 'c1', examId: 'e4', examName: '期末模拟', subject: '数学', date: todayStr, scores: makeScores(idsOf('c1'), 83, 4) },
  // 二年级二班 · 期中考试
  { id: 'g6', classId: 'c2', examId: 'e2', examName: '期中考试', subject: '语文', date: todayStr, scores: makeScores(idsOf('c2'), 82) },
  { id: 'g7', classId: 'c2', examId: 'e2', examName: '期中考试', subject: '数学', date: todayStr, scores: makeScores(idsOf('c2'), 80, 1) },
  { id: 'g8', classId: 'c2', examId: 'e2', examName: '期中考试', subject: '英语', date: todayStr, scores: makeScores(idsOf('c2'), 78, 2) },
  // 三年级一班 · 期中考试
  { id: 'g9', classId: 'c3', examId: 'e3', examName: '期中考试', subject: '语文', date: todayStr, scores: makeScores(idsOf('c3'), 83) },
  { id: 'g10', classId: 'c3', examId: 'e3', examName: '期中考试', subject: '数学', date: todayStr, scores: makeScores(idsOf('c3'), 85, 1) },
  { id: 'g11', classId: 'c3', examId: 'e3', examName: '期中考试', subject: '英语', date: todayStr, scores: makeScores(idsOf('c3'), 80, 2) },
]

/* ---------------- 考勤（每班当日一条，覆盖全班） ---------------- */
const ATTENDANCES = CLASSES.map((c) => ({
  id: 'a-' + c.id,
  classId: c.id,
  date: todayStr,
  records: idsOf(c.id).map((id, i) => ({
    studentId: id,
    status: i % 5 === 2 ? '迟到' : i % 7 === 4 ? '请假' : '出勤',
  })),
}))

/* ---------------- 任课老师（三个班齐全，班主任与 classes 一致） ---------------- */
const TEACHERS = [
  { id: 't1', name: '珊珊老师', position: '班主任', phone: '13800138001', teachings: [{ classId: 'c1', subject: '语文' }, { classId: 'c1', subject: '品德' }], isStarred: true },
  { id: 't2', name: '张老师', position: '班主任', phone: '13800138002', teachings: [{ classId: 'c2', subject: '数学' }], isStarred: true },
  { id: 't3', name: '李老师', position: '班主任', phone: '13800138003', teachings: [{ classId: 'c3', subject: '英语' }], isStarred: false },
  { id: 't4', name: '刘老师', position: '体育教师', phone: '13800138004', teachings: [{ classId: 'c1', subject: '体育' }, { classId: 'c2', subject: '体育' }, { classId: 'c3', subject: '体育' }] },
  { id: 't5', name: '陈老师', position: '音乐教师', phone: '13800138005', teachings: [{ classId: 'c1', subject: '音乐' }] },
  { id: 't6', name: '王老师', position: '语文教师', phone: '13800138006', teachings: [{ classId: 'c2', subject: '语文' }, { classId: 'c3', subject: '语文' }] },
  { id: 't7', name: '赵老师', position: '数学教师', phone: '13800138007', teachings: [{ classId: 'c3', subject: '数学' }] },
  { id: 't8', name: '孙老师', position: '英语教师', phone: '13800138008', teachings: [{ classId: 'c2', subject: '英语' }] },
]

/* ---------------- 其他数据 ---------------- */
const IMG_DEMO = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAKAAAAB4CAIAAAD6wG44AAAB+0lEQVR4nO3cIUtDURyG8XdzKC6Jcwbbmq7YTRr1A6z4CbVaBMOCGPQTWEQMgsgwqiBjFoPFe7er28WH59f+3HLg4dyz3XAa+yeTiKtZ9wI0XwaGMzCcgeEMDGdgOAPDGRjOwHCt4sfDwWKWoV85OP3xkTsYzsBwBoYrOYO/K3jRa/Gm/HnkDoYzMJyB4QwMZ2A4A8MZGM7AcAaGMzCcgeEMDGdgOAPDGRjOwHAGhjMwnIHhDAxnYDgDwxkYzsBwBoYzMJyB4QwMZ2A4A8MZGM7AcAaGMzCcgeEMDGdgOAPDGRjOwHAzXIT2t4aDXD1mPEmrmb2tJEWjd7BVVlvg25dcP+XsLke9rK2k2SgaVVltgZ9f8zFOv5PRW0ZvSUpGVVPnGXzxkOOd3DxNNaqaOgMf9nJ+/3Xilo6qprbAm+0sL+XyMd12NlZLRlVW2xm8vZ6X9+x202qm30lSMqqa2gL7z2cx/NABZ2A4A8MZGM7AcAaGMzCcgeEMDGdgOAPDGRjOwHAGhjMwnIHhDAxnYDgDwxkYzsBwBoYzMJyB4QwMZ2A4A8MZGM7AcAaGMzCcgeEMDGdgOAPDGRjOwHAGhjMwnIHhDAxnYDgDwxkYbobLSIeD+S1D8+IOhjMwnIHhSs5gr+3+79zBcAaGMzCcgeEMDGdgOAPDGRjuE1FLWNj97r9cAAAAAElFTkSuQmCC'

const NOTES = [
  { id: 'n1', title: '《春晓》教学反思', content: '今天讲了孟浩然的《春晓》，大部分学生能当堂背诵。互动环节课堂气氛活跃。', category: '教学反思', favorite: true, pinned: false, images: [], updatedAt: todayStr, createdAt: todayStr },
  { id: 'n2', title: '下周家长会安排', content: '时间：周四下午 4:00\n地点：本班教室\n内容：期中成绩分析 + 暑假安全提醒', category: '班会记录', favorite: false, pinned: true, images: [], updatedAt: todayStr, createdAt: todayStr },
  { id: 'n3', title: '英语公开课教案', content: 'Unit 3 My Friends — 通过角色扮演练习句型，目标：能用英语描述朋友的外貌和性格。', category: '学习资料', favorite: true, pinned: false, images: [IMG_DEMO], updatedAt: todayStr, createdAt: todayStr },
  { id: 'n4', title: '低年级识字教学心得', content: '用字理识字+游戏化复习，学生记字更牢。每天课前 3 分钟"开火车"认读效果好。', category: '教学', favorite: false, pinned: false, images: [], updatedAt: todayStr, createdAt: todayStr },
  { id: 'n5', title: '班级图书角管理计划', content: '设立图书管理员轮岗（每周 2 人），借阅登记本放图书角；每月评选"阅读之星"。', category: '班级', favorite: false, pinned: false, images: [], updatedAt: todayStr, createdAt: todayStr },
]

const TODOS = [
  { id: 't1', title: '批改周末作业', note: '一年级一班语文周末作业', done: false, date: todayStr },
  { id: 't2', title: '准备下周教案', note: '《荷叶圆圆》第一课时', done: false, date: todayStr },
  { id: 't3', title: '填写教学日志', note: '记录今日课堂与作业情况', done: true, date: todayStr },
  { id: 't4', title: '通知家长开会时间', note: '周五下午4点家长会', done: false, date: todayStr },
  { id: 't5', title: '整理学生成长档案', note: '更新3名学生成长记录', done: false, date: todayStr },
  { id: 't6', title: '回复家长群消息', note: '回复6位家长疑问', done: true, date: todayStr },
]

const SCHEDULES = [
  { id: 'sch1', subject: '语文', period: 1, dayOfWeek: todayDow, teacher: '珊珊老师', classId: 'c1', section: '早读', weekType: 'all', note: '' },
  { id: 'sch2', subject: '数学', period: 2, dayOfWeek: todayDow, teacher: '张老师', classId: 'c1', section: null, weekType: 'all', note: '' },
  { id: 'sch3', subject: '英语', period: 3, dayOfWeek: todayDow, teacher: '李老师', classId: 'c1', section: null, weekType: 'all', note: '' },
  { id: 'sch4', subject: '体育', period: 4, dayOfWeek: todayDow, teacher: '刘老师', classId: 'c1', section: null, weekType: 'all', note: '' },
  { id: 'sch5', subject: '音乐', period: 5, dayOfWeek: todayDow, teacher: '陈老师', classId: 'c1', section: null, weekType: 'all', note: '' },
  { id: 'sch6', subject: '班会', period: 6, dayOfWeek: todayDow, teacher: '珊珊老师', classId: 'c1', section: null, weekType: 'all', note: '' },
]

const NOTICES = [
  { id: 'nc1', classId: 'c1', title: '下周期末考试安排', content: '请各位家长协助孩子做好复习准备，具体时间另行通知。', pinned: true, ended: false, endedAt: null },
  { id: 'nc2', classId: 'c1', title: '暑假安全注意事项', content: '防溺水、防中暑、注意交通安全。', pinned: false, ended: false, endedAt: null },
]

const BEHAVIOR_RECORDS = [
  { id: 'b1', studentId: 's1', studentName: '张小明', behavior: '积极发言', date: todayStr, note: '主动回答了两个问题，思路清晰' },
  { id: 'b2', studentId: 's5', studentName: '刘思琪', behavior: '帮助同学', date: todayStr, note: '帮助同桌完成课堂练习' },
  { id: 'b3', studentId: 's4', studentName: '赵小刚', behavior: '走神', date: todayStr, note: '上课看窗外' },
  { id: 'b4', studentId: 's6', studentName: '陈子轩', behavior: '积极思考', date: todayStr, note: '提出了一个有深度的问题' },
  { id: 'b5', studentId: 's13', studentName: '何苗', behavior: '乐于助人', date: todayStr, note: '主动帮同学整理课桌' },
  { id: 'b6', studentId: 's15', studentName: '邓欣', behavior: '作业工整', date: todayStr, note: '数学作业书写规范、正确率高' },
]

/* ---------------- 作业 ---------------- */
const HOMEWORK = [
  // c1 一年级一班
  { id: 'hw1', classId: 'c1', subject: '语文', title: '抄写生字', content: '课文第12课生字，每个写3遍，组词1个。', startDate: todayStr, deadline: todayStr, status: '待批改' },
  { id: 'hw2', classId: 'c1', subject: '数学', title: '口算练习', content: '完成《口算天天练》第35页。', startDate: todayStr, deadline: todayStr, status: '已批改' },
  { id: 'hw3', classId: 'c1', subject: '英语', title: '朗读打卡', content: '跟读 Unit 3 课文 3 遍，录制音频发班级群。', startDate: todayStr, deadline: todayStr, status: '已发还' },
  { id: 'hw4', classId: 'c1', subject: '语文', title: '背诵古诗', content: '背诵《静夜思》，明天课前提问。', startDate: todayStr, deadline: todayStr, status: '待批改' },
  // c2 二年级二班
  { id: 'hw5', classId: 'c2', subject: '语文', title: '背诵课文', content: '背诵《秋天的雨》第三自然段，家长签字。', startDate: todayStr, deadline: todayStr, status: '待批改' },
  { id: 'hw6', classId: 'c2', subject: '数学', title: '应用题练习', content: '完成课本第68页第1-8题，写在作业本上。', startDate: todayStr, deadline: todayStr, status: '已批改' },
  { id: 'hw7', classId: 'c2', subject: '科学', title: '观察日记', content: '观察一种植物的生长情况，写一篇100字观察日记。', startDate: todayStr, deadline: todayStr, status: '待批改' },
  // c3 三年级一班
  { id: 'hw8', classId: 'c3', subject: '语文', title: '作文：我的暑假计划', content: '写一篇400字作文《我的暑假计划》，要求有开头、正文、结尾。', startDate: todayStr, deadline: todayStr, status: '已批改' },
  { id: 'hw9', classId: 'c3', subject: '数学', title: '练习册第六单元', content: '完成《数学练习册》第六单元全部，含思维拓展题。', startDate: todayStr, deadline: todayStr, status: '待批改' },
  { id: 'hw10', classId: 'c3', subject: '英语', title: '单词听写准备', content: '复习 Unit 4 单词表，准备下周一听写。', startDate: todayStr, deadline: todayStr, status: '已发还' },
]

/* ---------------- 获奖记录 ---------------- */
const AWARD_RECORDS = [
  { id: 'aw1', name: '校级三好学生', issuer: '阳光实验小学', date: todayStr, level: '校级', image: '', tags: ['综合', '荣誉'], note: '学习成绩优异，品德表现突出', ratingScore: 95 },
  { id: 'aw2', name: '绘画比赛一等奖', issuer: '区教育局', date: todayStr, level: '区级', image: '', tags: ['美术', '竞赛'], note: '《春天的校园》获区级少儿绘画一等奖', ratingScore: 92 },
  { id: 'aw3', name: '优秀班干部', issuer: '阳光实验小学', date: todayStr, level: '校级', image: '', tags: ['班务', '管理'], note: '担任班长期间班级纪律显著提升', ratingScore: 90 },
  { id: 'aw4', name: '书法比赛二等奖', issuer: '市书法协会', date: todayStr, level: '市级', image: '', tags: ['书法', '竞赛'], note: '作品获市少儿书法大赛二等奖', ratingScore: 88 },
  { id: 'aw5', name: '数学竞赛一等奖', issuer: '区教育局', date: todayStr, level: '区级', image: '', tags: ['数学', '竞赛'], note: '区小学生数学思维竞赛个人一等奖', ratingScore: 96 },
  { id: 'aw6', name: '科技创新奖', issuer: '市科协', date: todayStr, level: '市级', image: '', tags: ['科技', '创新'], note: '航模制作项目获市青少年科技创新大赛优秀奖', ratingScore: 90 },
  { id: 'aw7', name: '阅读之星', issuer: '阳光实验小学', date: todayStr, level: '校级', image: '', tags: ['阅读', '习惯'], note: '本学期课外阅读量全校第一', ratingScore: 88 },
  { id: 'aw8', name: '文明礼仪标兵', issuer: '阳光实验小学', date: todayStr, level: '校级', image: '', tags: ['品德'], note: '日常行为规范表现突出', ratingScore: 85 },
]

/* ---------------- 班级活动 ---------------- */
const CLASS_ACTIVITIES = [
  { id: 'ca1', classId: 'c1', title: '春游动物园', date: todayStr, description: '组织学生参观动物园，认识各种动物习性，培养观察能力。', photos: [] },
  { id: 'ca2', classId: 'c1', title: '六一儿童节联欢', date: todayStr, description: '班级联欢会，学生表演节目（唱歌/舞蹈/朗诵），发放小礼物。', photos: [] },
  { id: 'ca3', classId: 'c2', title: '参观科技馆', date: todayStr, description: '参观市科技馆，体验互动展项，激发科学兴趣。', photos: [] },
  { id: 'ca4', classId: 'c2', title: '班级读书会', date: todayStr, description: '每人分享一本喜欢的书，评选「最佳图书推荐」。', photos: [] },
  { id: 'ca5', classId: 'c3', title: '运动会', date: todayStr, description: '校运动会，班级参加接力跑、跳绳、拔河等项目。', photos: [] },
  { id: 'ca6', classId: 'c3', title: '植树节活动', date: todayStr, description: '在校园种植区种下10棵小树苗，学习环保知识。', photos: [] },
]

/* ---------------- 轮值表 ---------------- */
const DUTY_ROSTERS = [
  { id: 'dr1', classId: 'c1', name: '第20周值日表', type: '值日', assignments: [
    { date: todayStr, persons: ['张小明', '李小华', '王小芳'] },
    { date: todayStr, persons: ['赵小刚', '刘思琪', '孙浩然'] },
    { date: todayStr, persons: ['周雅婷', '吴梓涵', '郑欣然'] },
  ] },
  { id: 'dr2', classId: 'c2', name: '第20周值日表', type: '值日', assignments: [
    { date: todayStr, persons: ['陈子轩', '杨一诺'] },
    { date: todayStr, persons: ['郑凯', '冯雪'] },
    { date: todayStr, persons: ['黄子涵', '陈子轩'] },
  ] },
  { id: 'dr3', classId: 'c3', name: '第20周值日表', type: '值日', assignments: [
    { date: todayStr, persons: ['何苗', '许乐'] },
    { date: todayStr, persons: ['邓欣', '曹宇轩'] },
  ] },
]

/* ---------------- 班费 ---------------- */
const CLASS_EXPENSES = [
  { id: 'ce1', classId: 'c1', type: '收入', category: '班费收取', amount: 450, handler: '珊珊老师', date: todayStr, description: '本学期班费，每人50元，共9人。' },
  { id: 'ce2', classId: 'c1', type: '支出', category: '教学用品', amount: -68, handler: '珊珊老师', date: todayStr, description: '购买拼音卡片、识字挂图。' },
  { id: 'ce3', classId: 'c1', type: '支出', category: '活动经费', amount: -120, handler: '珊珊老师', date: todayStr, description: '六一儿童节联欢零食及小礼物。' },
  { id: 'ce4', classId: 'c2', type: '收入', category: '班费收取', amount: 250, handler: '张老师', date: todayStr, description: '本学期班费，每人50元，共5人。' },
  { id: 'ce5', classId: 'c2', type: '支出', category: '图书购置', amount: -95, handler: '张老师', date: todayStr, description: '班级图书角新增绘本12册。' },
  { id: 'ce6', classId: 'c2', type: '支出', category: '教学用品', amount: -35, handler: '张老师', date: todayStr, description: '课堂奖励贴纸、印章。' },
  { id: 'ce7', classId: 'c3', type: '收入', category: '班费收取', amount: 200, handler: '李老师', date: todayStr, description: '本学期班费，每人50元，共4人。' },
  { id: 'ce8', classId: 'c3', type: '支出', category: '竞赛费用', amount: -80, handler: '李老师', date: todayStr, description: '数学竞赛报名及资料费。' },
  { id: 'ce9', classId: 'c3', type: '支出', category: '活动经费', amount: -60, handler: '李老师', date: todayStr, description: '植树节树苗及工具费用。' },
]

/* ---------------- 班级相册 ---------------- */
const CLASS_GALLERIES = [
  { id: 'cg1', classId: 'c1', title: '春游动物园', date: todayStr, description: '孩子们与长颈鹿、大熊猫的合影，开心的一天！', photos: [] },
  { id: 'cg2', classId: 'c1', title: '课堂精彩瞬间', date: todayStr, description: '语文课上积极举手发言、小组讨论的热烈场景。', photos: [] },
  { id: 'cg3', classId: 'c2', title: '运动会风采', date: todayStr, description: '接力跑比赛中同学们奋力冲刺、啦啦队加油助威。', photos: [] },
  { id: 'cg4', classId: 'c2', title: '书法作品展', date: todayStr, description: '班级硬笔书法作品展示，端正秀丽，各有特色。', photos: [] },
  { id: 'cg5', classId: 'c3', title: '数学竞赛留影', date: todayStr, description: '赛后获奖同学合影，展现拼搏精神。', photos: [] },
  { id: 'cg6', classId: 'c3', title: '班级黑板报', date: todayStr, description: '本期主题「保护环境从我做起」黑板报展示。', photos: [] },
]

/* ---------------- 我的相册 ---------------- */
const MY_GALLERIES = [
  { id: 'mg1', title: '风景', date: todayStr, description: '旅行与户外风景', photos: [] },
  { id: 'mg2', title: '美食', date: todayStr, description: '日常美食记录', photos: [] },
  { id: 'mg3', title: '教学', date: todayStr, description: '教学素材与记录', photos: [] },
]

/* ---------------- AI 生成结果占位（POST 返回含 id） ---------------- */
const GEN_IMAGE_RESULT = { imageUrl: '', prompt: '', model: '' }
const GEN_VIDEO_RESULT = { videoUrl: '', prompt: '', model: '' }

const MOCK = {
  '/classes': CLASSES,
  '/students': STUDENTS,
  '/notes': NOTES,
  '/grades': GRADES,
  '/exams': EXAMS,
  '/todos': TODOS,
  '/schedules': SCHEDULES,
  '/notices': NOTICES,
  '/teachers': TEACHERS,
  '/attendances': ATTENDANCES,
  '/behavior-records': BEHAVIOR_RECORDS,
  '/config/public': { defaultSubjects: ['语文', '数学', '英语', '科学', '道德与法治', '体育', '音乐', '美术', '信息科技'] },
  '/users/me': { id: 'u1', name: '珊珊老师', school: '阳光实验小学', subjects: ['语文', '品德'] },
  '/config/ai': { id: 'ai_demo', teacherId: 'u1', baseUrl: 'https://api.openai.com/v1', apiKey: '', textModel: 'gpt-4o-mini', visionModel: 'gpt-4o', imageModel: 'dall-e-3', videoModel: 'none', temperature: 0.7, aiName: '小林子', systemPrompt: '你是一位耐心、专业的小学教师助手。', resourceModels: { chat: 'gpt-4o-mini', 'exam-analysis': 'gpt-4o' } },
  '/config/app': [{ key: '版本', value: '1.0.0 (demo)' }, { key: '环境', value: '演示模式' }],
  '/duty-rosters': DUTY_ROSTERS,
  '/class-activities': CLASS_ACTIVITIES,
  '/class-expenses': CLASS_EXPENSES,
  '/award-records': AWARD_RECORDS,
  '/homework': HOMEWORK,
  '/class-galleries': CLASS_GALLERIES,
  '/my-galleries': MY_GALLERIES,
  '/ai/gen-image': GEN_IMAGE_RESULT,
  '/ai/gen-video': GEN_VIDEO_RESULT,
  '/ai/parse-file': { text: '这是演示模式下从文件解析出的模拟文本内容。在实际环境中，系统会通过 AI 服务解析 PDF 或识别图片中的文字。' },
  '/ai/asr': { text: '（演示模式）语音识别结果——在实际环境中会调用 AI 语音识别服务返回文字。' },
  '/ai/ocr': { text: '（演示模式）图片文字识别结果——在实际环境中会调用 AI OCR 服务识别图片中的文字内容。' },
  '/ai/chat-sync': { content: '（演示模式）【互动问答】\nQ：什么是小数？\nA：小数由整数部分、小数点和小数部分组成，用来表示不到 1 个整体或比 1 大的非整数。\n【课堂讨论题】\n1. 生活中哪些地方会用到小数？\n【随堂小测】\n1. 0.5 + 0.3 = （0.8）\n2. 比较大小：0.7 ○ 0.69（填 >）' },
  '/ai/analyze-exam': { content: '（演示模式）【考试成绩分析报告】\n\n一、总体评价\n本次考试整体表现良好，语文和英语成绩优异，数学略有薄弱。\n\n二、学科亮点与薄弱点\n· 英语：均分最高，学生整体掌握扎实\n· 语文：高分段明显，阅读写作能力强\n· 数学：部分学生在计算与解决问题上需加强，及格率偏低\n\n三、改进建议\n1. 数学可增加每日口算练习\n2. 语文继续保持阅读量' },
  '/ai/diagnose': { content: '（演示模式）【学情诊断报告】\n\n一、学业趋势\n该生成绩整体呈上升趋势，最近一次考试较上次有明显进步。\n\n二、优势与薄弱\n· 优势学科：英语（持续高分，语言表达能力强）\n· 薄弱学科：数学（计算速度需提升）\n\n三、提升建议\n1. 每日安排 15 分钟口算练习\n2. 周末完成 2-3 道应用题训练\n3. 鼓励多阅读英语课外绘本' },
  '/security/msg-check': { pass: true },
  '/security/img-check': { pass: true },
  '/im/user-sig': { sdkAppId: '', userSig: 'demo-user-sig' },
  '/im/parents': [
    { imUserId: 'p_demo_zhang', studentId: 's1', studentName: '张小明', classId: 'c1', parentName: '张伟', relation: '爸爸', phone: '13800001001', wechat: '' },
    { imUserId: 'p_demo_li', studentId: 's2', studentName: '李小华', classId: 'c1', parentName: '李强', relation: '爸爸', phone: '13800001002', wechat: '' },
    { imUserId: 'p_demo_wang', studentId: 's3', studentName: '王小芳', classId: 'c1', parentName: '王磊', relation: '爸爸', phone: '13800001003', wechat: '' },
  ],
  '/parent-auth/login': { token: 'mock-parent-token', parent: { imUserId: 'p_demo_zhang', studentId: 's1', studentName: '张小明', classId: 'c1', studentNo: '2024001' } },
  '/parent-auth/me': { imUserId: 'p_demo_zhang', studentId: 's1', studentName: '张小明', classId: 'c1', studentNo: '2024001', kids: [{ studentId: 's1', studentName: '张小明', classId: 'c1' }] },
  '/parent-auth/im-user-sig': { sdkAppId: '', userSig: 'demo-parent-sig' },
  '/parent-auth/notices': [
    { id: 'n1', title: '下周期末考试安排', content: '请各位家长协助孩子做好复习准备，具体时间另行通知。', classId: 'c1', pinned: true, ended: false, createdAt: todayStr },
    { id: 'n2', title: '暑假安全注意事项', content: '防溺水、防中暑、注意交通安全。', classId: 'c1', pinned: false, ended: false, createdAt: todayStr },
  ],
  '/parent-auth/exams': {
    exams: [
      {
        examId: 'e1', examName: '期中考试', date: todayStr, term: '2025-2026学年第二学期',
        subjects: [
          { subject: '语文', score: 92, fullScore: 100 },
          { subject: '数学', score: 88, fullScore: 100 },
          { subject: '英语', score: 95, fullScore: 100 },
        ],
        totalScore: '91.7',
      },
      {
        examId: 'e4', examName: '期末模拟', date: todayStr, term: '2025-2026学年第二学期',
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
  '/parent-auth/homework': HOMEWORK.filter(h => h.classId === 'c1'),
  '/students/import': { success: 0, failed: 0, errors: [] },
  '/notices/push': { pushed: 0, students: [] },
  '/notice-templates': [
    { id: 'nt1', title: '家长会通知', category: '家长会', content: '各位家长好，我校定于[日期]召开家长会，地点为本班教室，请准时参加。' },
    { id: 'nt2', title: '作业提醒', category: '班级通知', content: '请提醒孩子今日完成[科目]作业，并于明日上交。' },
    { id: 'nt3', title: '假期安全提醒', category: '学校通知', content: '假期期间请注意防溺水、交通、消防等安全，合理安排作息。' },
    { id: 'nt4', title: '考试安排', category: '班级通知', content: '下周[日期]进行[科目]单元测试，请协助孩子做好复习。' },
  ],
  '/admin/login': { token: 'mock-super-token' },
  '/admin/schools': [{ id: 'sc1', name: '阳光实验小学', code: 'S3A7F2', status: 'active' }],
  '/admin/school-admins': [{ id: 'sa1', username: 'school1', name: '李校长', schoolId: 'sc1' }],
  '/admin/teachers': [],
  '/school-admin/login': { token: 'mock-school-token', admin: { id: 'sa1', name: '李校长', schoolId: 'sc1' } },
  '/school-admin/teachers': [{ id: 'u1', name: '珊珊老师', username: 'teacher1', subject: '语文', phone: '', school: '阳光实验小学', features: [] }],
  '/school-admin/stats': { teacherCount: 1, studentCount: 9, noticeCount: 2 },
  '/school-admin/parent-logins': [{ studentId: 's1', name: '张小明', studentNo: '2024001', classId: 'c1', parentName: '张伟', parentPhone: '13800001001', parentLoginEnabled: true }],
  '/auth/password-login': { token: 'mock-teacher-token', user: { id: 'u1', name: '珊珊老师', school: '阳光实验小学' } },
  '/auth/unified-login': { role: 'teacher', token: 'mock-token', user: { id: 'u1', name: '珊珊老师' } },
  '/auth/wechat-login': { needsBind: false, role: 'teacher', token: 'mock-token', user: { id: 'u1', name: '珊珊老师' } },
  '/auth/bind-teacher': { role: 'teacher', token: 'mock-token', user: { id: 'u1', name: '珊珊老师' } },
  '/auth/bind-parent': { role: 'parent', token: 'mock-token', parent: { imUserId:'p_demo', studentId:'s1', studentName:'张小明', classId:'c1', studentNo:'2024001' } },
  '/students/s1/toggle-parent-login': { studentId: 's1', parentLoginEnabled: true },

  /* ========== 新增：缺失的业务实体 ========== */

  // 备份（字段与 backup_snapshots 实体一致：label/payload/type；真实路由 /backups）
  '/backups': [
    { id: 'bk1', teacherId: 'u1', label: '手动备份 2026-07-18', type: 'manual', payload: { note: '备份前数据正常' }, createdAt: '2026-07-18T10:30:00' },
    { id: 'bk2', teacherId: 'u1', label: '自动备份 2026-07-22', type: 'auto', payload: { note: '每日自动备份' }, createdAt: '2026-07-22T14:00:00' },
    { id: 'bk3', teacherId: 'u1', label: '期末数据备份', type: 'manual', payload: { note: '期末全量备份' }, createdAt: '2026-07-23T08:00:00' },
  ],

  // 教学资源（字段与 resources 实体一致：description/image/tags/url；真实路由 /resources）
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

  // 课堂积分（字段与 score_records 实体一致：delta；真实路由 /score-records）
  '/score-records': [
    { id: 'sr1', classId: 'c1', studentId: 's5', studentName: '刘思琪', delta: 5, reason: '课堂回答问题正确', date: todayStr },
    { id: 'sr2', classId: 'c1', studentId: 's1', studentName: '张小明', delta: 3, reason: '帮助同学', date: todayStr },
    { id: 'sr3', classId: 'c1', studentId: 's8', studentName: '孙浩然', delta: 2, reason: '作业书写认真', date: todayStr },
    { id: 'sr4', classId: 'c1', studentId: 's4', studentName: '赵小刚', delta: 1, reason: '上课遵守纪律', date: todayStr },
    { id: 'sr5', classId: 'c1', studentId: 's2', studentName: '李小华', delta: 4, reason: '英语口语展示', date: todayStr },
  ],

  // 小组积分（字段与 group_scores 实体一致：color/name/points；真实路由 /group-scores）
  '/group-scores': [
    { id: 'gs1', classId: 'c1', name: '第一组（阳光组）', color: '#07c160', points: 85, date: todayStr },
    { id: 'gs2', classId: 'c1', name: '第二组（星光组）', color: '#409eff', points: 92, date: todayStr },
    { id: 'gs3', classId: 'c1', name: '第三组（月亮组）', color: '#e6a23c', points: 78, date: todayStr },
    { id: 'gs4', classId: 'c2', name: 'A组', color: '#07c160', points: 88, date: todayStr },
    { id: 'gs5', classId: 'c2', name: 'B组', color: '#e06c75', points: 76, date: todayStr },
  ],

  // 奖励记录（字段与 reward_records 实体一致：type/points/reason；真实路由 /reward-records）
  '/reward-records': [
    { id: 'rw1', classId: 'c1', studentId: 's5', studentName: '刘思琪', type: '免作业卡', points: 50, reason: '课堂表现优异兑换', date: todayStr },
    { id: 'rw2', classId: 'c1', studentId: 's2', studentName: '李小华', type: '选座特权', points: 30, reason: '英语口语展示兑换', date: todayStr },
    { id: 'rw3', classId: 'c1', studentId: 's8', studentName: '孙浩然', type: '游戏管理员', points: 20, reason: '作业书写认真兑换', date: todayStr },
  ],

  // 学生打卡
  // 学生打卡（字段与 checkins 实体一致：studentId/studentName/type/date/count/note；真实路由 /checkins）
  '/checkins': [
    { id: 'ck1', classId: 'c1', studentId: 's1', studentName: '张小明', type: 'reading', date: todayStr, count: 1, note: '完成《西游记》15页' },
    { id: 'ck2', classId: 'c1', studentId: 's2', studentName: '李小华', type: 'reading', date: todayStr, count: 1, note: '完成《三字经》诵读' },
    { id: 'ck3', classId: 'c1', studentId: 's3', studentName: '王小芳', type: 'reading', date: todayStr, count: 1, note: '' },
    { id: 'ck4', classId: 'c1', studentId: 's4', studentName: '赵小刚', type: 'sport', date: todayStr, count: 1, note: '跳绳200个' },
    { id: 'ck5', classId: 'c1', studentId: 's5', studentName: '刘思琪', type: 'reading', date: todayStr, count: 1, note: '完成《小王子》25页' },
    { id: 'ck6', classId: 'c1', studentId: 's8', studentName: '孙浩然', type: 'homework', date: todayStr, count: 1, note: '口算全对' },
  ],

  // 课外阅读（字段与 reading_logs 实体一致：bookTitle/author/minutes/note；真实路由 /reading-logs）
  '/reading-logs': [
    { id: 'rl1', classId: 'c1', studentId: 's5', studentName: '刘思琪', bookTitle: '《小王子》', author: '圣埃克苏佩里', pages: 25, minutes: 30, note: '喜欢玫瑰花的情节', date: todayStr },
    { id: 'rl2', classId: 'c1', studentId: 's1', studentName: '张小明', bookTitle: '《西游记（少儿版）》', author: '吴承恩', pages: 15, minutes: 20, note: '孙悟空最厉害', date: todayStr },
    { id: 'rl3', classId: 'c1', studentId: 's9', studentName: '周雅婷', bookTitle: '《安徒生童话》', author: '安徒生', pages: 30, minutes: 40, note: '卖火柴的小女孩很感人', date: todayStr },
    { id: 'rl4', classId: 'c1', studentId: 's2', studentName: '李小华', bookTitle: '《三字经》', author: '佚名', pages: 10, minutes: 15, note: '会背第一段', date: todayStr },
    { id: 'rl5', classId: 'c2', studentId: 's6', studentName: '陈子轩', bookTitle: '《十万个为什么》', author: '少儿编辑部', pages: 20, minutes: 25, note: '恐龙专题很有趣', date: todayStr },
  ],

  // 家访记录（字段与 home_visits 实体一致：address/followUp/photos/status；真实路由 /home-visits）
  '/home-visits': [
    { id: 'hv1', classId: 'c1', studentId: 's4', studentName: '赵小刚', address: '幸福小区3栋', content: '了解课堂注意力不集中问题，家长表示孩子在家做作业不够专注。', date: '2026-07-15', followUp: '建议减少屏幕时间，增加户外活动', photos: [], status: '已完成' },
    { id: 'hv2', classId: 'c1', studentId: 's5', studentName: '刘思琪', address: '阳光花园5栋', content: '表扬近期突出表现，学生在校表现优异。', date: '2026-07-18', followUp: '建议家长持续鼓励，适当拓展课外阅读', photos: [], status: '已完成' },
  ],

  // 学期管理（字段与 semesters 实体一致：current；真实路由 /semesters）
  '/semesters': [
    { id: 'sem1', name: '2025-2026学年第一学期', startDate: '2025-09-01', endDate: '2026-01-15', current: false },
    { id: 'sem2', name: '2025-2026学年第二学期', startDate: '2026-02-15', endDate: '2026-07-05', current: true },
  ],

  // 家长联系记录（字段与 parent_contacts 实体一致：method/parentName/phone/relation/wechat/followUp；真实路由 /parent-contacts）
  '/parent-contacts': [
    { id: 'pc1', classId: 'c1', studentId: 's1', studentName: '张小明', method: '电话', parentName: '张伟', phone: '13800001001', relation: '父亲', wechat: '', content: '告知孩子最近上课表现良好', date: '2026-07-10', followUp: '' },
    { id: 'pc2', classId: 'c1', studentId: 's4', studentName: '赵小刚', method: '微信', parentName: '赵建军', phone: '13800001004', relation: '父亲', wechat: 'zhao_jj', content: '沟通孩子注意力问题，建议家长配合', date: '2026-07-12', followUp: '下周回访' },
    { id: 'pc3', classId: 'c1', studentId: 's5', studentName: '刘思琪', method: '面谈', parentName: '刘洋', phone: '13800001005', relation: '母亲', wechat: '', content: '表扬孩子进步，鼓励继续保持', date: '2026-07-15', followUp: '' },
  ],

  // 生成的试卷（字段与 generated_papers 实体一致：title/grade/subject/prompt/content；真实路由 /generated/papers）
  '/generated/papers': [
    { id: 'gp1', title: '一年级语文期末模拟卷', grade: '一年级', subject: '语文', prompt: '生成一份一年级语文期末模拟卷，含基础、阅读、写话。', content: '# 一年级语文期末模拟卷\n一、看拼音写词语\n二、阅读理解\n三、看图写话', createdAt: '2026-07-20' },
    { id: 'gp2', title: '一年级数学计算专项', grade: '一年级', subject: '数学', prompt: '出20道100以内加减法计算题。', content: '# 一年级数学计算专项\n1. 23+45=  2. 67-28=  3. 50+39=', createdAt: '2026-07-21' },
  ],

  // 生成的教案（字段与 generated_lesson_plans 实体一致；真实路由 /generated/lesson-plans）
  '/generated/lesson-plans': [
    { id: 'gl1', title: '一年级语文《荷叶圆圆》教案', topic: '荷叶圆圆', subject: '语文', grade: '一年级', prompt: '写一份《荷叶圆圆》第一课时教案。', content: '# 《荷叶圆圆》教案\n目标：认识生字，朗读课文。\n过程：导入→初读→精读→拓展', createdAt: '2026-07-19' },
    { id: 'gl2', title: '一年级数学《分类与整理》教案', topic: '分类与整理', subject: '数学', grade: '一年级', prompt: '设计分类与整理的教学活动。', content: '# 《分类与整理》教案\n目标：体验分类过程。\n过程：情境→操作→汇报', createdAt: '2026-07-20' },
  ],

  // 生成的知识点（字段与 generated_knowledges 实体一致；真实路由 /generated/knowledges）
  '/generated/knowledges': [
    { id: 'gk1', title: '拼音声调规则', grade: '一年级', subject: '语文', textbook: '部编版', term: '上', prompt: '总结拼音四声的标调规则。', content: '# 拼音标调规则\n有a不放过，没a找o e；i u并列标在后。', createdAt: '2026-07-18' },
    { id: 'gk2', title: '20以内进位加法', grade: '一年级', subject: '数学', textbook: '人教版', term: '上', prompt: '讲清“凑十法”。', content: '# 凑十法\n9+5=9+1+4=14', createdAt: '2026-07-19' },
  ],

  // 卷宗检索（字段与 paper_queries 实体一致：keyword/title/source/year/abstract/content；真实路由 /generated/queries）
  '/generated/queries': [
    { id: 'pq1', keyword: '识字教学', title: '低年级识字教学方法汇编', source: '小学语文教学', year: '2024', abstract: '归类识字、字理识字、游戏识字等策略。', content: '一、归类识字；二、字理识字；三、生活识字', createdAt: '2026-07-17' },
    { id: 'pq2', keyword: '计算能力', title: '低年级计算能力培养', source: '小学数学教育', year: '2025', abstract: '算理理解+口算训练+错题订正。', content: '一、理解算理；二、每日口算；三、错题本', createdAt: '2026-07-18' },
  ],

  // 教案模板（字段与 lesson_plan_templates 实体一致：grade；真实路由 /lesson-plan-templates）
  '/lesson-plan-templates': [
    { id: 'lp1', title: '新授课教案模板', subject: '通用', grade: '通用', lessonType: '新授课', content: '教学目标→教学重点→教学难点→教学过程→板书设计→作业布置', isFavorite: true },
    { id: 'lp2', title: '复习课教案模板', subject: '通用', grade: '通用', lessonType: '复习课', content: '知识梳理→典型例题→巩固练习→小结提升', isFavorite: false },
    { id: 'lp3', title: '语文阅读课教学设计', subject: '语文', grade: '三年级', lessonType: '新授课', content: '导入→初读感知→精读赏析→拓展延伸→总结', isFavorite: true },
  ],

  // 座位表（字段与 seat_layouts 实体一致：seats 为二维数组(单元格存 studentId 或 null)、active、aisleCols；真实路由 /seat-layouts）
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

  // 工作日志（字段与 work_logs 实体一致：note；真实路由 /work-logs）
  '/work-logs': [
    { id: 'wl1', date: '2026-07-18', content: '批改作文，完成单元测试分析，与家长沟通3人次', classCount: 1, homeworkCount: 2, note: '今日事务较多，注意劳逸结合' },
    { id: 'wl2', date: '2026-07-19', content: '准备公开课教案，参加教研组会议', classCount: 1, homeworkCount: 1, note: '' },
    { id: 'wl3', date: '2026-07-22', content: '期末复习安排，整理学生成长档案', classCount: 1, homeworkCount: 3, note: '档案整理进度过半' },
  ],

  // 自习/签到
  '/picker-history': [
    { id: 'ph1', classId: 'c1', type: 'random', result: { name: '张小明' }, date: todayStr },
    { id: 'ph2', classId: 'c1', type: 'random', result: { name: '刘思琪' }, date: todayStr },
    { id: 'ph3', classId: 'c1', type: 'quiz', result: { name: '周雅婷' }, date: todayStr },
  ],

  // 值日排班配置（字段与 class_duty_configs 实体一致；真实路由 /class-duty-configs）
  '/class-duty-configs': [
    { id: 'dc1', classId: 'c1', duties: ['擦黑板', '扫地', '倒垃圾', '摆桌椅', '关灯'], assignments: { '擦黑板': ['s1', 's5'], '扫地': ['s2', 's8'], '倒垃圾': ['s4'], '摆桌椅': ['s9', 's10'], '关灯': ['s16'] } },
    { id: 'dc2', classId: 'c2', duties: ['擦黑板', '扫地', '倒垃圾', '浇花'], assignments: { '擦黑板': ['s6'], '扫地': ['s7', 's11'], '倒垃圾': ['s12'], '浇花': ['s17'] } },
  ],

  // 消息中心
  '/messages': [
    { id: 'msg1', title: '系统通知', content: '您的班级备份已完成', type: 'system', read: false, createdAt: todayStr },
    { id: 'msg2', title: '家长留言', content: '张小明家长：老师您好，孩子明天请假一天', type: 'parent', read: false, createdAt: todayStr },
    { id: 'msg3', title: '系统通知', content: '期末成绩提交截止时间为7月30日', type: 'system', read: true, createdAt: '2026-07-20' },
    { id: 'msg4', title: '📢 学校公告', content: '下周期末考试安排：请各位家长协助孩子做好复习准备', type: 'notice', read: false, createdAt: todayStr },
    { id: 'msg5', title: '📢 学校公告', content: '暑假安全注意事项：防溺水、防中暑、注意交通安全', type: 'notice', read: true, createdAt: '2026-07-22' },
  ],

  // 通知（教师端通知系统，与 notification 实体对应）
  '/notifications': [
    { id: 'nf1', teacherId: 'u1', title: '新公告发布', content: '学校发布了新公告：下周期末考试安排', type: 'notice', read: false, link: '/pages/notice/notice', createdAt: todayStr },
    { id: 'nf2', teacherId: 'u1', title: '家长留言', content: '张小明家长发送了一条消息，请注意查看', type: 'parent', read: false, link: '/pages/im/im', createdAt: todayStr },
    { id: 'nf3', teacherId: 'u1', title: '作业批改提醒', content: '您有 5 份语文作业待批改', type: 'homework', read: true, link: '/pages/homework/homework', createdAt: '2026-07-22' },
    { id: 'nf4', teacherId: 'u1', title: '考勤异常', content: '今日赵小刚迟到，请关注', type: 'attendance', read: false, link: '/pages/attendance/attendance', createdAt: todayStr },
    { id: 'nf5', teacherId: 'u1', title: '成绩录入提醒', content: '期末模拟成绩还未录入完成', type: 'grade', read: true, link: '/pages/grades/grades', createdAt: '2026-07-21' },
  ],

  // 教学日历（与 teaching_calendar 实体一致；真实路由 /teaching-calendar）
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

/** 根据路径返回模拟数据，支持 ?classId= / ?skip=&take= 过滤 */
export function getMockData(path, method = 'GET', body = {}) {
  const clean = path.split('?')[0]
  const params = {}
  if (path.includes('?')) {
    path.split('?')[1].split('&').forEach((p) => {
      const [k, v] = p.split('=')
      if (k) params[k] = decodeURIComponent(v || '')
    })
  }

  // POST / PATCH / DELETE → 有预设 mock 则用预设，否则模拟成功返回
  if (method !== 'GET') {
    if (MOCK[clean] !== undefined) {
      const mock = MOCK[clean]
      // 如果是数组，追加并返回新条目；否则原样返回
      if (Array.isArray(mock)) {
        return { ...body, id: body?.id || Date.now().toString(), createdAt: new Date().toISOString() }
      }
      return { ...mock, id: Date.now().toString() }
    }
    return { id: Date.now().toString(), ...body, createdAt: new Date().toISOString() }
  }

  // 精确匹配
  if (MOCK[clean] !== undefined) {
    let data = MOCK[clean]
    // 支持动态函数（如 teaching-calendar 根据参数返回不同月份数据）
    if (typeof data === 'function') {
      return data(params)
    }
    data = JSON.parse(JSON.stringify(data))
    // 按 classId 过滤（仅数组数据）
    if (params.classId && Array.isArray(data)) {
      data = data.filter((item) => item.classId === params.classId)
    }
    // 按 studentId 过滤
    if (params.studentId && Array.isArray(data)) {
      data = data.filter((item) => item.studentId === params.studentId)
    }
    // 自动换装：部分页面期望 {items, total} 格式（与 real API 一致）
    // 当传了 skip/take 参数时，或路由是以 CRUD 风格访问时
    const expectsWrapped = params.skip !== undefined || params.take !== undefined
    if (expectsWrapped && Array.isArray(data)) {
      return { items: data, total: data.length }
    }
    return data
  }

  // 通配：/todos/xxx → 返回单个 todo（从集合中查找）
  const parts = clean.split('/') // ['', 'todos', 'xxx']
  if (parts.length === 3 && parts[1]) {
    const collection = '/' + parts[1]
    if (MOCK[collection] && Array.isArray(MOCK[collection])) {
      const match = MOCK[collection].find((item) => item.id === parts[2])
      return match || { id: parts[2], name: parts[2], message: '模拟数据（按ID查找）' }
    }
  }

  // 兜底
  return Array.isArray(body) ? body : (body?.items || [])
}

/** 支持 mock 的路由列表（用于判断是否完全 mock） */
export function hasKnownMock(path) {
  const clean = path.split('?')[0]
  return MOCK[clean] !== undefined
}
