/**
 * 后端接口全量集成测试（打真实本地服务）
 * 用法：在 server 目录执行  node ../test/backend/api-tests.mjs
 * 前置：本地 MariaDB + 后端已启动（.env 中 SUPER_ADMIN_USER/PASSWORD）
 * 覆盖：四角色登录、超管/校管/教师/家长全接口、动态CRUD、幂等、越权、分页边界
 */
import { createRequire } from 'module'
import fs from 'fs'
import path from 'path'

const require = createRequire('/workspace/work-system/server/')
const axios = require('axios')

const BASE = process.env.BASE || 'http://127.0.0.1:3000/api/v1'

// ---------- 读取 .env ----------
const envPath = '/workspace/work-system/server/.env'
const env = {}
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Z0-9_]+)=(.*)$/)
    if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, '')
  }
}
const SUPER_USER = process.env.SUPER_ADMIN_USER || env.SUPER_ADMIN_USER || 'admin'
const SUPER_PASS = process.env.SUPER_ADMIN_PASSWORD || env.SUPER_ADMIN_PASSWORD || 'admin123'

// ---------- 测试结果收集 ----------
const results = []
let passCount = 0, failCount = 0
function check(name, cond, detail = '') {
  const line = `${cond ? '[PASS]' : '[FAIL]'} ${name}${detail ? ' | ' + detail : ''}`
  if (cond) { passCount++ } else { failCount++ }
  results.push(line)
  console.log('  ' + line)
}
const errOf = (e) => (e?.response ? `${e.response.status} ${JSON.stringify(e.response.data || '').slice(0, 160)}` : e?.message || String(e))
/** 从列表响应中安全取数组（兼容 {items,total} 与裸数组） */
function listOf(d) {
  if (Array.isArray(d)) return d
  if (d && Array.isArray(d.items)) return d.items
  if (d && Array.isArray(d.data)) return d.data
  return []
}

// ---------- HTTP 封装 ----------
async function req(method, url, { data, token, params } = {}) {
  const headers = {}
  if (token) headers.Authorization = 'Bearer ' + token
  if (data) headers['Content-Type'] = 'application/json'
  const res = await axios({ method, url: BASE + url, data, params, headers, timeout: 30000, validateStatus: () => true })
  return { status: res.status, data: res.data }
}

// ---------- 全局变量（测试数据） ----------
const S = {} // store tokens & ids
let TS = new Date().getTime().toString().slice(-6)

// 全功能开关（与 shared/constants FEATURE_FLAGS 对齐，覆盖全部动态CRUD模块）
const ALL_FEATURES = ['classes','students','exams','grades','analysis','attendance','homework','tools','seats','games','rewards','growth','behavior','reading','checkin','finance','activities','duty','gallery','parents','im','notices','ai','schedule','worklog','observation','calendar','teachers','todos','notes','demo','office_tools','subject_tools','quicktool','grade_trend','picker_history','reward','translate','blackboard','speech']

