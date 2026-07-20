/**
 * 演示模式模拟数据 —— 免后端可预览所有页面结构与交互流程。
 * 由 request.js 中的 setMockMode(true) 启用。
 */
const todayStr = new Date().toISOString().slice(0, 10)
const todayDow = new Date().getDay() || 7

const MOCK = {
  '/classes': [
    { id: 'c1', name: '一年级一班', teacherName: '王老师', studentCount: 36 },
    { id: 'c2', name: '二年级二班', teacherName: '张老师', studentCount: 34 },
    { id: 'c3', name: '三年级一班', teacherName: '李老师', studentCount: 38 },
  ],
  '/students': [
    { id: 's1', name: '张小明', classId: 'c1', gender: '男', seatNo: 1, studentNo: '2024001', birthDate: '2015-03-12', phone: '13800001001', parentName: '张伟' },
    { id: 's2', name: '李小华', classId: 'c1', gender: '女', seatNo: 2, studentNo: '2024002', birthDate: '2015-07-08', phone: '13800001002', parentName: '李强' },
    { id: 's3', name: '王小芳', classId: 'c1', gender: '女', seatNo: 3, studentNo: '2024003', birthDate: '2016-01-22', phone: '13800001003', parentName: '王磊' },
    { id: 's4', name: '赵小刚', classId: 'c1', gender: '男', seatNo: 4, studentNo: '2024004', birthDate: '2015-11-05', phone: '13800001004', parentName: '赵建军' },
    { id: 's5', name: '刘思琪', classId: 'c1', gender: '女', seatNo: 5, studentNo: '2024005', birthDate: '2015-09-18', phone: '13800001005', parentName: '刘洋' },
    { id: 's6', name: '陈子轩', classId: 'c2', gender: '男', seatNo: 1, studentNo: '2024011', birthDate: '2014-06-15', phone: '13800002001', parentName: '陈伟' },
    { id: 's7', name: '杨一诺', classId: 'c2', gender: '女', seatNo: 2, studentNo: '2024012', birthDate: '2014-08-30', phone: '13800002002', parentName: '杨帆' },
  ],
  '/notes': [
    { id: 'n1', title: '《春晓》教学反思', content: '今天讲了孟浩然的《春晓》，大部分学生能当堂背诵。互动环节课堂气氛活跃。', category: '教学反思', updatedAt: todayStr, createdAt: todayStr },
    { id: 'n2', title: '下周家长会安排', content: '时间：周四下午 4:00\n地点：本班教室\n内容：期中成绩分析 + 暑假安全提醒', category: '班会记录', updatedAt: todayStr, createdAt: todayStr },
    { id: 'n3', title: '英语公开课教案', content: 'Unit 3 My Friends — 通过角色扮演练习句型，目标：能用英语描述朋友的外貌和性格。', category: '学习资料', updatedAt: todayStr, createdAt: todayStr },
  ],
  '/grades': [
    { id: 'g1', classId: 'c1', name: '期中考试', subject: '语文', date: todayStr, scores: [{ studentId: 's1', score: 92 }, { studentId: 's2', score: 88 }, { studentId: 's3', score: 95 }, { studentId: 's4', score: 76 }, { studentId: 's5', score: 83 }] },
    { id: 'g2', classId: 'c1', name: '期中考试', subject: '数学', date: todayStr, scores: [{ studentId: 's1', score: 85 }, { studentId: 's2', score: 91 }, { studentId: 's3', score: 78 }, { studentId: 's4', score: 90 }, { studentId: 's5', score: 96 }] },
  ],
  '/todos': [
    { id: 't1', title: '批改周末作业', done: false, date: todayStr },
    { id: 't2', title: '准备下周教案', done: false, date: todayStr },
    { id: 't3', title: '填写教学日志', done: true, date: todayStr },
    { id: 't4', title: '通知家长开会时间', done: false, date: todayStr },
  ],
  '/schedules': [
    { id: 'sch1', subject: '语文', period: 1, dayOfWeek: todayDow, teacher: '王老师', classId: 'c1', section: '早读' },
    { id: 'sch2', subject: '数学', period: 2, dayOfWeek: todayDow, teacher: '张老师', classId: 'c1' },
    { id: 'sch3', subject: '英语', period: 3, dayOfWeek: todayDow, teacher: '李老师', classId: 'c1' },
    { id: 'sch4', subject: '体育', period: 4, dayOfWeek: todayDow, teacher: '刘老师', classId: 'c1' },
    { id: 'sch5', subject: '音乐', period: 5, dayOfWeek: todayDow, teacher: '陈老师', classId: 'c1' },
    { id: 'sch6', subject: '班会', period: 6, dayOfWeek: todayDow, teacher: '王老师', classId: 'c1' },
  ],
  '/notices': [
    { id: 'nc1', title: '下周期末考试安排', content: '请各位家长协助孩子做好复习准备，具体时间另行通知。', pinned: true, ended: false },
    { id: 'nc2', title: '暑假安全注意事项', content: '防溺水、防中暑、注意交通安全。', pinned: false, ended: false },
  ],
  '/teachers': [
    { id: 't1', name: '王老师', position: '班主任', phone: '13800138001', teachings: [{ classId: 'c1', subject: '语文' }], isStarred: true },
    { id: 't2', name: '张老师', position: '数学教师', phone: '13800138002', teachings: [{ classId: 'c1', subject: '数学' }], isStarred: false },
    { id: 't3', name: '李老师', position: '英语教师', phone: '13800138003', teachings: [{ classId: 'c1', subject: '英语' }] },
    { id: 't4', name: '刘老师', position: '体育教师', phone: '13800138004', teachings: [{ classId: 'c1', subject: '体育' }] },
  ],
  '/attendances': [
    { id: 'a1', classId: 'c1', date: todayStr, records: [{ studentId: 's1', status: '出勤' }, { studentId: 's2', status: '出勤' }, { studentId: 's3', status: '迟到' }, { studentId: 's4', status: '出勤' }, { studentId: 's5', status: '请假' }] },
  ],
  '/behavior-records': [
    { id: 'b1', studentId: 's1', studentName: '张小明', behavior: '积极发言', date: todayStr, note: '主动回答了两个问题，思路清晰' },
    { id: 'b2', studentId: 's5', studentName: '刘思琪', behavior: '帮助同学', date: todayStr, note: '帮助同桌完成课堂练习' },
    { id: 'b3', studentId: 's4', studentName: '赵小刚', behavior: '走神', date: todayStr, note: '上课看窗外' },
  ],
  '/users/me': { id: 'u1', name: '张老师', school: '阳光实验小学', subjects: ['语文', '品德'] },
  '/config/ai': { baseUrl: '', apiKey: '', textModel: 'qwen3.7-plus', visionModel: 'qwen3-vl-plus', temperature: 0.7, aiName: '小林子', systemPrompt: '你是一位亲切、专业的教师助理。回答简洁明了。' },
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
    // 特殊处理：带 /students/import 的 POST 走已有映射
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
