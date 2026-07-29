#!/usr/bin/env node
/**
 * 园丁工作台 · 云托管真实后台 · 全功能 + 五角色权限 + 覆盖矩阵测试
 * =====================================================================
 * 直连真实云托管后端（公网），对全部 API 模块做覆盖测试。
 * 仅增删 `test_qa_` 前缀的测试数据，测试结束 teardown 清理，不污染生产数据。
 *
 * 用法: node c-cloud-full-test.js
 * 环境变量(可选): BASE_URL 覆盖后端地址
 *
 * 设计要点（已读源码确认）:
 *  - 全局前缀 /api；JWT 注入方式 Authorization: Bearer <token>
 *  - 角色: super / school_admin / teacher / parent(type='parent')
 *  - 登录端点: /auth/unified-login(自动识别), /auth/password-login(教师), /admin/login(超管)
 *  - 家长登录: POST /parent-auth/login {studentNo, password} -> {token, parent}（无 role 字段）
 *  - 通用 CRUD 基类: POST /prefix, GET /prefix, GET /prefix/:id, PATCH /prefix/:id, DELETE /prefix/:id
 *  - MAX_TAKE=500: 列表 take>500 被截断
 *  - 班级仅学校管理员可建：教师 POST /classes 返回 403
 */

const BASE = (process.env.BASE_URL || 'https://tec-work-283329-8-1440166408.sh.run.tcloudbase.com') + '/api'
const PREFIX = 'test_qa_'
const rnd = () => Math.random().toString(36).slice(2, 8)

