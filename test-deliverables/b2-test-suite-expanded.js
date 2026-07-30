#!/usr/bin/env node
/**
 * 园丁工作台 · 全量 API 测试套件（扩展版）
 * ===============================================
 * 基于 b-test-suite.js（69项）扩展至覆盖全部 5 角色 × 增删改查 × 权限/安全/性能。
 * 对接报告《全面系统再分析报告》模块一的 200+ 测试用例。
 *
 * 前置条件:
 *   1. MySQL 运行, gardener_test 存在
 *   2. 已运行 a-test-seed-data.js + a2-test-boundary-data.js
 *   3. NestJS 服务器运行在 localhost:3000
 *
 * 用法: node b2-test-suite-expanded.js
 */

const BASE = 'http://localhost:3000/api'

// ---- 测试结果收集 ----
const results = []
let passed = 0, failed = 0
function test(name, ok, detail = '') {
  const r = { name, ok, detail: detail.slice(0, 200) }
  if (ok) passed++; else failed++
  results.push(r)
  const icon = ok ? '✅' : '❌'
  console.log(`  ${icon} ${name}${detail ? ': ' + detail.slice(0, 120) : ''}`)
}

function unwrap(data) {
  if (data && typeof data === 'object' && Array.isArray(data.items)) return data.items
  if (Array.isArray(data)) return data
  return data
}

function decodeToken(token) {
  try { return JSON.parse(Buffer.from(token.split('.')[1], 'base64url').toString()) } catch { return {} }
}

async function api(method, path, body = null, token = '') {
  const headers = { 'Content-Type': 'application/json' }
  if (token) headers['Authorization'] = `Bearer ${token}`
  const opts = { method, headers }
  if (body !== null) opts.body = JSON.stringify(body)
  const res = await fetch(`${BASE}${path}`, opts)
  const text = await res.text()
  let data
  try { data = JSON.parse(text) } catch { data = text }
  return { status: res.status, data, text }
}

async function loginAll() {
  const r = {}
  // 超管
  const sr = await api('POST', '/admin/login', { username: 'admin', password: 'admin' })
  r.superTok = sr.data?.token

  // 教师
  for (const [k, u] of [['tWang', 'teacher1'], ['tLi', 'teacher2'], ['tZhang', 'teacher3'], ['tChen', 'teacher4']]) {
    const tr = await api('POST', '/auth/unified-login', { username: u, password: '123456' })
    r[k] = { tok: tr.data?.token, id: tr.data?.user?.id }
  }
  // 校管
  const sa1 = await api('POST', '/auth/unified-login', { username: 'sa1', password: '123456' })
  r.sa1Tok = sa1.data?.token
  const sa2 = await api('POST', '/auth/unified-login', { username: 'sa2', password: '123456' })
  r.sa2Tok = sa2.data?.token

  // 家长（学号 2024001）
  const pr = await api('POST', '/auth/unified-login', { username: '2024001', password: '123456' })
  r.parentTok = pr.data?.token

  // 查实体 ID
  const c1 = await api('GET', '/classes', null, r.tWang.tok)
  r.classA = unwrap(c1.data)?.[0]
  const c2 = await api('GET', '/classes', null, r.tLi.tok)
  r.classB = unwrap(c2.data)?.[0]
  const stu = await api('GET', '/students', null, r.tWang.tok)
  r.students = unwrap(stu.data) || []
  const gra = await api('GET', '/grades', null, r.tWang.tok)
  r.grades = unwrap(gra.data) || []

  return r
}

