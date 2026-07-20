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
  { id: 'c1', name: '一年级一班', teacherName: '珊珊老师', studentCount: 9 },
  { id: 'c2', name: '二年级二班', teacherName: '张老师', studentCount: 5 },
  { id: 'c3', name: '三年级一班', teacherName: '李老师', studentCount: 4 },
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
const NOTES = [
  { id: 'n1', title: '《春晓》教学反思', content: '今天讲了孟浩然的《春晓》，大部分学生能当堂背诵。互动环节课堂气氛活跃。', category: '教学反思', updatedAt: todayStr, createdAt: todayStr },
  { id: 'n2', title: '下周家长会安排', content: '时间：周四下午 4:00\n地点：本班教室\n内容：期中成绩分析 + 暑假安全提醒', category: '班会记录', updatedAt: todayStr, createdAt: todayStr },
  { id: 'n3', title: '英语公开课教案', content: 'Unit 3 My Friends — 通过角色扮演练习句型，目标：能用英语描述朋友的外貌和性格。', category: '学习资料', updatedAt: todayStr, createdAt: todayStr },
  { id: 'n4', title: '低年级识字教学心得', content: '用字理识字+游戏化复习，学生记字更牢。每天课前 3 分钟“开火车”认读效果好。', category: '教学', updatedAt: todayStr, createdAt: todayStr },
  { id: 'n5', title: '班级图书角管理计划', content: '设立图书管理员轮岗（每周 2 人），借阅登记本放图书角；每月评选“阅读之星”。', category: '班级', updatedAt: todayStr, createdAt: todayStr },
]

const TODOS = [
  { id: 't1', title: '批改周末作业', done: false, date: todayStr },
  { id: 't2', title: '准备下周教案', done: false, date: todayStr },
  { id: 't3', title: '填写教学日志', done: true, date: todayStr },
  { id: 't4', title: '通知家长开会时间', done: false, date: todayStr },
  { id: 't5', title: '整理学生成长档案', done: false, date: todayStr },
  { id: 't6', title: '回复家长群消息', done: true, date: todayStr },
]

const SCHEDULES = [
  { id: 'sch1', subject: '语文', period: 1, dayOfWeek: todayDow, teacher: '珊珊老师', classId: 'c1', section: '早读' },
  { id: 'sch2', subject: '数学', period: 2, dayOfWeek: todayDow, teacher: '张老师', classId: 'c1' },
  { id: 'sch3', subject: '英语', period: 3, dayOfWeek: todayDow, teacher: '李老师', classId: 'c1' },
  { id: 'sch4', subject: '体育', period: 4, dayOfWeek: todayDow, teacher: '刘老师', classId: 'c1' },
  { id: 'sch5', subject: '音乐', period: 5, dayOfWeek: todayDow, teacher: '陈老师', classId: 'c1' },
  { id: 'sch6', subject: '班会', period: 6, dayOfWeek: todayDow, teacher: '珊珊老师', classId: 'c1' },
]

const NOTICES = [
  { id: 'nc1', title: '下周期末考试安排', content: '请各位家长协助孩子做好复习准备，具体时间另行通知。', pinned: true, ended: false },
  { id: 'nc2', title: '暑假安全注意事项', content: '防溺水、防中暑、注意交通安全。', pinned: false, ended: false },
]

const BEHAVIOR_RECORDS = [
  { id: 'b1', studentId: 's1', studentName: '张小明', behavior: '积极发言', date: todayStr, note: '主动回答了两个问题，思路清晰' },
  { id: 'b2', studentId: 's5', studentName: '刘思琪', behavior: '帮助同学', date: todayStr, note: '帮助同桌完成课堂练习' },
  { id: 'b3', studentId: 's4', studentName: '赵小刚', behavior: '走神', date: todayStr, note: '上课看窗外' },
  { id: 'b4', studentId: 's6', studentName: '陈子轩', behavior: '积极思考', date: todayStr, note: '提出了一个有深度的问题' },
  { id: 'b5', studentId: 's13', studentName: '何苗', behavior: '乐于助人', date: todayStr, note: '主动帮同学整理课桌' },
  { id: 'b6', studentId: 's15', studentName: '邓欣', behavior: '作业工整', date: todayStr, note: '数学作业书写规范、正确率高' },
]

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
  '/config/ai': { baseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1', apiKey: '', textModel: 'qwen-plus', visionModel: 'qwen-vl-plus', temperature: 0.7, aiName: '小林子', systemPrompt: '你是一位亲切、专业的教师助理。回答简洁明了。' },
  '/config/app': [{ key: '版本', value: '1.0.0 (demo)' }, { key: '环境', value: '演示模式' }],
  '/duty-rosters': [],
  '/class-activities': [],
  '/class-expenses': [],
  '/award-records': [],
  '/homework': [],
  '/class-galleries': [],
  '/students/import': { success: 0, failed: 0, errors: [] },
}

/** 根据路径返回模拟数据，支持 ?classId= 过滤 */
export function getMockData(path, method = 'GET', body = {}) {
  const clean = path.split('?')[0]
  const params = {}
  if (path.includes('?')) {
    path.split('?')[1].split('&').forEach((p) => {
      const [k, v] = p.split('=')
      if (k) params[k] = decodeURIComponent(v || '')
    })
  }

  // POST / PATCH / DELETE → 模拟成功
  if (method !== 'GET') {
    if (MOCK[path] !== undefined) return { id: Date.now().toString(), ...body }
    return { id: Date.now().toString(), ...body }
  }

  // 精确匹配
  if (MOCK[clean] !== undefined) {
    let data = JSON.parse(JSON.stringify(MOCK[clean]))
    // 按 classId 过滤
    if (params.classId && Array.isArray(data)) {
      data = data.filter((item) => item.classId === params.classId)
    }
    return data
  }

  // 通配：/todos/xxx → 返回单个 todo（模拟）
  const parts = clean.split('/') // ['', 'todos', 'xxx']
  if (parts.length === 3 && parts[1]) {
    const collection = '/' + parts[1]
    if (MOCK[collection]) {
      const match = MOCK[collection].find((item) => item.id === parts[2])
      return match || {}
    }
  }

  // 兜底
  return []
}

/** 支持 mock 的路由列表（用于判断是否完全 mock） */
export function hasKnownMock(path) {
  const clean = path.split('?')[0]
  return MOCK[clean] !== undefined
}