async function main() {
  console.log('==== 开始后端接口集成测试 ====\n')
  const t0 = Date.now()

  // ========== 1. 认证 ==========
  console.log('— 认证模块 —')
  const login = async (u, p) => req('POST', '/auth/unified-login', { data: { username: u, password: p } })
  let r = await login(SUPER_USER, SUPER_PASS)
  check('A1 超管 unified-login', (r.status === 200 || r.status === 201) && r.data.role === 'super', `status=${r.status}`)
  S.super = r.data.token

  r = await login('no_such_user_xyz', 'wrongpass')
  check('A2 错误密码登录被拒', r.status === 400 || r.status === 401, `status=${r.status}`)

  r = await req('GET', '/auth/me', { token: S.super })
  check('A5 GET /auth/me', r.status === 200 && r.data.role === 'super')

  // ========== 2. 超管：学校 ==========
  console.log('— 超管：学校管理 —')
  const schoolName1 = `测试小学${TS}`
  const schoolName2 = `测试中学${TS}`
  r = await req('POST', '/admin/schools', { token: S.super, data: { name: schoolName1, prefix: 'TS', platform: 'web' } })
  check('B1-1 创建学校(web)', r.status === 201 || r.status === 200, JSON.stringify(r.data).slice(0, 120))
  if (r.data?.id) { S.school1 = r.data.id; S.school1Code = r.data.code }
  r = await req('POST', '/admin/schools', { token: S.super, data: { name: schoolName2, prefix: 'TZ', platform: 'mini' } })
  check('B1-2 创建学校(mini)', r.status === 201 || r.status === 200)
  if (r.data?.id) { S.school2 = r.data.id; S.school2Code = r.data.code }

  r = await req('GET', '/admin/schools', { token: S.super, params: { take: 100 } })
  check('B1-3 学校列表', r.status === 200 && Array.isArray(r.data?.items ?? r.data))
  const sameCode = (r.data?.items || r.data || []).filter(s => s.code === S.school1Code)
  check('B1-4 学校 code 唯一', sameCode.length === 1)

  r = await req('PATCH', `/admin/schools/${S.school1}/features`, { token: S.super, data: { featureFlags: ALL_FEATURES } })
  check('B4-1 学校功能包写入', r.status === 200)
  r = await req('GET', `/admin/schools/${S.school1}/features`, { token: S.super })
  check('B4-2 学校功能包读取', r.status === 200, JSON.stringify(r.data).slice(0, 80))

  // ========== 3. 超管：校管账号 ==========
  console.log('— 超管：校管账号 —')
  const sa1u = `sadmin_${TS}a`
  r = await req('POST', '/admin/school-admins', { token: S.super, data: { username: sa1u, password: 'Sadmin123', name: '测试校管A', schoolId: S.school1 } })
  check('B5-1 创建校管A', r.status === 201 || r.status === 200)
  const sa1 = r.data?.id || r.data?.schoolAdmin?.id

  r = await req('POST', '/admin/school-admins', { token: S.super, data: { username: sa1u, password: 'Sadmin123', name: '重复', schoolId: S.school1 } })
  check('B5-2 重复 username 校管 → 400', r.status === 400 || r.status === 409, `status=${r.status} ${JSON.stringify(r.data).slice(0, 80)}`)

  const sa2u = `sadmin_${TS}b`
  r = await req('POST', '/admin/school-admins', { token: S.super, data: { username: sa2u, password: 'Sadmin123', name: '测试校管B', schoolId: S.school2 } })
  check('B5-3 创建校管B', r.status === 201 || r.status === 200)
  const sa2 = r.data?.id || r.data?.schoolAdmin?.id

  r = await req('POST', '/admin/school-admins/batch', { token: S.super, data: { admins: [{ username: `sadmin_b_${TS}1`, password: 'Sadmin123', name: '批量1', schoolId: S.school1 }, { username: `sadmin_b_${TS}2`, password: 'Sadmin123', name: '批量2', schoolId: S.school1 }] } })
  check('B5-4 批量创建校管', r.status === 201 || r.status === 200, JSON.stringify(r.data).slice(0, 80))

  r = await req('PATCH', `/admin/school-admins/${sa1}/enabled`, { token: S.super, data: { enabled: false } })
  check('B6 校管停用', r.status === 200)
  r = await req('PATCH', `/admin/school-admins/${sa1}/enabled`, { token: S.super, data: { enabled: true } })
  check('B6-2 校管启用', r.status === 200)

  r = await req('PATCH', `/admin/school-admins/${sa1}/password`, { token: S.super, data: { password: 'Reset123' } })
  check('B7 校管重置密码', r.status === 200)

  // ========== 4. 校管登录 + 教师管理 ==========
  console.log('— 校管：登录与教师管理 —')
  r = await login(sa1u, 'Reset123')
  check('C1 校管登录(重置后密码)', (r.status === 200 || r.status === 201) && r.data.role === 'school_admin', `status=${r.status} ${JSON.stringify(r.data).slice(0, 100)}`)
  S.sa1 = r.data.token

  r = await req('GET', '/school-admin/dashboard', { token: S.sa1 })
  check('C2 校管 dashboard', r.status === 200)

  const teacher1 = { name: '张老师', subject: '语文', phone: '13800000001', gender: '女', username: `zhang_${TS}`, password: 'Teacher123' }
  const teacher2 = { name: '李老师', subject: '数学', phone: '13800000002', gender: '男', username: `li_${TS}`, password: 'Teacher123' }
  r = await req('POST', '/school-admin/teachers', { token: S.sa1, data: teacher1 })
  check('C4-1 创建教师1', r.status === 201 || r.status === 200, JSON.stringify(r.data).slice(0, 100))
  S.teacher1 = r.data?.id
  r = await req('POST', '/school-admin/teachers', { token: S.sa1, data: teacher2 })
  check('C4-2 创建教师2', r.status === 201 || r.status === 200)
  S.teacher2 = r.data?.id

  r = await req('POST', '/school-admin/teachers', { token: S.sa1, data: { name: '重复用户', username: `zhang_${TS}`, password: 'Teacher123' } })
  check('G4 重复 username 教师 → 400', r.status === 400 || r.status === 409, `status=${r.status}`)

  r = await req('POST', '/school-admin/teachers/batch', { token: S.sa1, data: { teachers: [{ name: '王老师', subject: '英语' }, { name: '赵老师', subject: '科学' }] } })
  check('C4-3 批量创建教师', r.status === 201 || r.status === 200, JSON.stringify(r.data).slice(0, 80))

  r = await req('GET', '/school-admin/teachers', { token: S.sa1 })
  check('C4-4 教师列表', r.status === 200 && Array.isArray(r.data?.items ?? r.data))

  r = await req('PATCH', `/school-admin/teachers/${S.teacher1}/features`, { token: S.sa1, data: { features: ALL_FEATURES } })
  check('C5-1 教师功能包', r.status === 200)

  // ========== 5. 教师登录 + 班级/学生 ==========
  console.log('— 教师：登录与班级学生 —')
  r = await login(teacher1.username, teacher1.password)
  check('A3 教师 password 登录', (r.status === 200 || r.status === 201) && r.data.role === 'teacher', `status=${r.status} ${JSON.stringify(r.data).slice(0, 80)}`)
  S.teacher = r.data.token

  r = await req('POST', '/auth/change-password', { token: S.teacher, data: { oldPassword: 'bad', newPassword: 'newpass123' } })
  check('A4-1 改密-原密码错误拒绝', r.status === 400 || r.status === 401, `status=${r.status} ${JSON.stringify(r.data).slice(0, 80)}`)
  r = await req('POST', '/auth/change-password', { token: S.teacher, data: { oldPassword: teacher1.password, newPassword: 'Teacher456' } })
  check('A4-2 改密-正确原密码', r.status === 200 || r.status === 201, `status=${r.status} ${JSON.stringify(r.data).slice(0, 80)}`)
  S.teacherPass = 'Teacher456'

  // 先给校管创建班级
  r = await req('POST', '/school-admin/classes', { token: S.sa1, data: { name: '三年一班', grade: '三年级', classNo: '1', headTeacher: '张老师', headTeacherId: S.teacher1, term: '2026春' } })
  check('C6-1 校管创建班级', r.status === 201 || r.status === 200, JSON.stringify(r.data).slice(0, 120))
  S.class1 = r.data?.id
  // 一师一班规则：class2 由李老师担任班主任（张老师已是 class1 班主任）
  r = await req('POST', '/school-admin/classes', { token: S.sa1, data: { name: '三年二班', grade: '三年级', classNo: '2', headTeacher: '李老师', headTeacherId: S.teacher2, term: '2026春' } })
  check('C6-2 创建班级2', r.status === 201 || r.status === 200, JSON.stringify(r.data).slice(0, 100))
  S.class2 = r.data?.id

  r = await req('POST', `/school-admin/classes/${S.class1}/promote`, { token: S.sa1, data: { targetGrade: '四年级' } })
  check('C6-3 班级升级', r.status === 200 || r.status === 201, JSON.stringify(r.data).slice(0, 80))

  // 教师端班级列表（teacherId 隔离：只能看自己班级）
  r = await req('GET', '/classes', { token: S.teacher, params: { take: 50 } })
  check('D1-1 教师班级列表', r.status === 200 && Array.isArray(r.data?.items ?? r.data), JSON.stringify(r.data).slice(0, 80))

  r = await req('POST', '/classes', { token: S.teacher, data: { name: '临时测试班', grade: '一年级', classNo: '9', headTeacher: '张老师', term: '2026春' } })
  check('D1-2 教师自建班级 → 拒绝(需校管)', r.status === 403, `status=${r.status} ${JSON.stringify(r.data).slice(0, 80)}`)
  S.classTmp = r.data?.id
  if (S.classTmp) {
    r = await req('DELETE', `/classes/${S.classTmp}`, { token: S.teacher })
    check('D1-3 删除临时班级', r.status === 200)
  }

  // 学生：教师端创建（班级归属校验）
  const st1 = { name: '小明', gender: '男', studentNo: `XS${TS}01`, parentName: '明父', parentPhone: '13900000001', classId: S.class1 }
  const st2 = { name: '小红', gender: '女', studentNo: `XS${TS}02`, parentName: '红母', parentPhone: '13900000002', classId: S.class1 }
  r = await req('POST', '/students', { token: S.teacher, data: st1 })
  check('D3-1 教师创建学生1', r.status === 201 || r.status === 200, JSON.stringify(r.data).slice(0, 120))
  S.student1 = r.data?.id
  r = await req('POST', '/students', { token: S.teacher, data: st2 })
  check('D3-2 创建学生2', r.status === 201 || r.status === 200)
  S.student2 = r.data?.id

  r = await req('POST', '/students', { token: S.teacher, data: { name: '重复小明', gender: '男', studentNo: `XS${TS}01`, classId: S.class1 } })
  check('G3 重复学号学生 → 失败', r.status === 400 || r.status === 409, `status=${r.status} ${JSON.stringify(r.data).slice(0, 80)}`)

  r = await req('GET', '/students', { token: S.teacher, params: { classId: S.class1 } })
  check('D3-3 学生列表(classId)', r.status === 200 && Array.isArray(r.data?.items ?? r.data))

  r = await req('PATCH', `/students/${S.student1}`, { token: S.teacher, data: { address: '测试地址' } })
  check('D3-4 更新学生', r.status === 200)

  // 家长登录开通
  r = await req('POST', `/students/${S.student1}/toggle-parent-login`, { token: S.teacher })
  check('D3-5 开通家长登录', r.status === 200 || r.status === 201, JSON.stringify(r.data).slice(0, 120))
  S.parentPwd = r.data?.initialPassword || '123456'
  S.student1No = st1.studentNo

  r = await req('POST', `/students/${S.student1}/reset-parent-password`, { token: S.teacher, data: { password: '' } })
  check('D3-6 重置家长口令', r.status === 200 || r.status === 201, JSON.stringify(r.data).slice(0, 100))
  S.parentPwd = r.data?.defaultPassword || S.parentPwd

  // ========== 6. 考试/成绩 ==========
  console.log('— 教师：考试与成绩 —')
  r = await req('POST', '/exams', { token: S.teacher, data: { name: `期中考试${TS}`, classId: S.class1, subjects: ['语文'], date: '2026-06-01', term: '2026春', teacherName: '张老师' } })
  check('D4-1 创建考试', r.status === 201 || r.status === 200, JSON.stringify(r.data).slice(0, 120))
  S.exam1 = r.data?.id

  // 用幂等 merge 提交成绩（与小程序端 mergeGrades 一致；考试创建时已自动建空成绩单）
  r = await req('POST', '/grades/merge', { token: S.teacher, data: { classId: S.class1, examId: S.exam1, subject: '语文', examName: `期中考试${TS}`, date: '2026-06-01', scores: [{ studentId: S.student1, score: 92 }, { studentId: S.student2, score: 85 }] } })
  check('D5-1 录成绩(merge幂等)', r.status === 200 || r.status === 201, JSON.stringify(r.data).slice(0, 120))
  S.grade1 = r.data?.id
  // 幂等：同一 班级+考试+科目 再次提交 merge，不新增重复记录（created=false 且列表仍仅一条）
  r = await req('POST', '/grades/merge', { token: S.teacher, data: { classId: S.class1, examId: S.exam1, subject: '语文', examName: `期中考试${TS}`, date: '2026-06-01', scores: [{ studentId: S.student1, score: 95 }] } })
  check('D5-2 重复提交merge幂等', (r.status === 200 || r.status === 201) && r.data?.created === false, `status=${r.status} ${JSON.stringify(r.data).slice(0, 80)}`)
  r = await req('GET', '/grades', { token: S.teacher, params: { classId: S.class1, examName: `期中考试${TS}` } })
  check('D5-2b 该考试仅一条成绩记录', r.status === 200 && listOf(r.data).length === 1, `count=${listOf(r.data).length}`)

  // web 端路径：import-preview / import-commit（按 学号/姓名 定位学生批量录入）
  r = await req('POST', '/grades/import-preview', { token: S.teacher, data: { classId: S.class1, filename: 'scores.csv', data: Buffer.from(`学号,分数\n${st1.studentNo},88\n${st2.studentNo},90\n`).toString('base64') } })
  check('D5-2c 成绩导入预览(import-preview)', r.status === 200 || r.status === 201, `status=${r.status} ${JSON.stringify(r.data).slice(0, 100)}`)
  r = await req('POST', '/grades/import-commit', { token: S.teacher, data: { classId: S.class1, examName: `期中考试${TS}`, examId: S.exam1, subject: '数学', date: '2026-06-01', rows: [{ studentId: S.student1, score: 88, valid: true, name: '小明', studentNo: st1.studentNo }, { studentId: S.student2, score: 90, valid: true, name: '小红', studentNo: st2.studentNo }] } })
  check('D5-2d 成绩导入提交(import-commit)', r.status === 200 || r.status === 201, `status=${r.status} ${JSON.stringify(r.data).slice(0, 100)}`)
  r = await req('POST', '/grades/import-commit', { token: S.teacher, data: { classId: S.class1, examName: `期中考试${TS}`, examId: S.exam1, subject: '数学', date: '2026-06-01', rows: [{ studentId: S.student1, score: 89, valid: true }] } })
  check('D5-2e 重复import-commit幂等', r.status === 200 || r.status === 201, `status=${r.status} ${JSON.stringify(r.data).slice(0, 100)}`)

  r = await req('GET', '/grades', { token: S.teacher, params: { classId: S.class1, examName: `期中考试${TS}` } })
  check('D5-3 成绩列表', r.status === 200 && Array.isArray(r.data?.items ?? r.data))

  r = await req('GET', `/grades/analysis/exam`, { token: S.teacher, params: { classId: S.class1, examId: S.exam1 } })
  check('D5-4 考试分析', r.status === 200, JSON.stringify(r.data).slice(0, 100))

  r = await req('GET', `/grades/analysis/rank`, { token: S.teacher, params: { classId: S.class1, examId: S.exam1, subject: '语文' } })
  check('D5-5 班级排名', r.status === 200)

  r = await req('GET', `/grades/analysis/student/${S.student1}`, { token: S.teacher })
  check('D5-6 学生成绩历史', r.status === 200)

  r = await req('GET', '/grades/export', { token: S.teacher, params: { classId: S.class1 } })
  check('D5-7 成绩导出', r.status === 200)

  r = await req('GET', '/leaderboard', { token: S.teacher, params: { classId: S.class1 } })
  check('F10 排行榜', r.status === 200, JSON.stringify(r.data).slice(0, 100))

  // ========== 7. 业务数据（动态CRUD 冒烟） ==========
  console.log('— 动态 CRUD 冒烟 —')
  const smoke = [
    ['POST /notes', '/notes', { title: '笔记1', content: '正文' }],
    ['POST /todos', '/todos', { title: '待办1', done: false }],
    ['POST /checkins', '/checkins', { studentId: S.student1, studentName: '小明', type: 'reading', date: '2026-08-13' }],
    ['POST /duty-rosters', '/duty-rosters', { classId: S.class1, name: '值日表1', type: 'weekly', assignments: [] }],
    ['POST /lesson-observations', '/lesson-observations', { classId: S.class1, className: '三年一班', teacherName: '张老师', subject: '语文', topic: '课题1', date: '2026-08-13' }],
    ['POST /work-logs', '/work-logs', { date: '2026-08-13', classCount: 1, content: '日志' }],
    ['POST /reading-logs', '/reading-logs', { studentId: S.student1, studentName: '小明', bookTitle: '安徒生童话', date: '2026-08-13' }],
    ['POST /growth-entries', '/growth-entries', { studentId: S.student1, studentName: '小明', type: '成长记录', date: '2026-08-13', title: '进步' }],
    ['POST /behavior-records', '/behavior-records', { studentId: S.student1, studentName: '小明', date: '2026-08-13', behavior: '表现良好' }],
    ['POST /reward-records', '/reward-records', { classId: S.class1, studentId: S.student1, type: '加分', points: 10, reason: '表现好', date: '2026-08-13' }],
    ['POST /score-records', '/score-records', { studentId: S.student1, studentName: '小明', classId: S.class1, delta: 5, reason: '加分' }],
    ['POST /group-scores', '/group-scores', { classId: S.class1, name: '一组', points: 8 }],
    ['POST /award-records', '/award-records', { name: '进步奖', issuer: '学校', date: '2026-08-13' }],
    ['POST /award-categories', '/award-categories', { name: '学习类' }],
    ['POST /class-expenses', '/class-expenses', { classId: S.class1, type: '班费', date: '2026-08-13', amount: 100 }],
    ['POST /class-activities', '/class-activities', { title: '春游', date: '2026-05-01', classId: S.class1 }],
    ['POST /class-duty-configs', '/class-duty-configs', { classId: S.class1, duties: [], assignments: {} }],
    ['POST /parent-contacts', '/parent-contacts', { studentId: S.student1, studentName: '小明', parentName: '明父', relation: '父亲', phone: '13900000001', method: '微信', content: '沟通内容', date: '2026-08-13' }],
    ['POST /notice-templates', '/notice-templates', { title: '通知模板1', content: '模板', category: '班级通知' }],
    ['POST /home-visits', '/home-visits', { studentId: S.student1, studentName: '小明', date: '2026-08-13', content: '家访' }],
    ['POST /seat-layouts', '/seat-layouts', { classId: S.class1, name: '座位表1', rows: 4, cols: 6, seats: [[null]] }],
    ['POST /my-galleries', '/my-galleries', { title: '相册1', url: 'https://example.com/a.png' }],
    ['POST /schedules', '/schedules', { classId: S.class1, dayOfWeek: 1, period: 1, subject: '语文' }],
    ['POST /attendances', '/attendances', { classId: S.class1, date: '2026-08-13', records: [{ studentId: S.student1, status: '出勤' }] }],
    ['POST /homework', '/homework', { classId: S.class1, subject: '语文', title: '作业1', content: 'P1', deadline: '2026-08-20' }],
    ['POST /notices', '/notices', { classId: S.class1, title: '班级通知1', content: '通知' }],
    ['POST /resources', '/resources', { classId: S.class1, title: '资源1', url: 'https://example.com' }],
    ['POST /class-galleries', '/class-galleries', { classId: S.class1, title: '风采1', url: 'https://example.com/b.png' }],
    ['POST /semesters', '/semesters', { name: '2026春', startDate: '2026-02-01', endDate: '2026-07-01' }],
    ['POST /math-mistakes', '/math-mistakes', { classId: S.class1, studentName: '小明', question: '1+1=?', knowledgePoint: '加法' }],
  ]
  for (const [label, url, data] of smoke) {
    r = await req('POST', url, { token: S.teacher, data })
    check(`SMOKE ${label}`, r.status === 201 || r.status === 200, `status=${r.status} ${JSON.stringify(r.data).slice(0, 80)}`)
  }

  // ========== 8. 班级协作接口 ==========
  console.log('— 班级协作 —')
  r = await req('POST', `/classes/${S.class1}/members/list`, { token: S.teacher })
  check('D2-1 班级成员列表', r.status === 200 || r.status === 201)
  r = await req('POST', '/classes/school-teachers', { token: S.teacher })
  check('D2-2 本校教师列表', r.status === 200 || r.status === 201)
  r = await req('POST', `/classes/${S.class1}/members`, { token: S.teacher, data: { teacherId: S.teacher2, subjects: ['数学'] } })
  check('D2-3 添加科任', r.status === 200 || r.status === 201, JSON.stringify(r.data).slice(0, 100))
  r = await req('GET', `/classes/${S.class1}/dashboard`, { token: S.teacher })
  check('D2-4 班级看板', r.status === 200)

  // 家长功能包管理（班主任配置家长可见功能）
  r = await req('GET', `/classes/${S.class1}/parent-features`, { token: S.teacher })
  check('D2-5 家长功能包读取(班主任)', r.status === 200 && Array.isArray(r.data?.options) && r.data?.configured === false, `status=${r.status} ${JSON.stringify(r.data).slice(0, 100)}`)
  r = await req('PATCH', `/classes/${S.class1}/parent-features`, { token: S.teacher, data: { features: ['grades', 'homework'] } })
  check('D2-6 家长功能包写入(班主任)', r.status === 200 || r.status === 201, `status=${r.status} ${JSON.stringify(r.data).slice(0, 100)}`)
  r = await req('GET', `/classes/${S.class1}/parent-features`, { token: S.teacher })
  check('D2-7 家长功能包已配置生效', r.status === 200 && r.data?.configured === true && Array.isArray(r.data?.features) && r.data.features.includes('grades') && r.data.features.includes('homework'), `status=${r.status} ${JSON.stringify(r.data).slice(0, 100)}`)
  r = await req('PATCH', `/classes/${S.class1}/parent-features`, { token: S.teacher2, data: { features: ['notices'] } })
  check('D2-8 非班主任写入 → 拒绝', r.status === 401 || r.status === 403, `status=${r.status}`)
  r = await req('PATCH', `/classes/${S.class1}/parent-features`, { token: S.teacher, data: { features: null } })
  check('D2-9 恢复跟随默认', r.status === 200 || r.status === 201, `status=${r.status}`)
  r = await req('GET', `/classes/${S.class1}/parent-features`, { token: S.teacher })
  check('D2-10 已恢复默认(configured=false)', r.status === 200 && r.data?.configured === false, `status=${r.status} ${JSON.stringify(r.data).slice(0, 100)}`)

  // ========== 9. 消息/通知/配置 ==========
  console.log('— 消息/通知/配置 —')
  r = await req('GET', '/messages/recipients', { token: S.teacher })
  check('F2-1 消息收件人', r.status === 200 && Array.isArray(r.data?.items ?? r.data))
  const recips = listOf(r.data)
  const firstRec = recips[0]
  if (firstRec) {
    r = await req('POST', '/messages', { token: S.teacher, data: { recipientId: firstRec.id || firstRec.recipientId, recipientRole: firstRec.role || firstRec.recipientRole, title: '测试消息', content: '你好家长', type: 'direct' } })
    check('F2-2 发送消息', r.status === 201 || r.status === 200, JSON.stringify(r.data).slice(0, 100))
    S.msg1 = r.data?.id || r.data?.message?.id
  } else {
    check('F2-2 发送消息', false, '无可用收件人')
  }
  r = await req('GET', '/messages', { token: S.teacher })
  check('F2-3 消息列表', r.status === 200)
  r = await req('GET', '/messages/unread-count', { token: S.teacher })
  check('F2-4 未读数', r.status === 200)

  r = await req('GET', '/notifications', { token: S.teacher })
  check('F3-1 通知列表', r.status === 200 && Array.isArray(r.data?.items ?? r.data))

  r = await req('GET', '/config/public', { token: S.teacher })
  check('F6-1 公共配置', r.status === 200)
  r = await req('GET', '/config/app-config', { token: S.teacher })
  check('F6-2 应用配置', r.status === 200)
  r = await req('GET', '/config/ai-providers', { token: S.teacher })
  check('F6-3 AI服务商列表', r.status === 200)
  r = await req('GET', '/ai-providers', { token: S.teacher })
  check('F7-1 ai-providers', r.status === 200)

  // ========== 10. 游戏得分 幂等 ==========
  console.log('— 游戏得分幂等 —')
  const gk = 'test2048' + TS
  r = await req('POST', '/game-scores', { token: S.teacher, data: { gameKey: gk, gameName: '2048测试', score: 100, durationSec: 60 } })
  check('F4-1 上报得分1', r.status === 201 || r.status === 200, JSON.stringify(r.data).slice(0, 100))
  r = await req('POST', '/game-scores', { token: S.teacher, data: { gameKey: gk, gameName: '2048测试', score: 120, durationSec: 90 } })
  check('F4-2 上报得分2(更高)', r.status === 200 || r.status === 201, `status=${r.status}`)
  r = await req('POST', '/game-scores', { token: S.teacher, data: { gameKey: gk, gameName: '2048测试', score: 50, durationSec: 30 } })
  check('F4-3 上报得分3(更低)', r.status === 200 || r.status === 201, `status=${r.status}`)
  r = await req('GET', `/game-scores/${gk}`, { token: S.teacher })
  check('G1 单游戏最高分=120 且不重复', r.status === 200 && r.data?.bestScore === 120 && r.data?.playCount === 3, JSON.stringify(r.data).slice(0, 120))
  r = await req('GET', '/game-scores', { token: S.teacher })
  check('F4-4 游戏榜单', r.status === 200 && Array.isArray(r.data?.items ?? r.data))

  // ========== 11. AI 会话 ==========
  console.log('— AI 会话 —')
  r = await req('POST', '/chat-sessions', { token: S.teacher, data: { title: '测试会话' } })
  check('F5-1 创建会话', r.status === 201 || r.status === 200, JSON.stringify(r.data).slice(0, 80))
  S.session1 = r.data?.id
  if (S.session1) {
    r = await req('PATCH', `/chat-sessions/${S.session1}/messages`, { token: S.teacher, data: { role: 'user', content: '你好' } })
    check('F5-2 追加消息', r.status === 200)
    r = await req('PATCH', `/chat-sessions/${S.session1}/pin`, { token: S.teacher })
    check('F5-3 置顶切换', r.status === 200)
    r = await req('GET', `/chat-sessions/${S.session1}`, { token: S.teacher })
    check('F5-4 会话详情', r.status === 200)
    r = await req('DELETE', `/chat-sessions/${S.session1}`, { token: S.teacher })
    check('F5-5 删除会话', r.status === 200)
  }

  // ========== 12. 资源/教材/在线资源/日历/分析 ==========
  console.log('— 资源/教材/日历/分析 —')
  r = await req('GET', '/resource-library/poems', { token: S.teacher })
  check('F8-1 资源库-诗词', r.status === 200 && Array.isArray(r.data?.items ?? r.data))
  r = await req('GET', '/textbooks/tree', { token: S.teacher })
  check('F8-2 教材树', r.status === 200)
  r = await req('GET', '/online-resources/zhzx/courses', { token: S.teacher })
  check('F8-3 在线资源课程', r.status === 200)
  r = await req('POST', '/teaching-calendar', { token: S.teacher, data: { title: '春游', date: '2026-05-01' } })
  check('F9-1 教学日历创建', r.status === 201 || r.status === 200)
  r = await req('GET', '/teaching-calendar', { token: S.teacher, params: { year: 2026, month: 5 } })
  check('F9-2 教学日历按月查', r.status === 200)
  r = await req('GET', '/analysis/class-trend', { token: S.teacher, params: { classId: S.class1, subject: '语文' } })
  check('F11-1 班级趋势', r.status === 200)
  r = await req('GET', '/analysis/subject-strength', { token: S.teacher, params: { classId: S.class1 } })
  check('F11-2 学科强弱', r.status === 200)
  r = await req('GET', '/analysis/student-trend', { token: S.teacher, params: { studentId: S.student1, classId: S.class1 } })
  check('F11-3 学生趋势', r.status === 200)

  // ========== 13. 越权用例 ==========
  console.log('— 越权与权限 —')
  r = await req('GET', '/admin/schools', { token: S.teacher })
  check('F15-1 教师访问超管接口 → 拒绝', r.status === 401 || r.status === 403, `status=${r.status}`)
  r = await req('GET', '/school-admin/teachers', { token: S.teacher })
  check('F15-2 教师访问校管接口 → 拒绝', r.status === 401 || r.status === 403, `status=${r.status}`)
  r = await req('GET', '/admin/schools', { token: S.sa1 })
  check('F15-3 校管访问超管接口 → 拒绝', r.status === 401 || r.status === 403, `status=${r.status}`)
  r = await req('GET', '/classes', {})
  check('F15-4 无 token 访问受保护接口 → 401', r.status === 401, `status=${r.status}`)

  // 分页边界
  r = await req('GET', '/students', { token: S.teacher, params: { take: 999999 } })
  check('F16-1 take 超限被截断(不500)', r.status === 200, `status=${r.status}`)
  r = await req('GET', '/students', { token: S.teacher, params: { skip: -5, take: 10 } })
  check('F16-2 skip 负数(不500)', r.status === 200, `status=${r.status}`)

  // ========== 14. 家长端 ==========
  console.log('— 家长端 —')
  r = await req('POST', '/parent-auth/login', { data: { studentNo: S.student1No, password: S.parentPwd } })
  check('E1 家长登录(学号+口令)', (r.status === 200 || r.status === 201) && r.data?.token && r.data?.parent?.studentNo === S.student1No, `status=${r.status} ${JSON.stringify(r.data).slice(0, 100)}`)
  if ((r.status === 200 || r.status === 201) && r.data?.token) {
    S.parent = r.data.token
    const pGet = ['/parent-auth/me', '/parent-auth/notices', '/parent-auth/exams', '/parent-auth/homework', '/parent-auth/attendance', '/parent-auth/behavior', '/parent-auth/schedule', '/parent-auth/communications', '/parent-auth/teachers', '/parent-auth/bindings']
    for (const u of pGet) {
      const rr = await req('GET', u, { token: S.parent })
      check(`E2 GET ${u}`, rr.status === 200, `status=${rr.status}`)
    }
    r = await req('GET', '/parent-auth/compare-kids', { token: S.parent })
    check('E2-10 多娃对比', r.status === 200)
    r = await req('GET', '/parent-auth/me', { token: S.parent })
    check('E2-11 家长功能包(effectiveFeatures 数组下发)', r.status === 200 && Array.isArray(r.data?.effectiveFeatures), `status=${r.status} ${JSON.stringify(r.data).slice(0, 120)}`)

    r = await req('POST', '/parent-auth/change-password', { token: S.parent, data: { oldPassword: S.parentPwd, newPassword: 'Parent456' } })
    check('E3 家长改密', r.status === 200 || r.status === 201, JSON.stringify(r.data).slice(0, 80))
    S.parentPwd = 'Parent456'

    r = await req('POST', '/parent-auth/student-update-request', { token: S.parent, data: { payload: { address: '新地址123' } } })
    check('E5-1 提交信息修改申请', r.status === 201 || r.status === 200, JSON.stringify(r.data).slice(0, 100))
    r = await req('GET', '/parent-auth/student-update-requests', { token: S.parent })
    check('E5-2 申请记录', r.status === 200)
  } else {
    check('E2 家长子接口(跳过-登录失败)', false, '家长登录失败，无法继续')
  }

  // 教师审核申请
  r = await req('GET', '/student-info-updates', { token: S.teacher })
  check('D-家长申请教师可见', r.status === 200 && Array.isArray(r.data?.items ?? r.data))

  // ========== 15. 校管只读学术 ==========
  console.log('— 校管学术只读 —')
  const acad = ['/school-admin/academic/exams', '/school-admin/academic/grades', '/school-admin/academic/summary', '/school-admin/academic/class-comparison']
  for (const u of acad) {
    const q = u.includes('grades') || u.includes('summary') ? { classId: S.class1 } : { classId: S.class1 }
    const rr = await req('GET', u, { token: S.sa1, params: q })
    check(`C11 ${u}`, rr.status === 200, `status=${rr.status}`)
  }
  r = await req('GET', '/school-admin/academic/class-trend', { token: S.sa1, params: { classId: S.class1 } })
  check('C11-5 班级趋势', r.status === 200)
  r = await req('GET', '/school-admin/homework', { token: S.sa1 })
  check('C12 作业聚合', r.status === 200)
  r = await req('GET', '/school-admin/search', { token: S.sa1, params: { q: '小明' } })
  check('C10 全局搜索', r.status === 200)

  // ========== 16. 健康 ==========
  r = await req('GET', '/health')
  check('F13-1 健康检查(公开)', r.status === 200 && r.data?.status === 'ok')
  r = await req('GET', '/health/cache')
  check('F13-2 缓存健康', r.status === 200)

  // ========== 性能/并发 ==========
  console.log('— 性能与并发 —')
  const t1 = Date.now()
  r = await req('GET', '/students', { token: S.teacher, params: { take: 100 } })
  const dur = Date.now() - t1
  check('G6 列表查询响应<1000ms', r.status === 200 && dur < 1000, `耗时${dur}ms`)

  // 并发创建 20 个学生（带 50ms 间隔避免触发全局限流器 60/min）
  const conc = []
  for (let i = 0; i < 20; i++) {
    conc.push(new Promise((resolve) => {
      setTimeout(() => resolve(req('POST', '/students', { token: S.teacher, data: { name: `并发${i}`, gender: '男', studentNo: `BF${TS}${i}`, classId: S.class1 } })), i * 50)
    }))
  }
  const concRes = await Promise.all(conc)
  const concOk = concRes.filter(x => x.status === 201 || x.status === 200).length
  const concFailures = concRes.filter(x => x.status !== 201 && x.status !== 200)
  if (concFailures.length) {
    console.log('  [并发失败样例] ' + concFailures.slice(0, 3).map(x => `${x.status} ${JSON.stringify(x.data).slice(0, 120)}`).join(' || '))
  }
  check('G5 并发20创建学生全部成功', concOk === 20, `成功${concOk}/20`)
  // 查重
  r = await req('GET', '/students', { token: S.teacher, params: { classId: S.class1, take: 200 } })
  const items = listOf(r.data)
  const dupNos = items.filter(s => s.studentNo?.startsWith(`BF${TS}`)).length
  check('G5-2 并发后学号无重复', dupNos === 20, `BF学生数=${dupNos}`)

  // 清理并发学生
  const bf = items.filter(s => s.studentNo?.startsWith(`BF${TS}`))
  for (const s of bf) await req('DELETE', `/students/${s.id}`, { token: S.teacher })

  // ========== 报告 ==========
  console.log('\n' + '='.repeat(60))
  console.log(`测试通过: ${passCount}   失败: ${failCount}   总耗时: ${((Date.now() - t0) / 1000).toFixed(1)}s`)
  console.log('='.repeat(60))
  const failed = results.filter(x => x.startsWith('[FAIL]'))
  if (failed.length) {
    console.log('\n--- 失败明细 ---')
    failed.forEach(f => console.log('  ' + f))
  }
  console.log('\n全部用例：')
  results.forEach(x => console.log('  ' + x))

  // 输出测试结果到文件
  const reportPath = process.env.REPORT_PATH || '/workspace/work-system/test/backend/api-test-report.txt'
  fs.writeFileSync(reportPath, results.join('\n') + `\n\nPASS=${passCount} FAIL=${failCount}\n`)
  console.log(`\n报告已写入: ${reportPath}`)
  process.exit(failCount ? 1 : 0)
}

async function safeMain() {
  try {
    await main()
  } catch (e) {
    console.error('测试执行异常:', e)
    const reportPath = process.env.REPORT_PATH || '/workspace/work-system/test/backend/api-test-report.txt'
    fs.writeFileSync(reportPath, results.join('\n') + `\n\nPASS=${passCount} FAIL=${failCount}\nERROR=${String(e?.message || e).slice(0, 300)}\n`)
    process.exit(2)
  }
}
safeMain()