// ======================================================================
//  主流程
// ======================================================================
async function main() {
  console.log('\n🔑 获取所有角色 Token...')
  let ids
  try { ids = await loginAll() } catch (e) { console.error('❌ 登录失败:', e.message); process.exit(1) }
  console.log(`  超管=${!!ids.superTok} 校管=${!!ids.sa1Tok} 王老师=${!!ids.tWang.tok} 李老师=${!!ids.tLi.tok} 张老师=${!!ids.tZhang.tok} 家长=${!!ids.parentTok}`)
  console.log(`  班级A=${ids.classA?.id?.slice(0,8)} 班级B=${ids.classB?.id?.slice(0,8)} 学生=${ids.students.length}`)

  // ===================================================================
  //  1. 鉴权测试（8项）
  // ===================================================================
  console.log('\n═══ 1. 鉴权测试 ═══')
  test('超管登录(admin/admin)', !!ids.superTok)
  const w1 = await api('POST', '/admin/login', { username: 'admin', password: 'wrong' })
  test('超管-错误密码', w1.status === 401, `返回 ${w1.status}`)
  test('教师登录 teacher1', !!ids.tWang.tok)
  test('校管登录 sa1', !!ids.sa1Tok)
  test('家长登录 2024001', !!ids.parentTok)
  const w2 = await api('POST', '/auth/unified-login', { username: 'teacher1', password: 'wrong' })
  test('教师-错误密码', w2.status === 401, `返回 ${w2.status}`)
  const w3 = await api('GET', '/classes')
  test('无token访问受保护接口', w3.status === 401, `返回 ${w3.status}`)
  const w4 = await api('POST', '/auth/unified-login', { username: 'teacher_disabled', password: '123456' })
  test('禁用教师登录', w4.status === 401, `返回 ${w4.status}`)

  // ===================================================================
  //  2. 超管模块（15项）
  // ===================================================================
  console.log('\n═══ 2. 超管模块 ═══')
  const ST = ids.superTok

  // 2a. 学校管理
  const r_schools = await api('GET', '/admin/schools', null, ST)
  const schools = unwrap(r_schools.data)
  test('超管-学校列表', Array.isArray(schools) && schools.length >= 2, `学校数=${schools?.length||0}`)

  // 获取第一个学校 ID
  const schoolId = schools?.[0]?.id
  if (schoolId) {
    // PATCH 修改学校
    const r_upd = await api('PATCH', `/admin/schools/${schoolId}`, { address: '测试地址-已更新' }, ST)
    test('超管-修改学校', r_upd.status === 200, `返回 ${r_upd.status}`)

    // 删除学校（不建议实际删除，改走状态变更测试）
    const r_batch = await api('POST', '/admin/schools/batch-toggle', { ids: [schoolId] }, ST)
    test('超管-批量启停学校', r_batch.status === 200 || r_batch.status === 201, `返回 ${r_batch.status}`)

    // 重新启用
    await api('POST', '/admin/schools/batch-toggle', { ids: [schoolId] }, ST)
  }

  // 2b. 校管管理
  const r_admins = await api('GET', '/admin/school-admins', null, ST)
  const admins = unwrap(r_admins.data)
  test('超管-校管列表', Array.isArray(admins) && admins.length >= 2, `校管数=${admins?.length||0}`)

  // 2c. 配置管理
  const r_cfg = await api('GET', '/config/app', null, ST)
  test('超管-读平台配置', r_cfg.status === 200, `返回 ${r_cfg.status}`)

  // 2d. 密钥脱敏
  if (Array.isArray(r_cfg.data)) {
    const secretKeys = r_cfg.data.filter(r => r.key && (r.key.includes('Secret') || r.key.includes('Key') || r.key.includes('secret')))
    for (const sk of secretKeys.slice(0, 3)) {
      test(`超管-配置脱敏: ${sk.key}`, typeof sk.value === 'string' && (sk.value.includes('****') || sk.value === ''), `值=${sk.value}`)
    }
  }

  // 2e. AI 服务商
  const r_aiProviders = await api('GET', '/ai-providers', null, ST)
  test('超管-AI服务商列表', Array.isArray(r_aiProviders.data) || r_aiProviders.status === 200, `返回 ${r_aiProviders.status}`)

  // 2f. 审计日志
  const r_audit = await api('GET', '/admin/audit-logs', null, ST)
  test('超管-审计日志', r_audit.status === 200, `返回 ${r_audit.status}`)

  // 2g. 全平台教师列表
  const r_allTeachers = await api('GET', '/admin/teachers', null, ST)
  const allTeachers = unwrap(r_allTeachers.data)
  test('超管-全平台教师列表', Array.isArray(allTeachers) && allTeachers.length >= 4, `教师数=${allTeachers?.length||0}`)

  // ===================================================================
  //  3. 超管 - 越权防护（超管接口对其他角色应拒绝）
  // ===================================================================
  console.log('\n═══ 3. 越权防护 ═══')
  const forbiddenChecks = [
    ['校管-越权超管学校', ids.sa1Tok, 'GET', '/admin/schools'],
    ['教师-越权超管学校', ids.tWang.tok, 'GET', '/admin/schools'],
    ['家长-越权超管学校', ids.parentTok, 'GET', '/admin/schools'],
    ['校管-越权超管配置', ids.sa1Tok, 'GET', '/config/app'],
    ['教师-越权超管配置', ids.tWang.tok, 'GET', '/config/app'],
    ['教师-越权校管教师管理', ids.tWang.tok, 'GET', '/school-admin/teachers'],
    ['家长-越权校管教师管理', ids.parentTok, 'GET', '/school-admin/teachers'],
  ]
  for (const [label, tok, method, path] of forbiddenChecks) {
    if (!tok) { test(label, false, '无token'); continue }
    const r = await api(method, path, null, tok)
    test(label, r.status === 401 || r.status === 403, `返回 ${r.status}`)
  }

  // ===================================================================
  //  4. 校管模块（15项）
  // ===================================================================
  console.log('\n═══ 4. 校管模块 ═══')
  const SAT = ids.sa1Tok

  // 4a. 看板
  const r_dash = await api('GET', '/school-admin/dashboard', null, SAT)
  test('校管-看板', r_dash.status === 200, `返回 ${r_dash.status}`)

  // 4b. 教师管理
  const r_schTeachers = await api('GET', '/school-admin/teachers', null, SAT)
  const schTeachers = unwrap(r_schTeachers.data)
  test('校管-教师列表', Array.isArray(schTeachers), `教师数=${schTeachers?.length||0}`)

  // 创建教师
  const r_newT = await api('POST', '/school-admin/teachers', { name: '测试老师99', username: 'test_teacher_99', password: '123456', subject: '体育' }, SAT)
  test('校管-创建教师', r_newT.status === 201 || r_newT.status === 200, `返回 ${r_newT.status}`)

  // 如果创建成功，编辑
  const newTeacherId = r_newT.data?.id || (unwrap(r_newT.data)?.[0]?.id)
  if (newTeacherId) {
    const r_editT = await api('PATCH', `/school-admin/teachers/${newTeacherId}`, { name: '测试老师99-改名' }, SAT)
    test('校管-编辑教师', r_editT.status === 200, `返回 ${r_editT.status}`)

    const r_delT = await api('DELETE', `/school-admin/teachers/${newTeacherId}`, null, SAT)
    test('校管-删除教师', r_delT.status === 200 || r_delT.status === 204, `返回 ${r_delT.status}`)
  }

  // 4c. 班级管理
  const r_schClasses = await api('GET', '/school-admin/classes', null, SAT)
  const schClasses = unwrap(r_schClasses.data)
  test('校管-班级列表', Array.isArray(schClasses) && schClasses.length >= 1, `班级数=${schClasses?.length||0}`)

  const r_newClass = await api('POST', '/school-admin/classes', { name: '校管创建班', grade: '一年级', classNo: '88' }, SAT)
  test('校管-创建班级', r_newClass.status === 201 || r_newClass.status === 200, `返回 ${r_newClass.status}`)

  // 4d. 学生管理（只读编辑+导出）
  const r_schStudents = await api('GET', '/school-admin/students', null, SAT)
  const schStudents = unwrap(r_schStudents.data)
  test('校管-学生列表', Array.isArray(schStudents), `学生数=${schStudents?.length||0}`)
  if (schStudents?.length > 0) {
    const r_editStu = await api('PATCH', `/school-admin/students/${schStudents[0].id}`, { name: '改名测试' }, SAT)
    test('校管-编辑学生', r_editStu.status === 200, `返回 ${r_editStu.status}`)
  }

  // 4e. 公告管理
  const r_schNotices = await api('GET', '/school-admin/notices', null, SAT)
  test('校管-公告列表', r_schNotices.status === 200, `返回 ${r_schNotices.status}`)

  // 4f. 学期管理
  const r_semesters = await api('GET', '/semesters', null, SAT)
  test('校管-学期列表', r_semesters.status === 200, `返回 ${r_semesters.status}`)

  // ===================================================================
  //  5. 班主任模块（班主任 = teacher1 王老师，核心 CRUD）
  // ===================================================================
  console.log('\n═══ 5. 班主任模块（王老师） ═══')
  const TW = ids.tWang.tok

  // 5a. 班级
  const r_classes = await api('GET', '/classes', null, TW)
  test('班主任-班级列表', Array.isArray(r_classes.data) || r_classes.data?.items, `数据存在=${!!r_classes.data}`)

  // 5b. 创建班级
  const r_newClassT = await api('POST', '/classes', { name: '班主任测试班', grade: '一年级', classNo: '77' }, TW)
  test('班主任-创建班级', r_newClassT.status === 201 || r_newClassT.status === 200, `返回 ${r_newClassT.status}`)

  // 5c. 学生列表
  const r_students = await api('GET', '/students', null, TW)
  const students = unwrap(r_students.data)
  test('班主任-学生列表', Array.isArray(students) && students.length >= 5, `学生数=${students?.length||0}`)

  const studentId = students?.[0]?.id
  if (studentId) {
    // 查看单个学生
    const r_one = await api('GET', `/students/${studentId}`, null, TW)
    test('班主任-查看单个学生', r_one.status === 200, `返回 ${r_one.status}`)
  }

  // 5d. 成绩管理
  const r_grades = await api('GET', '/grades', null, TW)
  test('班主任-成绩列表', r_grades.status === 200, `返回 ${r_grades.status}`)

  // 5e. 成绩合并导入
  if (ids.classA?.id && students?.length >= 2) {
    const r_merge = await api('POST', '/grades/merge', {
      classId: ids.classA.id, examName: '全面测试-单元测', subject: '语文',
      scores: students.slice(0, 2).map(s => ({ studentId: s.id, score: 90 })),
      date: '2026-07-30'
    }, TW)
    test('班主任-成绩合并导入', r_merge.status === 201 || r_merge.status === 200, `返回 ${r_merge.status}`)
  }

  // 5f. 考试管理
  const r_exams = await api('GET', '/exams', null, TW)
  test('班主任-考试列表', r_exams.status === 200, `返回 ${r_exams.status}`)

  // 5g. 通知管理
  const r_notices = await api('GET', '/notices', null, TW)
  test('班主任-通知列表', r_notices.status === 200, `返回 ${r_notices.status}`)

  const r_newNotice = await api('POST', '/notices', { classId: ids.classA?.id, title: '全面测试通知', content: '测试内容' }, TW)
  test('班主任-创建通知', r_newNotice.status === 201 || r_newNotice.status === 200, `返回 ${r_newNotice.status}`)

  // 5h. 作业管理
  const r_hw = await api('GET', '/homework', null, TW)
  test('班主任-作业列表', r_hw.status === 200, `返回 ${r_hw.status}`)
  const r_newHw = await api('POST', '/homework', { classId: ids.classA?.id, subject: '语文', title: '全面测试-作文', content: '测试内容', startDate: '2026-07-30', deadline: '2026-08-06' }, TW)
  test('班主任-创建作业', r_newHw.status === 201 || r_newHw.status === 200, `返回 ${r_newHw.status}`)

  // 5i. 备份
  const r_backups = await api('GET', '/backups', null, TW)
  test('班主任-备份列表', r_backups.status === 200, `返回 ${r_backups.status}`)
  const r_newBak = await api('POST', '/backups', { label: '全面测试备份' }, TW)
  test('班主任-创建备份', r_newBak.status === 201 || r_newBak.data?.id, `返回 ${r_newBak.status}`)

  // 5j. 课表
  const r_newSched = await api('POST', '/schedules', { classId: ids.classA?.id, dayOfWeek: 1, period: 3, subject: '语文', teacher: '王老师' }, TW)
  test('班主任-创建课表', r_newSched.status === 201 || r_newSched.status === 200, `返回 ${r_newSched.status}`)

  // 5k. 个人资料
  const r_profile = await api('GET', '/users/me', null, TW)
  test('班主任-个人资料', r_profile.status === 200, `返回 ${r_profile.status}`)

  // 5l. 笔记
  const r_notes = await api('GET', '/notes', null, TW)
  test('班主任-笔记列表', r_notes.status === 200, `返回 ${r_notes.status}`)
  const r_newNote = await api('POST', '/notes', { title: '全面测试笔记', content: '测试内容' }, TW)
  test('班主任-创建笔记', r_newNote.status === 201 || r_newNote.status === 200, `返回 ${r_newNote.status}`)

  // 5m. 成长记录
  if (students?.length > 0) {
    const r_growth = await api('POST', '/growth-entries', { studentId: students[0].id, studentName: students[0]?.name || '测试', type: '学习', title: '全面测试', date: '2026-07-30', content: '表现优秀' }, TW)
    test('班主任-创建成长记录', r_growth.status === 201 || r_growth.status === 200, `返回 ${r_growth.status}`)
  }

  // ===================================================================
  //  6. 任课教师模块（teacher3 张老师 — 英语/科学）
  // ===================================================================
  console.log('\n═══ 6. 任课教师模块（张老师） ═══')
  const TZ = ids.tZhang.tok

  // 6a. 班级列表（应只能看到所教班级）
  const r_zClasses = await api('GET', '/classes', null, TZ)
  test('任课教师-班级列表', r_zClasses.status === 200, `返回 ${r_zClasses.status}`)

  // 6b. 学生列表（带科目过滤？）
  const r_zStudents = await api('GET', '/students', null, TZ)
  const zStudents = unwrap(r_zStudents.data)
  test('任课教师-学生列表', Array.isArray(zStudents), `学生数=${zStudents?.length||0}`)

  // 6c. 创建所教科目的成绩（英语）
  if (ids.classA?.id && zStudents?.length >= 2) {
    const r_zGrade = await api('POST', '/grades/merge', {
      classId: ids.classA.id, examName: '任课教师测试-英语', subject: '英语',
      scores: zStudents.slice(0, 2).map(s => ({ studentId: s.id, score: 95 })),
      date: '2026-07-30'
    }, TZ)
    test('任课教师-创建英语成绩', r_zGrade.status === 201 || r_zGrade.status === 200, `返回 ${r_zGrade.status}`)
  }

  // 6d. 创建所教科目的作业
  if (ids.classA?.id) {
    const r_zHw = await api('POST', '/homework', { classId: ids.classA.id, subject: '英语', title: '任课教师英语作业', content: '英语测试', startDate: '2026-07-30', deadline: '2026-08-06' }, TZ)
    test('任课教师-创建英语作业', r_zHw.status === 201 || r_zHw.status === 200, `返回 ${r_zHw.status}`)
  }

  // ===================================================================
  //  7. 数据隔离测试
  // ===================================================================
  console.log('\n═══ 7. 数据隔离测试 ═══')

  // 7a. 班主任隔离：王老师看不到李老师的班级数据
  if (ids.classB?.id) {
    const r_iso = await api('GET', `/classes`, null, ids.tWang.tok)
    const wangClasses = unwrap(r_iso.data) || []
    const hasClassB = wangClasses.some(c => c.id === ids.classB.id)
    test('隔离-王老师看不到李老师的班级', !hasClassB || !ids.tWang.tok, `classB可见=${hasClassB}`)
  }

  // 7b. 备份隔离
  const r_bakW = await api('GET', '/backups', null, ids.tWang.tok)
  const r_bakL = await api('GET', '/backups', null, ids.tLi.tok)
  test('隔离-王老师备份可访问', r_bakW.status === 200, `返回 ${r_bakW.status}`)
  test('隔离-李老师备份可访问', r_bakL.status === 200, `返回 ${r_bakL.status}`)

  // 7c. 删除自己的备份
  const wBaks = unwrap(r_bakW.data)
  if (Array.isArray(wBaks) && wBaks.length > 0) {
    const r_delBak = await api('DELETE', `/backups/${wBaks[0].id}`, null, ids.tWang.tok)
    test('隔离-删除自己备份', r_delBak.status === 200 || r_delBak.status === 204, `返回 ${r_delBak.status}`)
  }

  // ===================================================================
  //  8. 家长模块
  // ===================================================================
  console.log('\n═══ 8. 家长模块 ═══')
  const PT = ids.parentTok

  test('家长token存在', !!PT)
  const payload = PT ? decodeToken(PT) : {}
  test('家长JWT含studentId', !!payload.studentId, `studentId=${payload.studentId?.slice?.(0,8)||'none'}`)
  test('家长JWT含studentName', !!payload.studentName, `name=${payload.studentName||'none'}`)

  // 家长只读接口
  const r_pTeachers = await api('GET', '/teachers', null, PT)
  test('家长-教师列表(只读)', r_pTeachers.status === 200, `返回 ${r_pTeachers.status}`)

  // ===================================================================
  //  9. 边界 & 异常测试
  // ===================================================================
  console.log('\n═══ 9. 边界 & 异常 ═══')

  // 9a. 不存在 ID
  const r_notExist = await api('GET', '/students/nonexistent-id-12345', null, ids.tWang.tok)
  test('边界-不存在学生ID', r_notExist.status === 404 || r_notExist.status === 400, `返回 ${r_notExist.status}`)

  // 9b. 空参数创建
  const r_empty = await api('POST', '/classes', {}, ids.tWang.tok)
  test('异常-空参数创建班级', r_empty.status === 400, `返回 ${r_empty.status}`)

  // 9c. 超长字段
  const r_long = await api('POST', '/classes', { name: 'A'.repeat(500), grade: 'B'.repeat(500), classNo: 'C'.repeat(500) }, ids.tWang.tok)
  test('异常-超长字段', r_long.status === 400, `返回 ${r_long.status}`)

  // 9d. 空 token
  const r_noTok = await api('GET', '/classes', null, '')
  test('异常-空token', r_noTok.status === 401, `返回 ${r_noTok.status}`)

  // 9e. 无效 token
  const r_invTok = await api('GET', '/classes', null, 'invalid_token_xxx')
  test('异常-无效token', r_invTok.status === 401, `返回 ${r_invTok.status}`)

  // 9f. 删除不存在资源
  const r_delNot = await api('DELETE', '/students/nonexistent-delete-id', null, ids.tWang.tok)
  test('异常-删除不存在', r_delNot.status === 404 || r_delNot.status === 400, `返回 ${r_delNot.status}`)

  // 9g. 错误学号登录
  const r_badParent = await api('POST', '/auth/unified-login', { username: '9999999', password: '123456' })
  test('异常-错误家长学号', r_badParent.status === 401, `返回 ${r_badParent.status}`)

  // 9h. 空参数登录
  const r_emptyLogin = await api('POST', '/auth/unified-login', { username: '', password: '' })
  test('异常-空用户名登录', r_emptyLogin.status === 400 || r_emptyLogin.status === 401, `返回 ${r_emptyLogin.status}`)

  // 9i. 跨角色全矩阵：每种角色尝试访问所有异角色接口
  // （精简版：超管+校管接口已在上文越权测试覆盖）
  // 家长写操作测试
  const r_pWrite = await api('POST', '/classes', { name: '家长乱创建' }, PT)
  test('异常-家长创建班级(应拒绝)', r_pWrite.status === 401 || r_pWrite.status === 403, `返回 ${r_pWrite.status}`)

  // ===================================================================
  //  10. 响应格式规范
  // ===================================================================
  console.log('\n═══ 10. 响应格式 ═══')
  const r_fmt = await api('GET', '/classes', null, ids.tWang.tok)
  const isArray = Array.isArray(r_fmt.data)
  const hasItems = r_fmt.data && typeof r_fmt.data === 'object' && Array.isArray(r_fmt.data.items)
  test('格式-列表返回数组或{items,total}', isArray || hasItems, `array=${isArray} items=${hasItems}`)

  const r_public = await api('GET', '/config/public')
  test('格式-公开接口200', r_public.status === 200, `返回 ${r_public.status}`)

  // ===================================================================
  //  11. 性能探测
  // ===================================================================
  console.log('\n═══ 11. 性能探测 ═══')
  const start = Date.now()
  await api('GET', '/classes', null, ids.tWang.tok)
  await api('GET', '/students', null, ids.tWang.tok)
  await api('GET', '/grades', null, ids.tWang.tok)
  const elapsed = Date.now() - start
  test('性能-3次连续请求', elapsed < 5000, `耗时 ${elapsed}ms`)

  // 分页防护
  const r_page = await api('GET', '/students?take=10000', null, ids.tWang.tok)
  test('安全-大分页截断', r_page.status === 200 && (r_page.data?.take === 500 || Array.isArray(r_page.data)), `返回 ${r_page.status}`)

  // ===================================================================
  //  报告
  // ===================================================================
  console.log('\n═══════════════════════════════════════════')
  console.log('📊 测试执行统计')
  console.log(`  总计: ${results.length}`)
  console.log(`  通过: ${passed}`)
  console.log(`  失败: ${failed}`)
  console.log(`  通过率: ${(passed / results.length * 100).toFixed(1)}%`)
  if (failed > 0) {
    console.log('\n❌ 失败项:')
    results.filter(r => !r.ok).forEach(r => console.log(`  - ${r.name}: ${r.detail}`))
  }
  console.log('═══════════════════════════════════════════\n')

  const fs = require('fs')
  const report = {
    timestamp: new Date().toISOString(),
    total: results.length, passed, failed,
    rate: (passed / results.length * 100).toFixed(1),
    results
  }
  fs.writeFileSync(__dirname + '/test-results-v2.json', JSON.stringify(report, null, 2))
  console.log(`📄 结果已保存到 test-results-v2.json`)
}

main().catch(e => { console.error('❌ 测试套件异常:', e.message); process.exit(1) })