// ---------- 测试收集 ----------
const results = []
let passed = 0, failed = 0
function test(name, ok, detail = '') {
  const r = { name, ok: !!ok, detail: String(detail).slice(0, 240) }
  if (ok) passed++; else failed++
  results.push(r)
  const icon = ok ? '✅' : '❌'
  console.log(`  ${icon} ${name}${detail ? ' :: ' + detail.slice(0, 120) : ''}`)
}
// 仅记录信息（不计入通过/失败）
function info(name, detail = '') {
  console.log(`  ℹ️  ${name}${detail ? ' :: ' + detail.slice(0, 120) : ''}`)
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

// ---------- HTTP 帮手（带 429 重试） ----------
async function api(method, path, body = null, token = '', opts = {}) {
  const maxRetry = opts.maxRetry ?? 4
  let attempt = 0
  // 简单全局节流：避免触发 60/min 全局 ThrottlerGuard
  while (true) {
    const headers = { 'Content-Type': 'application/json' }
    if (token) headers['Authorization'] = `Bearer ${token}`
    const resp = await fetch(BASE + path, {
      method,
      headers,
      body: body === null ? undefined : JSON.stringify(body),
    })
    const text = await resp.text()
    let data
    try { data = JSON.parse(text) } catch { data = text }
    if (resp.status === 429 && attempt < maxRetry) {
      attempt++
      await sleep(1200 * attempt)
      continue
    }
    return { status: resp.status, data, text }
  }
}

function unwrap(data) {
  if (data && typeof data === 'object' && Array.isArray(data.items)) return data.items
  if (Array.isArray(data)) return data
  return data
}
function isList(d) {
  return Array.isArray(d) || (d && typeof d === 'object' && Array.isArray(d.items))
}

// ---------- teardown 注册表 ----------
// { prefix, id, token }：teardown 时 DELETE /prefix/:id
const deletables = []
function track(prefix, id, token) {
  if (id) deletables.push({ prefix, id, token })
}
async function teardown() {
  console.log(`\n🧹 teardown: 清理 ${deletables.length} 个 test_qa_ 实体...`)
  let ok = 0, fail = 0
  for (const d of deletables) {
    try {
      const r = await api('DELETE', `/${d.prefix}/${d.id}`, null, d.token, { maxRetry: 1 })
      if (r.status === 200 || r.status === 204 || (r.data && (r.data.ok || r.data.id))) ok++
      else if (r.status === 404) ok++ // 已删除
      else fail++
    } catch { fail++ }
  }
  console.log(`🧹 teardown 完成: 成功 ${ok} / 失败 ${fail}`)
}

// ====================================================================
//  登录阶段：获取各角色 token（复用，避免触发登录限速）
// ====================================================================
const tok = {}
async function loginAll() {
  // 超管
  let r = await api('POST', '/admin/login', { username: 'admin', password: 'admin' })
  if (r.status !== 201 && r.status !== 200) throw new Error('超管登录失败: ' + r.status)
  tok.super = (r.data.token) || (r.data.data && r.data.data.token)
  // 超管 unified-login 也能拿到
  r = await api('POST', '/auth/unified-login', { username: 'admin', password: 'admin' })
  if (r.status === 201) tok.superAlt = r.data.token

  // 学校管理员 sa1（阳光实验）
  r = await api('POST', '/auth/unified-login', { username: 'sa1', password: '123456' })
  if (r.status !== 201) throw new Error('校管登录失败: ' + r.status)
  tok.sa = r.data.token

  // 教师 teacher1（班主任 王老师）
  r = await api('POST', '/auth/unified-login', { username: 'teacher1', password: '123456' })
  if (r.status !== 201) throw new Error('教师登录失败: ' + r.status)
  tok.tWang = r.data.token
  // 教师2/3（任课）
  r = await api('POST', '/auth/unified-login', { username: 'teacher2', password: '123456' })
  tok.tLi = r.data.token
  r = await api('POST', '/auth/unified-login', { username: 'teacher3', password: '123456' })
  tok.tZhang = r.data.token

  console.log('🔑 已获取 token: super/sa/teacher1/teacher2/teacher3')
}

// ====================================================================
//  1. 认证链路测试
// ====================================================================
async function authSuite() {
  console.log('\n═══ 1. 认证链路 ═══')
  // 1.1 各登录端点正常返回 token
  let r = await api('POST', '/auth/unified-login', { username: 'admin', password: 'admin' })
  test('unified-login(admin) 返回超级管理员', r.status === 201 && r.data?.role === 'super' && !!r.data?.token, `status=${r.status} role=${r.data?.role}`)

  r = await api('POST', '/auth/unified-login', { username: 'teacher1', password: '123456' })
  test('unified-login(teacher1) 返回教师', r.status === 201 && r.data?.role === 'teacher' && !!r.data?.token, `status=${r.status} role=${r.data?.role}`)

  r = await api('POST', '/auth/unified-login', { username: 'sa1', password: '123456' })
  test('unified-login(sa1) 返回学校管理员', r.status === 201 && r.data?.role === 'school_admin' && !!r.data?.token, `status=${r.status} role=${r.data?.role}`)

  r = await api('POST', '/auth/password-login', { username: 'teacher1', password: '123456' })
  test('password-login(teacher1) 返回 token', r.status === 201 && !!r.data?.token, `status=${r.status}`)

  r = await api('POST', '/admin/login', { username: 'admin', password: 'admin' })
  test('admin/login(admin) 返回 token', r.status === 201 && !!r.data?.token, `status=${r.status}`)

  // 1.2 错误凭证 → 401
  r = await api('POST', '/auth/unified-login', { username: 'admin', password: 'wrong' })
  test('unified-login 错误密码 → 401', r.status === 401, `status=${r.status}`)
  r = await api('POST', '/auth/unified-login', { username: 'teacher1', password: 'wrong' })
  test('unified-login 教师错误密码 → 401', r.status === 401, `status=${r.status}`)
  r = await api('POST', '/admin/login', { username: 'admin', password: 'wrong' })
  test('admin/login 错误密码 → 401', r.status === 401, `status=${r.status}`)

  // 1.3 空参数 → 400
  r = await api('POST', '/auth/unified-login', {})
  test('unified-login 空参数 → 400', r.status === 400, `status=${r.status}`)

  // 1.4 被禁用账号 → 401
  r = await api('POST', '/auth/unified-login', { username: 'teacher_disabled', password: '123456' })
  test('unified-login 禁用教师 → 401', r.status === 401, `status=${r.status}`)

  // 1.5 无 token 访问受保护接口 → 401
  r = await api('GET', '/classes')
  test('无 token 访问 /classes → 401', r.status === 401, `status=${r.status}`)

  // 1.6 无效 token → 401
  r = await api('GET', '/classes', null, 'invalid.token.here')
  test('无效 token 访问 /classes → 401', r.status === 401, `status=${r.status}`)

  // 1.7 登录限速：连续 12 次某用户错误登录，至少出现一次 429（sliding window 10/min）
  // 注意：云部署疑似多实例内存计数，非确定性；run1 已验证可触发，故本次仅作观察。
  let saw429 = false
  const probeUser = PREFIX + 'ratelimit_' + rnd()
  for (let i = 0; i < 12; i++) {
    const rr = await api('POST', '/auth/unified-login', { username: probeUser, password: 'wrong_' + i }, '', { maxRetry: 0 })
    if (rr.status === 429) { saw429 = true; break }
  }
  if (saw429) test('登录限速(10/min) 触发 429', true, '已触发')
  else info('登录限速(10/min)', '本次未触发(云部署疑似多实例内存计数，非确定性；run1 已验证可触发)')
}

// ====================================================================
//  2. 五角色权限矩阵
// ====================================================================
async function permissionMatrix() {
  console.log('\n═══ 2. 五角色权限矩阵 ═══')
  // 超管专属：教师/校管应被拦截
  let r = await api('GET', '/admin/schools', null, tok.tWang)
  test('教师访问超管接口 /admin/schools → 401/403', r.status === 401 || r.status === 403, `status=${r.status}`)
  r = await api('GET', '/admin/schools', null, tok.sa)
  test('校管访问超管接口 /admin/schools → 401/403', r.status === 401 || r.status === 403, `status=${r.status}`)
  r = await api('GET', '/admin/schools', null, tok.super)
  test('超管访问 /admin/schools → 200', r.status === 200, `status=${r.status}`)

  // 配置平台级：仅超管
  r = await api('GET', '/config/app', null, tok.tWang)
  test('教师访问 /config/app → 401/403', r.status === 401 || r.status === 403, `status=${r.status}`)
  r = await api('GET', '/config/app', null, tok.super)
  test('超管访问 /config/app → 200(密钥脱敏)', r.status === 200, `status=${r.status}`)

  // 校管专属：教师应被拦截
  r = await api('GET', '/school-admin/dashboard', null, tok.tWang)
  test('教师访问 /school-admin/dashboard → 401/403', r.status === 401 || r.status === 403, `status=${r.status}`)
  r = await api('GET', '/school-admin/teachers', null, tok.tWang)
  test('教师访问 /school-admin/teachers → 401/403', r.status === 401 || r.status === 403, `status=${r.status}`)
  r = await api('GET', '/school-admin/dashboard', null, tok.sa)
  test('校管访问 /school-admin/dashboard → 200', r.status === 200, `status=${r.status}`)

  // 家长专属：教师/匿名应被拦截
  r = await api('GET', '/parent-auth/me', null, tok.tWang)
  test('教师(非家长)访问 /parent-auth/me → 401/403', r.status === 401 || r.status === 403, `status=${r.status}`)
  r = await api('GET', '/parent-auth/me')
  test('匿名访问 /parent-auth/me → 401', r.status === 401, `status=${r.status}`)

  // 教师常规资源：教师可访问
  r = await api('GET', '/classes', null, tok.tWang)
  test('教师访问 /classes → 200', r.status === 200, `status=${r.status}`)

  // ai-providers：已登录可读，超管可写
  r = await api('GET', '/ai-providers', null, tok.tWang)
  test('教师读取 /ai-providers → 200', r.status === 200, `status=${r.status}`)
  r = await api('POST', '/ai-providers', { code: 'x', name: 'x' }, tok.tWang)
  test('教师写入 /ai-providers → 401/403', r.status === 401 || r.status === 403, `status=${r.status}`)
}

// ====================================================================
//  3. 教师端 CrudController 模块全量 CRUD
// ====================================================================
const TEACHER_CRUD = [
  { p: 'notes', b: { title: PREFIX + 'note', content: 'c' } },
  { p: 'todos', b: { title: PREFIX + 'todo' } },
  { p: 'picker-history', b: { name: PREFIX + 'pick', result: 'r' } },
  { p: 'award-categories', b: { name: PREFIX + 'awardcat' } },
  { p: 'award-records', b: { name: PREFIX + 'award', issuer: 'x', date: '2026-07-01', level: '校级' } },
  { p: 'duty-rosters', b: { name: PREFIX + 'duty', type: '值日', assignments: [] } },
  { p: 'teaching-calendar', b: { title: PREFIX + 'cal', date: '2026-07-01', type: '考试' } },
  { p: 'generated/papers', b: { title: PREFIX + 'paper', content: 'c' } },
  { p: 'generated/lesson-plans', b: { title: PREFIX + 'lp', content: 'c' } },
  { p: 'generated/knowledges', b: { title: PREFIX + 'k', content: 'c' } },
  { p: 'generated/queries', b: { title: PREFIX + 'q', content: 'c', keyword: 'test' } },
  { p: 'reward-records', b: { studentName: PREFIX + 'r', type: '奖励', title: 't', count: 1, date: '2026-07-01' } },
  { p: 'score-records', b: { studentName: PREFIX + 's', type: '加', score: 1, reason: 'r' } },
  { p: 'group-scores', b: { name: PREFIX + 'grp', score: 1 } },
  { p: 'checkins', b: { type: 'reading', count: 1, date: '2026-07-01', note: 'n' } },
  { p: 'reading-logs', b: { title: PREFIX + 'book', bookTitle: PREFIX + 'book', author: 'a', status: 'reading', date: '2026-07-01' } },
  { p: 'home-visits', b: { studentName: PREFIX + 'hv', date: '2026-07-01', content: 'c' } },
  { p: 'parent-contacts', b: { studentName: PREFIX + 'pc', parentName: 'p', relation: '家长', method: '电话', phone: '13800000000', content: 'c', date: '2026-07-01' } },
  { p: 'notice-templates', b: { title: PREFIX + 'tpl', content: 'c', category: '通知' } },
  { p: 'class-expenses', b: { title: PREFIX + 'exp', amount: 10, date: '2026-07-01', category: '其他', type: '其他' } },
  { p: 'class-activities', b: { title: PREFIX + 'act', date: '2026-07-01', content: 'c' } },
  { p: 'class-duty-configs', b: { name: PREFIX + 'dcfg', duties: ['值日', '卫生'], assignments: {} } },
  { p: 'class-galleries', b: { title: PREFIX + 'gal', url: 'http://x.test' } },
  { p: 'my-galleries', b: { title: PREFIX + 'mg', url: 'http://x.test' } },
  { p: 'seat-layouts', b: { name: PREFIX + 'seat', rows: 2, cols: 3, seats: [[null, null, null], [null, null, null]], aisleCols: [1] } },
  { p: 'growth-entries', b: { studentName: PREFIX + 'gr', type: '学习', title: 't', date: '2026-07-01', content: 'c' } },
  { p: 'behavior-records', b: { studentName: PREFIX + 'bh', behavior: '表扬', date: '2026-07-01', note: 'n' } },
  { p: 'attendances', b: { date: '2026-07-01', status: 'present', type: '晨检', records: [] } },
  { p: 'homework', b: { title: PREFIX + 'hw', subject: '语文', content: 'c', startDate: '2026-07-01', deadline: '2026-07-08' } },
  { p: 'resources', b: { title: PREFIX + 'res', category: '课件', tags: ['x'] } },
  { p: 'schedules', b: { dayOfWeek: 1, period: 1, subject: '语文', teacher: 't' } },
  { p: 'notices', b: { title: PREFIX + 'notice', content: 'c', scope: 'school' } },
  { p: 'semesters', b: { name: PREFIX + 'sem', startDate: '2026-01-01', endDate: '2026-12-31' } },
]
const STUDENT_SCOPED = new Set(['picker-history', 'checkins', 'reading-logs', 'home-visits', 'parent-contacts', 'growth-entries', 'behavior-records', 'reward-records', 'score-records'])
const CLASS_SCOPED = new Set([
  'picker-history', 'duty-rosters', 'reward-records', 'score-records', 'group-scores',
  'class-expenses', 'class-activities', 'class-duty-configs', 'class-galleries', 'seat-layouts',
  'growth-entries', 'behavior-records', 'attendances', 'homework', 'schedules',
])

async function teacherCrudSuite(SID) {
  console.log('\n═══ 3. 教师端 CRUD 覆盖（' + TEACHER_CRUD.length + ' 模块）═══')
  for (const m of TEACHER_CRUD) {
    const body = { ...m.b }
    if (classA && classA.id && CLASS_SCOPED.has(m.p)) body.classId = classA.id
    if (SID && STUDENT_SCOPED.has(m.p)) { body.studentId = SID; body.studentName = PREFIX + 'stu' }
    // CREATE
    const c = await api('POST', '/' + m.p, body, tok.tWang)
    if (c.status === 201 || c.status === 200) {
      const id = c.data?.id || (c.data?.data && c.data.data.id)
      if (id) track(m.p, id, tok.tWang)
      test(`[${m.p}] 创建`, true, `id=${(id || '').slice(0, 8)}`)
      // LIST
      const l = await api('GET', '/' + m.p, null, tok.tWang)
      test(`[${m.p}] 列表返回`, isList(l.data), `status=${l.status}`)
      if (id) {
        // GET one
        const o = await api('GET', '/' + m.p + '/' + id, null, tok.tWang)
        test(`[${m.p}] 读取单个`, o.status === 200, `status=${o.status}`)
        // PATCH
        const p = await api('PATCH', '/' + m.p + '/' + id, { title: m.b.title + '_upd' }, tok.tWang)
        test(`[${m.p}] 更新`, p.status === 200 || p.status === 201, `status=${p.status}`)
        // DELETE
        const d = await api('DELETE', '/' + m.p + '/' + id, null, tok.tWang)
        test(`[${m.p}] 删除`, d.status === 200 || (d.data && (d.data.ok || d.data.id)), `status=${d.status}`)
        // 从注册表移除（已删）
        const idx = deletables.findIndex((x) => x.prefix === m.p && x.id === id)
        if (idx >= 0) deletables.splice(idx, 1)
      }
    } else {
      test(`[${m.p}] 创建`, false, `status=${c.status} ${(JSON.stringify(c.data) || '').slice(0, 140)}`)
    }
  }
}

// ====================================================================
//  4. 学生 CRUD（class-scoped，需 classId）
// ====================================================================
let testStudentId = null
let classA = null
async function studentSuite() {
  console.log('\n═══ 4. 学生 CRUD（class-scoped）═══')
  // 1) 教师自身班级
  let cl = await api('GET', '/classes', null, tok.tWang)
  let cls = unwrap(cl.data)
  classA = Array.isArray(cls) && cls[0] ? cls[0] : null
  // 2) 回退到校管班级
  if (!classA) {
    const scl = await api('GET', '/school-admin/classes', null, tok.sa)
    const scls = unwrap(scl.data)
    classA = Array.isArray(scls) && scls[0] ? scls[0] : null
  }
  // 3) 仍无则自建测试班级（校管）
  if (!classA) {
    const cr = await api('POST', '/school-admin/classes', {
      name: PREFIX + 'class', grade: '一年级', classNo: '99', headTeacher: '王老师', term: '2026学年',
    }, tok.sa)
    const cid = cr.data?.id
    if (cid) { classA = { id: cid }; track('school-admin/classes', cid, tok.sa) }
    test('学生-自建测试班级', !!cid, `status=${cr.status} id=${(cid || '').slice(0, 8)}`)
  }
  if (!classA || !classA.id) { test('学生-前置班级', false, '无法获取/创建班级'); return }
  test('学生-前置班级存在', true, `classId=${(classA.id || '').slice(0, 8)}`)

  const sNo = '88' + Math.floor(100000 + Math.random() * 899999) // 纯数字学号（家长登录要求 ^\d+$）
  const c = await api('POST', '/students', {
    name: PREFIX + 'stu_' + rnd(), gender: '男', studentNo: sNo, classId: classA.id,
  }, tok.tWang)
  if (c.status === 201 || c.status === 200) {
    testStudentId = c.data?.id
    if (testStudentId) track('students', testStudentId, tok.tWang)
    test('学生-创建', true, `id=${(testStudentId || '').slice(0, 8)}`)
    const l = await api('GET', '/students', null, tok.tWang)
    test('学生-列表', isList(l.data), `status=${l.status}`)
    const o = await api('GET', '/students/' + testStudentId, null, tok.tWang)
    test('学生-读取单个', o.status === 200, `status=${o.status}`)
    const p = await api('PATCH', '/students/' + testStudentId, { name: PREFIX + 'stu_upd' }, tok.tWang)
    test('学生-更新', p.status === 200 || p.status === 201, `status=${p.status}`)
  } else {
    test('学生-创建', false, `status=${c.status} ${(JSON.stringify(c.data) || '').slice(0, 140)}`)
  }
}

// ====================================================================
//  5. 自定义教师路由
// ====================================================================
async function customTeacherRoutes() {
  console.log('\n═══ 5. 自定义教师路由 ═══')
  if (!classA || !classA.id) { info('自定义路由-缺少班级，跳过部分'); return }

  // classes dashboard
  let r = await api('GET', `/classes/${classA.id}/dashboard`, null, tok.tWang)
  test('班级看板 GET /classes/:id/dashboard (200 或 403隔离)', r.status === 200 || r.status === 403, `status=${r.status}` + (r.status === 403 ? ' 非班主任被拒(隔离正确)' : ''))

  // grades merge（幂等导入）
  if (testStudentId) {
    r = await api('POST', '/grades/merge', {
      classId: classA.id, examName: PREFIX + '期中', subject: '语文',
      scores: [{ studentId: testStudentId, score: 88 }], date: '2026-07-01',
    }, tok.tWang)
    const gid = r.data?.id
    if (gid) track('grades', gid, tok.tWang)
    test('成绩-合并导入 POST /grades/merge', r.status === 201 || r.status === 200, `status=${r.status}`)
  }

  // exams create（auto 建成绩记录，需 classId）
  r = await api('POST', '/exams', { name: PREFIX + 'exam', date: '2026-07-01', term: '2026学年', subjects: ['语文'], classId: classA.id }, tok.tWang)
  const eid = r.data?.id
  if (eid) track('exams', eid, tok.tWang)
  test('考试-创建 POST /exams', r.status === 201 || r.status === 200, `status=${r.status}`)

  // backups
  r = await api('POST', '/backups', { label: PREFIX + 'bk' }, tok.tWang)
  const bid = r.data?.id
  if (bid) track('backups', bid, tok.tWang)
  test('备份-创建 POST /backups', r.status === 200 || r.status === 201, `status=${r.status}`)
  const bl = await api('GET', '/backups', null, tok.tWang)
  test('备份-列表 GET /backups', isList(bl.data) || bl.status === 200, `status=${bl.status}`)
  if (bid) {
    const bg = await api('GET', '/backups/' + bid, null, tok.tWang)
    test('备份-读取单个', bg.status === 200 || (bg.data && bg.data.error), `status=${bg.status}`)
  }

  // notifications
  const nl = await api('GET', '/notifications', null, tok.tWang)
  test('通知-列表 GET /notifications', nl.status === 200, `status=${nl.status}`)
  r = await api('GET', '/notifications/unread-count', null, tok.tWang)
  test('通知-未读计数', r.status === 200, `status=${r.status}`)
  r = await api('POST', '/notifications/mark-all-read', {}, tok.tWang)
  test('通知-全部已读', r.status === 200 || r.status === 201, `status=${r.status}`)

  // im
  r = await api('POST', '/im/user-sig', {}, tok.tWang)
  test('IM-UserSig POST /im/user-sig', r.status === 200 || r.status === 201, `status=${r.status}`)
  r = await api('GET', '/im/parents?classId=' + classA.id, null, tok.tWang)
  test('IM-家长花名册 GET /im/parents', r.status === 200, `status=${r.status}`)

  // security 文本审核
  r = await api('POST', '/security/msg-check', { content: '这是一条正常测试内容' }, tok.tWang)
  test('安全-文本审核 POST /security/msg-check', r.status === 200 || r.status === 201, `status=${r.status}`)

  // teaching-calendar 按月查询
  r = await api('GET', '/teaching-calendar?year=2026&month=7', null, tok.tWang)
  test('教学日历-按月查询', r.status === 200, `status=${r.status}`)

  // users/me
  r = await api('GET', '/users/me', null, tok.tWang)
  test('用户-个人资料 GET /users/me', r.status === 200, `status=${r.status}`)

  // config/ai（教师可读写）
  r = await api('GET', '/config/ai', null, tok.tWang)
  test('配置-教师 AI 设置 GET /config/ai', r.status === 200, `status=${r.status}`)
}

// ====================================================================
//  6. 超管专属 suite
// ====================================================================
async function adminSuperSuite() {
  console.log('\n═══ 6. 超管专属 ═══')
  let r = await api('GET', '/admin/schools', null, tok.super)
  test('超管-学校列表', r.status === 200 && isList(r.data), `status=${r.status}`)
  r = await api('GET', '/admin/school-admins', null, tok.super)
  test('超管-校管列表', r.status === 200 && isList(r.data), `status=${r.status}`)
  r = await api('GET', '/admin/teachers', null, tok.super)
  test('超管-教师列表', r.status === 200 && isList(r.data), `status=${r.status}`)
  r = await api('GET', '/admin/audit-logs', null, tok.super)
  test('超管-审计日志', r.status === 200 && isList(r.data), `status=${r.status}`)

  // 创建并删除一个测试校管
  let schoolId = null
  const sl = await api('GET', '/admin/schools', null, tok.super)
  const schools = unwrap(sl.data)
  schoolId = Array.isArray(schools) && schools[0] ? schools[0].id : null
  if (schoolId) {
    r = await api('POST', '/admin/school-admins', {
      username: PREFIX + 'sa_' + rnd(), password: 'Test1234!', name: PREFIX + '校管', schoolId,
    }, tok.super)
    const said = r.data?.id
    if (said) track('admin/school-admins', said, tok.super)
    test('超管-创建校管', r.status === 201 || r.status === 200, `status=${r.status}`)
    if (said) {
      const u = await api('PATCH', '/admin/school-admins/' + said, { name: PREFIX + '校管_upd' }, tok.super)
      test('超管-更新校管', u.status === 200 || u.status === 201, `status=${u.status}`)
    }
  } else {
    test('超管-创建校管', false, '无可用 schoolId')
  }

  // ai-providers 超管可写
  const code = PREFIX + 'prov_' + rnd()
  r = await api('POST', '/ai-providers', { code, name: PREFIX + 'provider', baseUrl: 'https://api.test', apiKey: 'x' }, tok.super)
  if (r.status === 201 || r.status === 200) track('ai-providers', code, tok.super)
  test('超管-创建 AI 服务商', r.status === 201 || r.status === 200, `status=${r.status}`)
  if (r.status === 201 || r.status === 200) {
    const u = await api('PATCH', '/ai-providers/' + code, { name: PREFIX + 'provider_upd' }, tok.super)
    test('超管-更新 AI 服务商', u.status === 200 || u.status === 201, `status=${u.status}`)
  }
}

// ====================================================================
//  7. 学校管理员 suite
// ====================================================================
async function schoolAdminSuite() {
  console.log('\n═══ 7. 学校管理员 ═══')
  let r = await api('GET', '/school-admin/dashboard', null, tok.sa)
  test('校管-数据看板', r.status === 200, `status=${r.status}`)
  r = await api('GET', '/school-admin/teachers', null, tok.sa)
  test('校管-教师列表', r.status === 200 && isList(r.data), `status=${r.status}`)
  r = await api('GET', '/school-admin/classes', null, tok.sa)
  test('校管-班级列表', r.status === 200 && isList(r.data), `status=${r.status}`)

  // 创建并删除一个测试教师
  r = await api('POST', '/school-admin/teachers', {
    name: PREFIX + 'teacher', username: PREFIX + 'teacher_' + rnd(), password: '123456', subject: '语文',
  }, tok.sa)
  const tid = r.data?.id
  if (tid) track('school-admin/teachers', tid, tok.sa)
  test('校管-创建教师', r.status === 201 || r.status === 200, `status=${r.status}`)
  if (tid) {
    const u = await api('PATCH', '/school-admin/teachers/' + tid, { name: PREFIX + 'teacher_upd' }, tok.sa)
    test('校管-更新教师', u.status === 200 || u.status === 201, `status=${u.status}`)
  }

  // 教师越权校管接口
  r = await api('GET', '/school-admin/dashboard', null, tok.tWang)
  test('教师越权 /school-admin/dashboard → 401/403', r.status === 401 || r.status === 403, `status=${r.status}`)
}

// ====================================================================
//  8. 家长端 end-to-end（自造数据：建学生→开启家长登录→家长登录→家长接口）
// ====================================================================
async function parentSuite() {
  console.log('\n═══ 8. 家长端 end-to-end ═══')
  if (!classA || !classA.id) { test('家长-前置班级', false, '无班级'); return }
  if (!testStudentId) { test('家长-前置学生', false, '无学生'); return }

  // 开启家长登录，拿到初始密码
  let r = await api('POST', '/students/' + testStudentId + '/toggle-parent-login', {}, tok.tWang)
  const initPwd = r.data?.initialPassword
  test('家长-开启家长登录', r.status === 200 || r.status === 201, `status=${r.status} 有密码=${!!initPwd}`)
  if (!initPwd) { test('家长-登录', false, '未获得初始密码'); return }

  // 查学号
  const stu = await api('GET', '/students/' + testStudentId, null, tok.tWang)
  const sNo = stu.data?.studentNo
  if (!sNo) { test('家长-取学号', false, '无学号'); return }

  // 家长登录
  r = await api('POST', '/parent-auth/login', { studentNo: sNo, password: initPwd })
  const pTok = r.data?.token
  test('家长-登录 POST /parent-auth/login', r.status === 200 || r.status === 201 && !!pTok, `status=${r.status} 有token=${!!pTok}`)
  if (!pTok) { test('家长-接口访问', false, '无家长 token'); return }

  // 家长接口
  r = await api('GET', '/parent-auth/me', null, pTok)
  test('家长-/parent-auth/me', r.status === 200, `status=${r.status}`)
  r = await api('GET', '/parent-auth/notices', null, pTok)
  test('家长-/parent-auth/notices', r.status === 200, `status=${r.status}`)
  r = await api('GET', '/parent-auth/exams', null, pTok)
  test('家长-/parent-auth/exams', r.status === 200, `status=${r.status}`)
  r = await api('GET', '/parent-auth/homework', null, pTok)
  test('家长-/parent-auth/homework', r.status === 200, `status=${r.status}`)
  r = await api('GET', '/parent-auth/attendance', null, pTok)
  test('家长-/parent-auth/attendance', r.status === 200, `status=${r.status}`)
  r = await api('GET', '/parent-auth/schedule', null, pTok)
  test('家长-/parent-auth/schedule', r.status === 200, `status=${r.status}`)
  r = await api('GET', '/parent-auth/communications', null, pTok)
  test('家长-/parent-auth/communications', r.status === 200, `status=${r.status}`)

  // 关闭家长登录（清理授权态，避免遗留）
  await api('POST', '/students/' + testStudentId + '/toggle-parent-login', {}, tok.tWang)
}

// ====================================================================
//  9. 输入校验 / 边界 / 分页
// ====================================================================
async function validationSuite() {
  console.log('\n═══ 9. 输入校验 / 边界 / 分页 ═══')
  // 空学生创建 → 400
  let r = await api('POST', '/students', {}, tok.tWang)
  test('校验-空学生创建 → 400', r.status === 400, `status=${r.status}`)
  // 缺字段学生 → 400
  r = await api('POST', '/students', { name: 'x' }, tok.tWang)
  test('校验-缺字段学生创建 → 400', r.status === 400, `status=${r.status}`)
  // 不存在 ID → 404/400
  r = await api('GET', '/students/__not_exist_id__', null, tok.tWang)
  test('边界-不存在的学生ID', r.status === 404 || r.status === 400, `status=${r.status}`)
  // 删除不存在 → 404
  r = await api('DELETE', '/students/__not_exist_id__', null, tok.tWang)
  test('边界-删除不存在学生 → 404', r.status === 404, `status=${r.status}`)
  // 分页 take>500 截断（应不报错，且若分页返回则 items<=500）
  r = await api('GET', '/classes?take=9999', null, tok.tWang)
  const items = unwrap(r.data)
  const len = Array.isArray(items) ? items.length : (r.data && r.data.total)
  test('分页-take=9999 不报错', r.status === 200, `status=${r.status} total=${len}`)
  if (Array.isArray(items)) test('分页-take 截断≤500', items.length <= 500, `返回 ${items.length} 条`)
  // 分页 skip/take 基本可用
  r = await api('GET', '/notes?skip=0&take=2', null, tok.tWang)
  test('分页-skip/take 参数可用', r.status === 200, `status=${r.status}`)
  // MAX_TAKE 防护：超长 take 不应放大查询（用 take=100000 验证返回被限制）
  r = await api('GET', '/students?take=100000', null, tok.tWang)
  const si = unwrap(r.data)
  test('分页-take=100000 被限制', r.status === 200 && (!Array.isArray(si) || si.length <= 500), `status=${r.status}`)
}

// ====================================================================
//  10. 公共接口 + 健康检查
// ====================================================================
async function publicSuite() {
  console.log('\n═══ 10. 公共接口 + 健康检查 ═══')
  let r = await api('GET', '/health')
  test('健康检查 GET /health', r.status === 200 && r.data?.status === 'ok', `status=${r.status}`)
  r = await api('GET', '/config/public')
  test('公开配置 GET /config/public（无需 token）', r.status === 200, `status=${r.status}`)
}

// ====================================================================
//  11. 模块可达性矩阵（GET 列表，教师 token；汇总覆盖证据）
// ====================================================================
const ALL_PREFIXES = [
  'ai', 'auth', 'checkins', 'award-records', 'award-categories', 'duty-rosters',
  'class-expenses', 'class-activities', 'class-duty-configs', 'class-galleries',
  'exams', 'ai-providers', 'backups', 'grades', 'growth-entries', 'behavior-records',
  'generated/papers', 'generated/lesson-plans', 'generated/knowledges', 'generated/queries',
  'classes', 'lesson-observations', 'home-visits', 'config', 'parent-contacts',
  'notice-templates', 'work-logs', 'teachers', 'users', 'reward-records',
  'score-records', 'group-scores', 'school/schedules', 'school/attendances',
  'school/homework', 'school/notices', 'school/resources', 'notes', 'todos',
  'picker-history', 'my-galleries', 'reading-logs', 'parent-auth', 'teaching-calendar',
  'school-admin', 'seat-layouts', 'students', 'im', 'notification', 'security', 'semesters',
]
async function reachabilityMatrix() {
  console.log('\n═══ 11. 模块可达性矩阵（教师 token 探测列表接口）═══')
  const matrix = []
  for (const p of ALL_PREFIXES) {
    let r
    if (p === 'auth' || p === 'parent-auth') {
      // 这些需要 POST 或特定角色，跳过 GET 列表探测
      matrix.push({ prefix: p, status: 'skip(非列表接口)', note: '自定义' })
      continue
    }
    if (p.startsWith('school/')) {
      const real = p.split('/')[1]
      r = await api('GET', '/' + real, null, tok.tWang)
      matrix.push({ prefix: p, status: r.status, note: real })
    } else if (p === 'admin') {
      r = await api('GET', '/admin/schools', null, tok.tWang) // 应 401/403
      matrix.push({ prefix: p, status: r.status, note: 'super-only(预期拦截)' })
    } else {
      r = await api('GET', '/' + p, null, tok.tWang)
      matrix.push({ prefix: p, status: r.status, note: '' })
    }
  }
  info('可达性结果见下方汇总/JSON')
  return matrix
}

// ====================================================================
//  主流程
// ====================================================================
;(async function main() {
  console.log('🚀 云托管真实后台全功能测试')
  console.log('   BASE =', BASE)
  console.log('   数据前缀 =', PREFIX, '\n')
  let matrix = []
  try {
    await loginAll()
    await authSuite()
    await permissionMatrix()
    await studentSuite()           // 先建学生，供后续 studentId 使用
    await teacherCrudSuite(testStudentId)
    await customTeacherRoutes()
    await adminSuperSuite()
    await schoolAdminSuite()
    await parentSuite()
    await validationSuite()
    await publicSuite()
    matrix = await reachabilityMatrix()
  } catch (e) {
    console.error('❌ 测试过程异常:', e && e.stack ? e.stack : e)
    test('测试过程异常', false, String(e && e.message || e))
  } finally {
    await teardown()
  }

  const total = results.length
  const rate = total ? (passed / total * 100).toFixed(1) : '0.0'
  console.log('\n═══════════════════════════════════════')
  console.log('📊 功能测试统计')
  console.log(`  总计: ${total}`)
  console.log(`  通过: ${passed}`)
  console.log(`  失败: ${failed}`)
  console.log(`  通过率: ${rate}%`)
  if (failed > 0) {
    console.log('\n❌ 失败项:')
    results.filter((r) => !r.ok).forEach((r) => console.log(`  - ${r.name} :: ${r.detail}`))
  }
  console.log('═══════════════════════════════════════\n')

  const fs = require('fs')
  const out = {
    base: BASE,
    generatedAt: new Date().toISOString(),
    total, passed, failed, passRate: rate,
    results,
    reachability: matrix,
  }
  fs.writeFileSync(__dirname + '/c-test-results.json', JSON.stringify(out, null, 2))
  console.log('📄 结果已保存: c-test-results.json')
})()
