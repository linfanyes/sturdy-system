#!/usr/bin/env node
/**
 * ============================================================
 * 园丁工作台 · 全量测试数据种子脚本（QA）
 * ============================================================
 * 用途：
 *   通过真实 API 在 QA 服务器（默认 http://localhost:3100）上生成
 *   覆盖五类角色（超管/校管/班主任/科任教师/家长）的完整业务测试数据，
 *   输出 qa-env.json 供功能/性能测试套件复用。
 *
 * 用法：
 *   node qa/seed-data.mjs [--base http://localhost:3100/api] [--output qa/qa-env.json]
 *
 * 数据蓝图（幂等：同名资源跳过创建）：
 *   1 所测试学校（超管建） → 1 名校管 → 6 名教师（含班主任/科任）
 *   → 3 个班级 → 15 名学生（家长登录开启）→ 3 次考试 → 成绩单（3科×15人）
 *   → 作业/考勤/课表/公告/资源/待办/笔记/成长/行为/阅读/打卡/家长联系/
 *     轮值/班费/班级活动/风采/工作日志/听课记录/教学日历/学期/奖项/积分
 * ============================================================
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const args = process.argv.slice(2)
const BASE = (args.find(a => a.startsWith('--base='))?.split('=')[1] || 'http://localhost:3100/api').replace(/\/$/, '')
const OUT = args.find(a => a.startsWith('--output='))?.split('=')[1] || path.join(__dirname, 'qa-env.json')

const PW = 'Test@2026' // 统一测试密码
const j = { 'Content-Type': 'application/json' }

let PASS = 0, FAIL = 0, SKIP = 0
const log = (ok, label, extra = '') => {
  if (ok) { PASS++; console.log(`  ✅ ${label}${extra ? ' ' + extra : ''}`) }
  else { FAIL++; console.log(`  ❌ ${label}${extra ? ' ' + extra : ''}`) }
}

async function call(p, { method = 'GET', body, token } = {}) {
  const r = await fetch(BASE + p, {
    method,
    headers: { ...j, ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  })
  const t = await r.text()
  let d
  try { d = t ? JSON.parse(t) : null } catch { d = t }
  return { status: r.status, ok: r.ok, d }
}
const sleep = (ms) => new Promise(r => setTimeout(r, ms))

const env = { base: BASE, password: PW, generatedAt: new Date().toISOString(), created: {} }

console.log(`\n🚀 开始生成测试数据 → ${BASE}\n`)

// ---------- 1. 超管 ----------
const su = await call('/admin/login', { method: 'POST', body: { username: 'admin', password: 'admin' } })
if (!su.ok || !su.d?.token) { console.error('❌ 超管登录失败，终止：', JSON.stringify(su.d).slice(0, 200)); process.exit(1) }
const SU = su.d.token
log(true, '[1] 超管登录')
env.created.suToken = SU

// ---------- 2. 学校 ----------
const stamp = 'QA' + new Date().toISOString().slice(0, 10).replace(/-/g, '')
const schoolName = `自动化测试学校-${stamp}`
const schools = await call('/admin/schools?skip=0&take=100', { token: SU })
const schoolList = Array.isArray(schools.d) ? schools.d : schools.d?.items || []
let school = schoolList.find(s => s.name === schoolName)
if (!school) {
  const r = await call('/admin/schools', { method: 'POST', token: SU, body: { name: schoolName, prefix: 'QA', platform: 'web', address: '测试地址1号', contact: 'QA', phone: '13800000000', status: 'active' } })
  if (!r.ok) { console.error('❌ 建学校失败：', JSON.stringify(r.d).slice(0, 200)); process.exit(1) }
  school = r.d
  log(true, '[2] 创建测试学校', school.name)
} else {
  log(true, '[2] 复用已存在学校', school.name)
}
env.created.schoolId = school.id
env.created.schoolName = school.name

// 开启全部功能包
const ALL_FEATURES = ['classes','students','exams','grades','analysis','attendance','homework','tools','seats','games','rewards','growth','behavior','reading','checkin','finance','activities','duty','gallery','parents','im','notices','ai','schedule','worklog','observation','calendar','teachers','todos','notes','demo','office_tools','subject_tools','quicktool','grade_trend','picker_history','reward','translate','blackboard','speech']
const featRes = await call(`/admin/schools/${school.id}/features`, { method: 'PATCH', token: SU, body: { featureFlags: ALL_FEATURES } })
log(featRes.ok, '[2b] 学校功能包全开')

// ---------- 3. 校管 ----------
const admins = await call('/admin/school-admins?skip=0&take=100', { token: SU })
const adminList = Array.isArray(admins.d) ? admins.d : admins.d?.items || []
let sa = adminList.find(a => a.username === 'qa_sa')
if (!sa) {
  const r = await call('/admin/school-admins', { method: 'POST', token: SU, body: { username: 'qa_sa', password: PW, name: 'QA校管', schoolId: school.id, enabled: true } })
  if (!r.ok) { console.error('❌ 建校管失败：', JSON.stringify(r.d).slice(0, 200)); process.exit(1) }
  sa = r.d
}
env.created.saId = sa.id
let saLogin = await call('/school-admin/login', { method: 'POST', body: { username: 'qa_sa', password: PW } })
if (!saLogin.ok) { await sleep(900); saLogin = await call('/school-admin/login', { method: 'POST', body: { username: 'qa_sa', password: PW } }) }
if (!saLogin.ok) { console.error('❌ 校管登录失败：', JSON.stringify(saLogin.d).slice(0, 200)); process.exit(1) }
const SA = saLogin.d.token
log(true, '[3] 校管 qa_sa 就绪')
env.created.saToken = SA

// ---------- 4. 教师（6 名） ----------
const teachers = [
  { name: 'QA班主任甲', username: 'qa_t_head', phone: '13811110001', gender: '男', subject: '语文', subjects: ['语文'], positions: ['班主任'], grade: '三年级' },
  { name: 'QA科任乙', username: 'qa_t_sub1', phone: '13811110002', gender: '女', subject: '数学', subjects: ['数学'], positions: ['科任'], grade: '三年级' },
  { name: 'QA科任丙', username: 'qa_t_sub2', phone: '13811110003', gender: '女', subject: '英语', subjects: ['英语'], positions: ['科任'], grade: '三年级' },
  { name: 'QA科任丁', username: 'qa_t_sub3', phone: '13811110004', gender: '男', subject: '科学', subjects: ['科学'], positions: ['科任'], grade: '三年级' },
  { name: 'QA教师戊', username: 'qa_t_iso', phone: '13811110005', gender: '女', subject: '美术', subjects: ['美术'], positions: ['科任'], grade: '四年级' },
  { name: 'QA教师己', username: 'qa_t_perf', phone: '13811110006', gender: '男', subject: '体育', subjects: ['体育'], positions: ['科任'], grade: '四年级' },
]
const teaListRes = await call('/school-admin/teachers?skip=0&take=200', { token: SA })
const teaList = Array.isArray(teaListRes.d) ? teaListRes.d : teaListRes.d?.items || []
const teacherIds = []
for (const t of teachers) {
  let found = teaList.find(x => x.username === t.username)
  if (!found) {
    const r = await call('/school-admin/teachers', { method: 'POST', token: SA, body: { ...t, password: PW, enabled: true } })
    if (r.ok) { found = r.d; log(true, `[4] 建教师 ${t.username}`) }
    else { log(false, `[4] 建教师 ${t.username}`, JSON.stringify(r.d).slice(0, 100)); continue }
  }
  teacherIds.push(found.id)
}
// 班主任/科任登录
async function teacherLogin(username) {
  for (let i = 0; i < 4; i++) {
    const r = await call('/auth/unified-login', { method: 'POST', body: { username, password: PW } })
    if (r.ok && r.d?.token) return r.d
    await sleep(800)
  }
  return null
}
const headLogin = await teacherLogin('qa_t_head')
if (!headLogin) { console.error('❌ 班主任登录失败'); process.exit(1) }
const HEAD = headLogin.token
const isoLogin = await teacherLogin('qa_t_iso')
const ISO = isoLogin.token
const perfLogin = await teacherLogin('qa_t_perf')
const PERF = perfLogin.token
env.created.teacherIds = teacherIds
env.created.headToken = HEAD
env.created.isoTokens = { qa_t_iso: ISO, qa_t_perf: PERF }
log(true, '[4b] 班主任 qa_t_head / 隔离教师 qa_t_iso / qa_t_perf 登录就绪')

// ---------- 5. 班级（3 个；班主任每学期唯一，各配不同班主任） ----------
const classes = [
  { name: '三年级一班', grade: '三年级', classNo: '1', headTeacher: 'QA班主任甲', headTeacherId: teacherIds[0], term: '2026-2027-1', subjects: ['语文', '数学', '英语', '科学'], subjectTeachers: [{ teacherId: teacherIds[0], subjects: ['语文'] }, { teacherId: teacherIds[1], subjects: ['数学'] }, { teacherId: teacherIds[2], subjects: ['英语'] }, { teacherId: teacherIds[3], subjects: ['科学'] }] },
  { name: '三年级二班', grade: '三年级', classNo: '2', headTeacher: 'QA教师戊', headTeacherId: teacherIds[4], term: '2026-2027-1', subjects: ['语文', '数学', '英语'], subjectTeachers: [{ teacherId: teacherIds[0], subjects: ['语文'] }, { teacherId: teacherIds[1], subjects: ['数学'] }, { teacherId: teacherIds[2], subjects: ['英语'] }] },
  { name: '四年级一班', grade: '四年级', classNo: '1', headTeacher: 'QA教师己', headTeacherId: teacherIds[5], term: '2026-2027-1', subjects: ['语文', '数学', '英语', '美术'], subjectTeachers: [{ teacherId: teacherIds[4], subjects: ['美术'] }, { teacherId: teacherIds[1], subjects: ['数学'] }, { teacherId: teacherIds[2], subjects: ['英语'] }, { teacherId: teacherIds[0], subjects: ['语文'] }] },
]
const clsListRes = await call('/school-admin/classes', { token: SA })
const clsList = Array.isArray(clsListRes.d) ? clsListRes.d : clsListRes.d?.items || clsListRes.d || []
const classIds = []
for (const c of classes) {
  let found = (Array.isArray(clsList) ? clsList : []).find(x => x.name === c.name)
  if (!found) {
    const r = await call('/school-admin/classes', { method: 'POST', token: SA, body: c })
    if (r.ok) { found = r.d; log(true, `[5] 建班级 ${c.name}`) }
    else { log(false, `[5] 建班级 ${c.name}`, JSON.stringify(r.d).slice(0, 150)); continue }
  }
  classIds.push(found.id)
}
env.created.classIds = classIds
env.created.class1Id = classIds[0]

// ---------- 6. 学生（15 名，跨 3 班） ----------
const firstName = ['张', '李', '王', '赵', '刘', '陈', '杨', '黄', '周', '吴', '徐', '孙', '马', '朱', '胡']
const secondName = ['小明', '思远', '欣怡', '子轩', '雨桐', '浩然', '若曦', '一诺', '嘉懿', '诗涵', '博文', '语嫣', '泽宇', '紫萱', '俊杰']
const stuRes = await call('/school-admin/students', { token: SA })
const stuList = Array.isArray(stuRes.d) ? stuRes.d : stuRes.d?.items || stuRes.d || []
const existingStus = Array.isArray(stuList) ? stuList : []
const students = []
let stuNo = 31001
// 各班对应的班主任 token（建学生需班级成员关系）
const classTokens = [HEAD, ISO, PERF]
for (let i = 0; i < 15; i++) {
  const classIdx = i < 6 ? 0 : i < 11 ? 1 : 2
  const classId = classIds[classIdx]
  if (!classId) { log(false, `[6] 班级索引 ${classIdx} 缺失，跳过学生`); continue }
  const token = classTokens[classIdx]
  const name = firstName[i] + secondName[i]
  const gender = i % 2 ? '女' : '男'
  let s = existingStus.find(x => x.name === name && x.classId === classId)
  if (!s) {
    const r = await call('/students', { method: 'POST', token, body: { classId, name, gender, studentNo: String(stuNo), parentName: name + '家长', parentPhone: `139${String(10000000 + i)}` } })
    if (r.ok) { s = r.d; log(true, `[6] 建学生 ${name}（${classId.slice(0, 8)}…）`) }
    else { log(false, `[6] 建学生 ${name}`, JSON.stringify(r.d).slice(0, 120)); continue }
  }
  stuNo++
  // 开启家长登录
  const tgl = await call(`/students/${s.id}/toggle-parent-login`, { method: 'POST', token })
  if (!tgl.ok) log(false, `[6b] 开启家长登录 ${name}`)
  students.push({ id: s.id, name, gender, studentNo: s.studentNo, classId })
}
env.created.students = students
env.created.student1Id = students[0]?.id
log(true, `[6c] 学生总数 ${students.length}`)

// ---------- 7. 家长登录验证（家长默认密码 123456） ----------
const PARENT_PW = '123456'
const parentLogin = await call('/parent-auth/login', { method: 'POST', body: { studentNo: students[0]?.studentNo, password: PARENT_PW } })
if (parentLogin.ok && parentLogin.d?.token) {
  env.created.parentToken = parentLogin.d.token
  env.created.parentPassword = PARENT_PW
  log(true, '[7] 家长登录成功', `${students[0].name}(${students[0].studentNo})`)
} else {
  log(false, '[7] 家长登录', JSON.stringify(parentLogin.d).slice(0, 150))
  const alt = await call('/parent-auth/login', { method: 'POST', body: { studentNo: students[0]?.studentNo, password: PW } })
  if (alt.ok && alt.d?.token) { env.created.parentToken = alt.d.token; env.created.parentPassword = PW; log(true, '[7b] 家长登录(Test@2026)') }
}

// ---------- 8. 考试 + 成绩（3 次考试 × 3 科 × 15 人） ----------
const examNames = ['期中考试', '单元测验一', '期末考试']
for (let e = 0; e < 3; e++) {
  const clsIdx = 0
  const r = await call('/exams', { method: 'POST', token: HEAD, body: { name: examNames[e], date: `2026-${String(6 + e).padStart(2, '0')}-15`, term: '2026-2027-1', classId: classIds[clsIdx], subjects: ['语文', '数学', '英语'], teacherName: 'QA班主任甲' } })
  if (!r.ok) { log(false, `[8] 建考试 ${examNames[e]}`); continue }
  const exam = r.d
  log(true, `[8] 建考试 ${examNames[e]}`)
  // 为 3 科录入成绩（每科一份成绩单，含 15 人分数）
  for (const subject of ['语文', '数学', '英语']) {
    const scores = students.filter(s => s.classId === classIds[0]).map((s, idx) => ({
      studentId: s.id, studentName: s.name, score: 60 + ((idx * 7 + e * 5) % 40), // 60~99
    }))
    const g = await call('/grades', { method: 'POST', token: HEAD, body: { examId: exam.id, examName: exam.name, subject, classId: classIds[0], date: exam.date, scores } })
    if (g.ok) log(true, `[8b] ${exam.name} ${subject} 成绩 ${scores.length} 人`)
    else log(false, `[8b] ${exam.name} ${subject} 成绩`, JSON.stringify(g.d).slice(0, 120))
  }
}

// ---------- 9. 核心业务数据（班主任视角） ----------
// 作业
for (let i = 0; i < 3; i++) {
  const r = await call('/homework', { method: 'POST', token: HEAD, body: { classId: classIds[0], subject: ['语文', '数学', '英语'][i], title: `作业${i + 1}`, content: `完成第${i + 1}课练习`, startDate: '2026-08-03', deadline: '2026-08-10', status: '待批改' } })
  if (r.ok) log(true, '[9] 建作业')
}
// 考勤
const att = await call('/attendances', { method: 'POST', token: HEAD, body: { classId: classIds[0], date: '2026-08-03', records: students.slice(0, 6).map(s => ({ studentId: s.id, status: i => i === 0 ? '迟到' : '正常' })).map((x, i) => ({ studentId: x.studentId, status: i === 0 ? '迟到' : '正常' })) } })
if (att.ok) log(true, '[9] 建考勤')
// 课表
for (let d = 1; d <= 5; d++) {
  await call('/schedules', { method: 'POST', token: HEAD, body: { classId: classIds[0], dayOfWeek: d, period: 1, weekType: 'all', subject: ['语文', '数学', '英语', '科学', '音乐'][d - 1], teacher: 'QA班主任甲' } })
}
log(true, '[9] 建课表 5 节')
// 公告
const notice = await call('/notices', { method: 'POST', token: HEAD, body: { classId: classIds[0], title: '开学通知', content: '请家长关注开学安排', scope: 'class', pinned: true, ended: false } })
if (notice.ok) log(true, '[9] 建公告')
// 待办 / 笔记
await call('/todos', { method: 'POST', token: HEAD, body: { title: '批改作文', done: false, dueDate: '2026-08-05' } })
await call('/notes', { method: 'POST', token: HEAD, body: { title: '班会要点', content: '安全纪律卫生', tags: ['班会'] } })
log(true, '[9] 建待办+笔记')
// 成长/行为/阅读/打卡
await call('/growth-entries', { method: 'POST', token: HEAD, body: { studentId: students[0]?.id, classId: classIds[0], category: '学习', title: '进步明显', content: '期中考试进步10名' } })
await call('/behavior-records', { method: 'POST', token: HEAD, body: { studentId: students[0]?.id, classId: classIds[0], type: '表扬', content: '主动帮助同学', date: '2026-08-02' } })
await call('/reading-logs', { method: 'POST', token: HEAD, body: { studentId: students[0]?.id, classId: classIds[0], book: '西游记', pages: '1-50', date: '2026-08-02', note: '认真阅读' } })
await call('/checkins', { method: 'POST', token: HEAD, body: { studentId: students[0]?.id, classId: classIds[0], date: '2026-08-02', item: '早读打卡', status: '完成' } })
log(true, '[9] 建成长/行为/阅读/打卡')
// 家长联系 / 留言
await call('/parent-contacts', { method: 'POST', token: HEAD, body: { studentId: students[0]?.id, studentName: students[0]?.name, classId: classIds[0], parentName: students[0]?.name + '家长', relation: '妈妈', phone: '13900000000', method: '电话', content: '沟通学习情况', date: '2026-08-02' } })
log(true, '[9] 建家长联系')
// 轮值 / 班费 / 活动 / 风采
await call('/duty-rosters', { method: 'POST', token: HEAD, body: { classId: classIds[0], name: '第1组', type: '卫生', assignments: [{ date: '2026-08-03', persons: [students[0]?.name, students[1]?.name] }] } })
await call('/class-expenses', { method: 'POST', token: HEAD, body: { classId: classIds[0], type: '收入', category: '班费', amount: 500, date: '2026-08-01', description: '班费收取', handler: 'QA班主任甲' } })
await call('/class-activities', { method: 'POST', token: HEAD, body: { classId: classIds[0], title: '秋游活动', date: '2026-09-15', description: '组织班级秋游', photos: [] } })
await call('/class-galleries', { method: 'POST', token: HEAD, body: { classId: classIds[0], title: '运动会风采', description: '春季运动会', photos: ['https://example.com/p1.jpg', 'https://example.com/p2.jpg'] } })
log(true, '[9] 建轮值/班费/活动/风采')
// 工作日志 / 听课 / 教学日历 / 学期
await call('/work-logs', { method: 'POST', token: HEAD, body: { date: '2026-08-02', title: '日常教学', content: '完成第三单元教学', category: '教学' } })
await call('/lesson-observations', { method: 'POST', token: HEAD, body: { teacherName: 'QA科任乙', date: '2026-08-02', subject: '数学', classId: classIds[0], content: '课堂互动良好', score: 92 } })
await call('/teaching-calendar', { method: 'POST', token: HEAD, body: { date: '2026-08-03', title: '教研会', type: '教研', note: '语文组教研' } })
await call('/semesters', { method: 'POST', token: HEAD, body: { name: '2026-2027-1', startDate: '2026-09-01', endDate: '2027-01-31', current: true } })
log(true, '[9] 建工作日志/听课/教学日历/学期')
// 奖项 / 积分
await call('/award-categories', { method: 'POST', token: HEAD, body: { name: '学习之星', color: '#f59e0b' } })
await call('/award-records', { method: 'POST', token: HEAD, body: { studentId: students[0]?.id, studentName: students[0]?.name, name: '学习之星', issuer: 'QA班主任甲', date: '2026-08-02', level: 'class' } })
await call('/reward-records', { method: 'POST', token: HEAD, body: { classId: classIds[0], studentId: students[0]?.id, type: '奖励', points: 5, reason: '表现优秀', date: '2026-08-02' } })
await call('/score-records', { method: 'POST', token: HEAD, body: { classId: classIds[0], studentId: students[0]?.id, studentName: students[0]?.name, delta: 5, reason: '课堂积极', date: '2026-08-02' } })
await call('/group-scores', { method: 'POST', token: HEAD, body: { classId: classIds[0], groupName: '第一组', score: 10, reason: '卫生优秀', date: '2026-08-02' } })
log(true, '[9] 建奖项/积分')

// ---------- 10. 留言（教师 → 家长，P1-MSG-01 修复后 recipientId 使用家长 IM id） ----------
let parentRecSeed = null
try {
  const rr = await call('/messages/recipients', { token: HEAD })
  const rl = Array.isArray(rr.d) ? rr.d : rr.d?.items || []
  parentRecSeed = rl.find((r) => r.role === 'parent')?.id || null
} catch {}
const msg = await call('/messages', { method: 'POST', token: HEAD, body: { recipientId: parentRecSeed || students[0]?.id, recipientRole: 'parent', title: '家校留言', content: '孩子最近表现很好，继续保持！', type: 'direct', type: 'text' } })
if (msg.ok) log(true, '[10] 教师留言给家长')

// ---------- 11. 输出 ----------
fs.writeFileSync(OUT, JSON.stringify(env, null, 2))
console.log(`\n📦 环境清单已写入 ${OUT}`)
console.log(`📊 种子结果: ✅ ${PASS}  ❌ ${FAIL}  ⏭ ${SKIP}\n`)
if (FAIL > 0) { console.warn('⚠️ 部分种子数据失败，功能测试可能跳过对应用例'); process.exitCode = 1 }
