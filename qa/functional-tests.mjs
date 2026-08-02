// 园丁工作台 · 全量功能测试套件（Web / 小程序 / 后端 三端 API 层）
// 运行: node qa/functional-tests.mjs
// 前置: QA 服务器运行在 :3100，qa/seed-data.mjs 已执行（qa-env.json 有效）
// 输出: qa/functional-report.json + 控制台摘要

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ENV = JSON.parse(fs.readFileSync(path.join(__dirname, 'qa-env.json'), 'utf8'))
const BASE = ENV.base
const PW = ENV.password

// ================= 基础设施 =================
const results = []
let passed = 0
let failed = 0
let blocked = 0

const T = (id, name, group) => {
  const r = { id, name, group, method: '', path: '', expect: '', actual: '', status: 'PASS' }
  results.push(r)
  return r
}

async function call(p, { method = 'GET', body, token, headers = {} } = {}) {
  const r = await fetch(BASE + p, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })
  const t = await r.text()
  let d
  try { d = t ? JSON.parse(t) : null } catch { d = t }
  return { status: r.status, ok: r.ok, d }
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

async function login(username, password, endpoint = '/auth/unified-login') {
  const r = await call(endpoint, { method: 'POST', body: { username, password } })
  return r.ok && r.d?.token ? r.d : null
}

// 通用 CRUD 验证：POST 创建 → GET :id → PATCH → GET 列表 → DELETE
async function verifyCrud(test, token, resource, payload, { expectDelete = true } = {}) {
  test.method = 'POST'
  test.path = `/${resource}`
  const c = await call(`/${resource}`, { method: 'POST', token, body: payload })
  test.actual = `${c.status} ${JSON.stringify(c.d || {}).slice(0, 140)}`
  if (!c.ok || !c.d?.id) { test.status = 'FAIL'; test.expect = '201 + id'; failed++; return null }
  const id = c.d.id

  test.expect = '201 + id; GET/PATCH/DELETE 200'
  const g = await call(`/${resource}/${id}`, { token })
  if (!g.ok) { test.status = 'FAIL'; test.actual += ` | GET:${g.status}`; failed++; return null }

  const p = await call(`/${resource}/${id}`, { method: 'PATCH', token, body: { note: 'qa-updated' } })
  if (!p.ok) { test.status = 'FAIL'; test.actual += ` | PATCH:${p.status}`; failed++; return null }

  const l = await call(`/${resource}?take=5`, { token })
  if (!l.ok) { test.status = 'FAIL'; test.actual += ` | LIST:${l.status}`; failed++; return null }

  if (expectDelete) {
    const d = await call(`/${resource}/${id}`, { method: 'DELETE', token })
    if (!d.ok) { test.status = 'FAIL'; test.actual += ` | DEL:${d.status}`; failed++; return null }
  }
  passed++
  return { id, created: c.d }
}

// ================= 测试组 =================
async function suiteAuth() {
  const g = 'A. 认证与登录'
  // A01 超管登录
  let t = T('AUTH-01', '超管登录（admin/admin）', g)
  t.method = 'POST'; t.path = '/admin/login'; t.expect = '201 + token(role=super)'
  const su = await call('/admin/login', { method: 'POST', body: { username: 'admin', password: 'admin' } })
  t.actual = `${su.status} ${JSON.stringify(su.d || {}).slice(0, 80)}`
  if (su.ok && su.d?.token) passed++; else { t.status = 'FAIL'; failed++ }

  // A02 校管登录
  t = T('AUTH-02', '校管登录（sa1）', g)
  t.method = 'POST'; t.path = '/school-admin/login'; t.expect = '201 + token(role=school_admin)'
  const sa = await call('/school-admin/login', { method: 'POST', body: { username: 'sa1', password: '123456' } })
  t.actual = `${sa.status} ${JSON.stringify(sa.d || {}).slice(0, 60)}`
  if (sa.ok && sa.d?.token) passed++; else { t.status = 'FAIL'; failed++ }

  // A03 教师统一登录
  t = T('AUTH-03', '教师统一登录（qa_t_head）', g)
  t.method = 'POST'; t.path = '/auth/unified-login'; t.expect = '201 + token(role=teacher)'
  const th = await login('qa_t_head', PW)
  t.actual = th ? '201 + token' : 'fail'
  if (th) passed++; else { t.status = 'FAIL'; failed++ }

  // A04 密码错误
  t = T('AUTH-04', '教师登录密码错误', g)
  t.method = 'POST'; t.path = '/auth/unified-login'; t.expect = '401 + message'
  const bad = await call('/auth/unified-login', { method: 'POST', body: { username: 'qa_t_head', password: 'wrong-pass' } })
  t.actual = `${bad.status} ${JSON.stringify(bad.d || {}).slice(0, 60)}`
  if (bad.status === 401) passed++; else { t.status = 'FAIL'; failed++ }

  // A05 无 token 访问
  t = T('AUTH-05', '无 token 访问受保护接口', g)
  t.method = 'GET'; t.path = '/users/me'; t.expect = '401'
  const no = await call('/users/me')
  t.actual = `${no.status}`
  if (no.status === 401) passed++; else { t.status = 'FAIL'; failed++ }

  // A06 家长登录
  t = T('AUTH-06', '家长登录（学生学号）', g)
  t.method = 'POST'; t.path = '/parent-auth/login'; t.expect = '201 + token'
  const pa = await call('/parent-auth/login', { method: 'POST', body: { studentNo: '31001', password: '123456' } })
  t.actual = `${pa.status} ${JSON.stringify(pa.d || {}).slice(0, 60)}`
  if (pa.ok && pa.d?.token) passed++; else { t.status = 'FAIL'; failed++ }

  // A07 家长错误密码
  t = T('AUTH-07', '家长登录密码错误', g)
  t.method = 'POST'; t.path = '/parent-auth/login'; t.expect = '401'
  const pb = await call('/parent-auth/login', { method: 'POST', body: { studentNo: '31001', password: 'x' } })
  t.actual = `${pb.status}`
  if (pb.status === 401) passed++; else { t.status = 'FAIL'; failed++ }

  // A08 登录接口限流（10次/分钟防暴力破解）
  t = T('AUTH-08', '登录接口限流（>10 次/分钟返回 429）', g)
  t.method = 'POST'; t.path = '/auth/unified-login'; t.expect = '第 11 次返回 429'
  let got429 = false
  for (let i = 0; i < 11; i++) {
    const r = await call('/auth/unified-login', { method: 'POST', body: { username: 'qa_t_iso', password: 'x' } })
    if (r.status === 429) { got429 = true; break }
  }
  t.actual = got429 ? '429 限流生效' : '未触发限流（11 次均非 429）'
  if (got429) passed++; else { t.status = 'FAIL'; failed++ }

  return { su: su.d?.token, sa: sa.d?.token, head: th?.token }
}

async function suiteSuper(suToken) {
  const g = 'B. 超管模块'
  // B01 学校列表
  let t = T('SUP-01', '学校列表', g)
  t.method = 'GET'; t.path = '/admin/schools'; t.expect = '200 + array'
  const s = await call('/admin/schools', { token: suToken })
  const sArr = Array.isArray(s.d) ? s.d : s.d?.items
  t.actual = `${s.status} ${Array.isArray(sArr) ? `items=${sArr.length}` : JSON.stringify(s.d || {}).slice(0, 60)}`
  if (s.ok && Array.isArray(sArr)) passed++; else { t.status = 'FAIL'; failed++ }

  // B02 创建学校
  t = T('SUP-02', '创建学校', g)
  t.method = 'POST'; t.path = '/admin/schools'; t.expect = '201 + id'
  const nc = await call('/admin/schools', { method: 'POST', token: suToken, body: { name: 'QA功能测试学校-' + Date.now(), prefix: 'QZ', platform: 'web' } })
  t.actual = `${nc.status} ${JSON.stringify(nc.d || {}).slice(0, 80)}`
  if (nc.ok && nc.d?.id) {
    passed++
    const sid = nc.d.id
    // B03 编辑学校
    t = T('SUP-03', '编辑学校', g)
    t.method = 'PATCH'; t.path = `/admin/schools/${sid}`; t.expect = '200'
    const up = await call(`/admin/schools/${sid}`, { method: 'PATCH', token: suToken, body: { name: 'QA功能测试学校-改' } })
    t.actual = `${up.status}`
    if (up.ok) passed++; else { t.status = 'FAIL'; failed++ }
    // B04 删除学校
    t = T('SUP-04', '删除学校', g)
    t.method = 'DELETE'; t.path = `/admin/schools/${sid}`; t.expect = '200'
    const del = await call(`/admin/schools/${sid}`, { method: 'DELETE', token: suToken })
    t.actual = `${del.status}`
    if (del.ok) passed++; else { t.status = 'FAIL'; failed++ }
  } else { t.status = 'FAIL'; failed++ }

  // B05 校管列表
  t = T('SUP-05', '校管列表', g)
  t.method = 'GET'; t.path = '/admin/school-admins'; t.expect = '200 + array'
  const adm = await call('/admin/school-admins', { token: suToken })
  const aArr = Array.isArray(adm.d) ? adm.d : adm.d?.items
  t.actual = `${adm.status} ${Array.isArray(aArr) ? `items=${aArr.length}` : JSON.stringify(adm.d || {}).slice(0, 60)}`
  if (adm.ok && Array.isArray(aArr)) passed++; else { t.status = 'FAIL'; failed++ }

  // B06 审计日志
  t = T('SUP-06', '审计日志列表', g)
  t.method = 'GET'; t.path = '/admin/audit-logs'; t.expect = '200'
  const au = await call('/admin/audit-logs', { token: suToken })
  t.actual = `${au.status}`
  if (au.ok) passed++; else { t.status = 'FAIL'; failed++ }

  // B07 平台配置读
  t = T('SUP-07', '平台配置读取', g)
  t.method = 'GET'; t.path = '/config/app'; t.expect = '200 + 配置项'
  const cfg = await call('/config/app', { token: suToken })
  t.actual = `${cfg.status} ${Array.isArray(cfg.d) ? `items=${cfg.d.length}` : ''}`
  if (cfg.ok && Array.isArray(cfg.d) && cfg.d.length) passed++; else { t.status = 'FAIL'; failed++ }

  // B08 平台配置写
  t = T('SUP-08', '平台配置写入（系统名称）', g)
  t.method = 'PUT'; t.path = '/config/app'; t.expect = '200'
  const cw = await call('/config/app', { method: 'PUT', token: suToken, body: { items: [{ key: 'systemName', value: '园丁工作台' }] } })
  t.actual = `${cw.status}`
  if (cw.ok) passed++; else { t.status = 'FAIL'; failed++ }

  // B09 AI 服务商列表
  t = T('SUP-09', 'AI 服务商列表', g)
  t.method = 'GET'; t.path = '/ai-providers'; t.expect = '200 + array'
  const ap = await call('/ai-providers', { token: suToken })
  t.actual = `${ap.status} ${Array.isArray(ap.d) ? `items=${ap.d.length}` : ''}`
  if (ap.ok) passed++; else { t.status = 'FAIL'; failed++ }

  // B10 越权：教师访问超管接口（系统抛 401 权限不足）
  t = T('SUP-10', '教师 token 访问超管接口被拒', g)
  t.method = 'GET'; t.path = '/admin/schools'; t.expect = '401/403'
  const f = await call('/admin/schools', { token: ENV.created.headToken })
  t.actual = `${f.status}`
  if (f.status === 401 || f.status === 403) passed++; else { t.status = 'FAIL'; failed++ }
}

async function suiteSchoolAdmin(saToken) {
  const g = 'C. 校管模块'
  // C01 dashboard
  let t = T('SA-01', '校管 Dashboard 统计', g)
  t.method = 'GET'; t.path = '/school-admin/dashboard'; t.expect = '200 + stats'
  const d = await call('/school-admin/dashboard', { token: saToken })
  t.actual = `${d.status} ${JSON.stringify(d.d || {}).slice(0, 80)}`
  if (d.ok) passed++; else { t.status = 'FAIL'; failed++ }

  // C02 教师列表
  t = T('SA-02', '校管教师列表', g)
  t.method = 'GET'; t.path = '/school-admin/teachers'; t.expect = '200 + items'
  const tl = await call('/school-admin/teachers', { token: saToken })
  t.actual = `${tl.status} ${JSON.stringify(tl.d || {}).slice(0, 60)}`
  if (tl.ok && (Array.isArray(tl.d) || tl.d?.items)) passed++; else { t.status = 'FAIL'; failed++ }

  // C03 校管建教师
  t = T('SA-03', '校管创建教师', g)
  t.method = 'POST'; t.path = '/school-admin/teachers'; t.expect = '201 + id'
  const tc = await call('/school-admin/teachers', { method: 'POST', token: saToken, body: { name: 'QA校管建师', username: 'qa_sa_teacher' + Date.now().toString().slice(-4), password: 'Test@2026', phone: '13800007777', subject: '数学', positions: ['任课老师'] } })
  t.actual = `${tc.status} ${JSON.stringify(tc.d || {}).slice(0, 80)}`
  if (tc.ok && tc.d?.id) { passed++; const tid = tc.d.id
    // C04 校管改教师
    t = T('SA-04', '校管编辑教师', g)
    t.method = 'PATCH'; t.path = `/school-admin/teachers/${tid}`; t.expect = '200'
    const tu = await call(`/school-admin/teachers/${tid}`, { method: 'PATCH', token: saToken, body: { phone: '13800008888' } })
    t.actual = `${tu.status}`
    if (tu.ok) passed++; else { t.status = 'FAIL'; failed++ }
    // C05 校管删教师
    t = T('SA-05', '校管删除教师', g)
    t.method = 'DELETE'; t.path = `/school-admin/teachers/${tid}`; t.expect = '200'
    const td = await call(`/school-admin/teachers/${tid}`, { method: 'DELETE', token: saToken })
    t.actual = `${td.status}`
    if (td.ok) passed++; else { t.status = 'FAIL'; failed++ }
  } else { t.status = 'FAIL'; failed++ }

  // C06 班级列表
  t = T('SA-06', '校管班级列表', g)
  t.method = 'GET'; t.path = '/school-admin/classes'; t.expect = '200'
  const cl = await call('/school-admin/classes', { token: saToken })
  t.actual = `${cl.status}`
  if (cl.ok) passed++; else { t.status = 'FAIL'; failed++ }

  // C07 学生列表
  t = T('SA-07', '校管学生列表', g)
  t.method = 'GET'; t.path = '/school-admin/students'; t.expect = '200'
  const sl = await call('/school-admin/students', { token: saToken })
  t.actual = `${sl.status}`
  if (sl.ok) passed++; else { t.status = 'FAIL'; failed++ }

  // C08 公告列表
  t = T('SA-08', '校管公告列表', g)
  t.method = 'GET'; t.path = '/school-admin/notices'; t.expect = '200'
  const nl = await call('/school-admin/notices', { token: saToken })
  t.actual = `${nl.status}`
  if (nl.ok) passed++; else { t.status = 'FAIL'; failed++ }

  // C09 学校功能包读取
  t = T('SA-09', '学校功能包读取', g)
  t.method = 'GET'; t.path = '/school-admin/school-features'; t.expect = '200'
  const sf = await call('/school-admin/school-features', { token: saToken })
  t.actual = `${sf.status}`
  if (sf.ok) passed++; else { t.status = 'FAIL'; failed++ }

  // C10 教材列表
  t = T('SA-10', '教材列表（校管）', g)
  t.method = 'GET'; t.path = '/school-admin/textbooks'; t.expect = '200'
  const tb = await call('/school-admin/textbooks', { token: saToken })
  t.actual = `${tb.status}`
  if (tb.ok) passed++; else { t.status = 'FAIL'; failed++ }
}

// 通用教师 CRUD 资源清单（继承 CrudController 的模块；payload 与实体字段严格对齐）
const CRUD_RESOURCES = [
  { r: 'notes', payload: { title: 'QA笔记-测试', content: '内容', category: '其他' } },
  { r: 'todos', payload: { title: 'QA待办-测试', date: '2026-08-02' } },
  { r: 'checkins', payload: { studentId: 'x', studentName: 'QA学生', type: 'reading', date: '2026-08-02', count: 1 } },
  { r: 'work-logs', payload: { date: '2026-08-02', classCount: 2, homeworkCount: 3 } },
  { r: 'reading-logs', payload: { studentId: 'x', studentName: 'QA学生', bookTitle: 'QA图书', author: 'QA作者', pages: 30, minutes: 20, date: '2026-08-02' } },
  { r: 'class-expenses', payload: { classId: ENV.created.class1Id, type: '收入', category: '班费', amount: 100, date: '2026-08-02', handler: 'QA教师' } },
  { r: 'class-activities', payload: { classId: ENV.created.class1Id, title: 'QA活动', date: '2026-08-02', description: '活动描述' } },
  { r: 'class-duty-configs', payload: { classId: ENV.created.class1Id, duties: ['扫地', '擦黑板'], assignments: { 扫地: ['张三', '李四'] } } },
  { r: 'duty-rosters', payload: { classId: ENV.created.class1Id, name: 'QA值日表', type: '周值日', assignments: [{ date: '2026-08-02', persons: ['张三'] }] } },
  { r: 'growth-entries', payload: { studentId: 'x', studentName: 'QA学生', type: '学习', date: '2026-08-02', title: 'QA成长记录', content: '表现良好' } },
  { r: 'behavior-records', payload: { studentId: 'x', studentName: 'QA学生', date: '2026-08-02', behavior: '积极发言', note: '' } },
  { r: 'award-records', payload: { name: 'QA奖项', date: '2026-08-02', level: '校级' } },
  { r: 'award-categories', payload: { name: 'QA奖类' } },
  { r: 'reward-records', payload: { classId: ENV.created.class1Id, studentId: 'x', type: '表扬', points: 5, reason: '表现好', date: '2026-08-02' } },
  { r: 'score-records', payload: { classId: ENV.created.class1Id, studentId: 'x', studentName: 'QA学生', delta: 10, reason: '加分' } },
  { r: 'group-scores', payload: { classId: ENV.created.class1Id, name: 'QA组', points: 80, color: 'red' } },
  { r: 'home-visits', payload: { studentId: 'x', studentName: 'QA学生', date: '2026-08-02', content: '家访记录' } },
  { r: 'lesson-observations', payload: { classId: ENV.created.class1Id, className: '三年级一班', teacherName: 'QA教师', subject: '语文', topic: 'QA听课主题', date: '2026-08-02' } },
  { r: 'parent-contacts', payload: { studentId: 'x', studentName: 'QA学生', classId: ENV.created.class1Id, parentName: 'QA家长', relation: '父亲', phone: '13911112222', wechat: '', method: '电话', content: '沟通内容', date: '2026-08-02' } },
  { r: 'my-galleries', payload: { title: 'QA相册', date: '2026-08-02' } },
  { r: 'teaching-calendar', payload: { title: 'QA教学日历', date: '2026-08-02' } },
  { r: 'seat-layouts', payload: { classId: ENV.created.class1Id, name: 'QA座位表', rows: 4, cols: 6, seats: [[null, null], [null, null]] } },
  { r: 'schedules', payload: { title: 'QA课程表', classId: ENV.created.class1Id, dayOfWeek: 1, period: 1, subject: '语文' } },
  { r: 'semesters', payload: { name: 'QA学期-2026秋', startDate: '2026-09-01', endDate: '2027-01-31' } },
  { r: 'lesson-plan-templates', payload: { title: 'QA教案模板', subject: '语文', grade: '三年级' } },
  { r: 'notice-templates', payload: { title: 'QA公告模板', content: '模板内容', category: '通知' } },
]

async function suiteTeacherCrud(headToken) {
  const g = 'D. 教师业务 CRUD（通用资源）'
  for (const { r, payload } of CRUD_RESOURCES) {
    const t = T(`CRUD-${r.toUpperCase()}`, `教师 CRUD: /${r}`, g)
    await verifyCrud(t, headToken, r, payload)
  }
}

async function suiteBusiness(headToken) {
  const g = 'E. 业务规则与权限隔离'
  const cls = ENV.created.class1Id
  const cls3 = ENV.created.classIds[2] // 四年级一班（非 qa_t_head 班主任）

  // E01 班主任查看本班成员
  let t = T('BIZ-01', '班主任查看本班成员列表', g)
  t.method = 'POST'; t.path = `/classes/${cls}/members/list`; t.expect = '200 + members'
  const m = await call(`/classes/${cls}/members/list`, { method: 'POST', token: headToken })
  t.actual = `${m.status} ${Array.isArray(m.d) ? `members=${m.d.length}` : ''}`
  if (m.ok && Array.isArray(m.d)) passed++; else { t.status = 'FAIL'; failed++ }

  // E02 无关教师访问非本班成员（qa_t_sub3 仅任三年级一班科学，与四年级一班无关联）
  t = T('BIZ-02', '无关教师查看他人班级成员被拒', g)
  t.method = 'POST'; t.path = `/classes/${cls3}/members/list`; t.expect = '403'
  const sub3Login = await login('qa_t_sub3', PW)
  const m2 = await call(`/classes/${cls3}/members/list`, { method: 'POST', token: sub3Login?.token })
  t.actual = `${m2.status}`
  if (m2.status === 403) passed++; else { t.status = 'FAIL'; failed++ }

  // E03 班级 dashboard
  t = T('BIZ-03', '班主任查看班级数据看板', g)
  t.method = 'GET'; t.path = `/classes/${cls}/dashboard`; t.expect = '200'
  const db = await call(`/classes/${cls}/dashboard`, { token: headToken })
  t.actual = `${db.status}`
  if (db.ok) passed++; else { t.status = 'FAIL'; failed++ }

  // E04 教师任教学科更新
  t = T('BIZ-04', '教师更新自己任教学科', g)
  t.method = 'PATCH'; t.path = `/classes/${cls}/my-subjects`; t.expect = '200'
  const ms = await call(`/classes/${cls}/my-subjects`, { method: 'PATCH', token: headToken, body: { subjects: ['语文', '数学'] } })
  t.actual = `${ms.status}`
  if (ms.ok) passed++; else { t.status = 'FAIL'; failed++ }

  // E05 创建学生（本班班主任）
  t = T('BIZ-05', '班主任为本班创建学生', g)
  t.method = 'POST'; t.path = '/students'; t.expect = '201 + id'
  const sc = await call('/students', { method: 'POST', token: headToken, body: { classId: cls, name: 'QA边界学生', gender: '男', studentNo: '90001', parentName: 'QA边界家长', parentPhone: '13711112222' } })
  t.actual = `${sc.status}`
  if (sc.ok && sc.d?.id) { passed++; const sid = sc.d.id
    // 清理
    await call(`/students/${sid}`, { method: 'DELETE', token: headToken })
  } else { t.status = 'FAIL'; failed++ }

  // E06 非法家长手机号
  t = T('BIZ-06', '创建学生-非法家长手机号被拒', g)
  t.method = 'POST'; t.path = '/students'; t.expect = '400'
  const bad = await call('/students', { method: 'POST', token: headToken, body: { classId: cls, name: 'QA坏号', gender: '男', studentNo: '90002', parentPhone: '12345' } })
  t.actual = `${bad.status} ${JSON.stringify(bad.d || {}).slice(0, 60)}`
  if (bad.status === 400) passed++; else { t.status = 'FAIL'; failed++ }

  // E07 分页 take 上限（MAX_TAKE=500）
  t = T('BIZ-07', '分页 take 超限被截断到 500', g)
  t.method = 'GET'; t.path = '/notes?take=99999'; t.expect = '200 且不返回 500 条以上'
  const pg = await call('/notes?take=99999', { token: headToken })
  const pgItems = Array.isArray(pg.d) ? pg.d : pg.d?.items || []
  t.actual = `${pg.status} items=${pgItems.length}`
  if (pg.ok && pgItems.length <= 500) passed++; else { t.status = 'FAIL'; failed++ }

  // E08 教师互访数据隔离（qa_t_head 访问 qa_t_iso 数据不存在→空或404，不泄露）
  t = T('BIZ-08', '教师数据租户隔离（跨教师不可见）', g)
  t.method = 'GET'; t.path = '/notes'; t.expect = '200 + 仅本人数据'
  const isoNotes = await call('/notes', { token: ENV.created.isoTokens.qa_t_iso })
  const headNotes = await call('/notes', { token: headToken })
  const isoIds = new Set(Array.isArray(isoNotes.d) ? isoNotes.d.map(x => x.id) : [])
  const leak = Array.isArray(headNotes.d) ? headNotes.d.some(x => isoIds.has(x.id)) : false
  t.actual = `iso=${isoNotes.status} head=${headNotes.status} leak=${leak}`
  if (isoNotes.ok && headNotes.ok && !leak) passed++; else { t.status = 'FAIL'; failed++ }

  // E09 越权：家长 token 访问教师接口（系统抛 401 权限不足）
  t = T('BIZ-09', '家长 token 访问教师接口被拒', g)
  t.method = 'GET'; t.path = '/notes'; t.expect = '401/403'
  const pn = await call('/notes', { token: ENV.created.parentToken })
  t.actual = `${pn.status}`
  if (pn.status === 401 || pn.status === 403) passed++; else { t.status = 'FAIL'; failed++ }

  // E10 班级列表（教师自己的班级）
  t = T('BIZ-10', '教师班级列表', g)
  t.method = 'GET'; t.path = '/classes'; t.expect = '200 + items'
  const cl = await call('/classes', { token: headToken })
  const clItems = Array.isArray(cl.d) ? cl.d : cl.d?.items || []
  t.actual = `${cl.status} items=${clItems.length}`
  if (cl.ok && Array.isArray(clItems)) passed++; else { t.status = 'FAIL'; failed++ }
}

async function suiteParent(parentToken) {
  const g = 'F. 家长端'
  // F01 家长信息
  let t = T('PAR-01', '家长信息 + 孩子列表', g)
  t.method = 'GET'; t.path = '/parent-auth/me'; t.expect = '200'
  const me = await call('/parent-auth/me', { token: parentToken })
  t.actual = `${me.status} ${JSON.stringify(me.d || {}).slice(0, 80)}`
  if (me.ok) passed++; else { t.status = 'FAIL'; failed++ }

  // F02 家长查看孩子成绩（家长专用接口）
  t = T('PAR-02', '家长查看孩子成绩', g)
  t.method = 'GET'; t.path = '/parent-auth/exams'; t.expect = '200'
  const gr = await call('/parent-auth/exams', { token: parentToken })
  t.actual = `${gr.status}`
  if (gr.ok) passed++; else { t.status = 'FAIL'; failed++ }

  // F03 家长改密码
  t = T('PAR-03', '家长修改密码（原密码错误）', g)
  t.method = 'POST'; t.path = '/parent-auth/change-password'; t.expect = '400/401'
  const cp = await call('/parent-auth/change-password', { method: 'POST', token: parentToken, body: { oldPassword: 'wrong', newPassword: 'NewPass@2026' } })
  t.actual = `${cp.status}`
  if (cp.status === 400 || cp.status === 401) passed++; else { t.status = 'FAIL'; failed++ }

  // F04 家长查看班级公告（家长专用接口）
  t = T('PAR-04', '家长查看班级公告', g)
  t.method = 'GET'; t.path = '/parent-auth/notices'; t.expect = '200'
  const nt = await call('/parent-auth/notices', { token: parentToken })
  t.actual = `${nt.status}`
  if (nt.ok) passed++; else { t.status = 'FAIL'; failed++ }
}

async function suiteMessages(headToken, parentToken) {
  const g = 'G. 消息与通知'
  // G01 收件人列表（家长）
  let t = T('MSG-01', '教师获取可发消息收件人', g)
  t.method = 'GET'; t.path = '/messages/recipients'; t.expect = '200 + array'
  const rc = await call('/messages/recipients', { token: headToken })
  t.actual = `${rc.status} ${Array.isArray(rc.d) ? `items=${rc.d.length}` : ''}`
  if (rc.ok && Array.isArray(rc.d)) passed++; else { t.status = 'FAIL'; failed++ }

  // G02 发送消息（教师→家长）
  t = T('MSG-02', '教师发送消息给家长', g)
  t.method = 'POST'; t.path = '/messages'; t.expect = '201'
  const snd = await call('/messages', { method: 'POST', token: headToken, body: { recipientId: (Array.isArray(rc.d) ? (rc.d.find((r) => r.role === 'parent')?.id || ENV.created.student1Id) : ENV.created.student1Id), recipientRole: 'parent', title: 'QA测试留言', content: '孩子在校表现良好' } })
  t.actual = `${snd.status} ${JSON.stringify(snd.d || {}).slice(0, 60)}`
  if (snd.ok) passed++; else { t.status = 'FAIL'; failed++ }

  // G03 未读数
  t = T('MSG-03', '未读消息数', g)
  t.method = 'GET'; t.path = '/messages/unread-count'; t.expect = '200'
  const un = await call('/messages/unread-count', { token: headToken })
  t.actual = `${un.status}`
  if (un.ok) passed++; else { t.status = 'FAIL'; failed++ }

  // G04 通知列表
  t = T('MSG-04', '通知列表', g)
  t.method = 'GET'; t.path = '/notifications'; t.expect = '200'
  const nf = await call('/notifications', { token: headToken })
  t.actual = `${nf.status}`
  if (nf.ok) passed++; else { t.status = 'FAIL'; failed++ }
}

async function suiteAI(headToken) {
  const g = 'H. AI 模块'
  // H01 AI 配置读取（无密钥时优雅降级，不 500）
  let t = T('AI-01', 'AI 模型列表（无密钥环境）', g)
  t.method = 'POST'; t.path = '/config/ai/models'; t.expect = '200 或 4xx（非 500）'
  const m = await call('/config/ai/models', { method: 'POST', token: headToken, body: {} })
  t.actual = `${m.status}`
  if (m.status < 500) passed++; else { t.status = 'FAIL'; failed++ }

  // H02 AI 对话（无密钥：优雅失败而非崩溃）
  t = T('AI-02', 'AI 对话接口（无密钥环境）', g)
  t.method = 'POST'; t.path = '/ai/chat'; t.expect = '4xx 优雅降级（非 500）'
  const c = await call('/ai/chat', { method: 'POST', token: headToken, body: { message: '你好', history: [] } })
  t.actual = `${c.status}`
  if (c.status < 500) passed++; else { t.status = 'FAIL'; failed++ }
}

async function suiteContracts() {
  const g = 'I. 三端契约一致性（前端引用路径 vs 后端路由）'
  // 从 web-app 与 mini-program 源码提取 API 路径，与后端 430 条路由比对
  const webApiFiles = []
  const walk = (dir, ext, out) => {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, e.name)
      if (e.isDirectory()) walk(p, ext, out)
      else if (e.name.endsWith(ext)) out.push(p)
    }
    return out
  }
  walk(path.join(__dirname, '..', 'web-app', 'src', 'api'), '.ts', webApiFiles)
  walk(path.join(__dirname, '..', 'web-app', 'src', 'stores'), '.ts', webApiFiles)
  walk(path.join(__dirname, '..', 'mini-program', 'src', 'common'), '.js', webApiFiles)

  const routes = JSON.parse(fs.readFileSync(path.join(__dirname, 'routes-from-log.json'), 'utf8'))
  const routeSet = new Set(routes.map(r => r.split(' ')[1]))
  // 归一化：/api/xxx/:id → /api/xxx/{id}
  const norm = (p) => p.replace(/\/:[^/]+/g, '/{id}')
  const routeNorm = new Set([...routeSet].map(norm))

  const missing = new Set()
  const re = /['"`](\/api\/[^'"`]+)['"`]/g
  for (const f of webApiFiles) {
    const src = fs.readFileSync(f, 'utf8')
    let m
    while ((m = re.exec(src))) {
      const p = norm(m[1])
      if (!routeNorm.has(p) && !routeSet.has(m[1])) missing.add(`${path.basename(f)}: ${m[1]}`)
    }
  }
  const arr = [...missing]
  const t = T('CTR-01', '前端 API 路径与后端路由一致性', g)
  t.expect = '前端引用的 /api/* 路径全部存在于后端'
  t.actual = arr.length ? `缺失 ${arr.length} 条: ${arr.slice(0, 10).join('; ')}` : '全部匹配'
  if (arr.length === 0) passed++; else { t.status = 'FAIL'; failed++ }
}

// ================= 主流程 =================
console.log('🧪 园丁工作台全量功能测试开始 →', BASE)
console.log('==========================================')
const { su, sa, head } = await suiteAuth()
if (su) await suiteSuper(su)
if (sa) await suiteSchoolAdmin(sa)
if (head) {
  await suiteTeacherCrud(head)
  await suiteBusiness(head)
  await suiteMessages(head, ENV.created.parentToken)
  await suiteAI(head)
}
await suiteParent(ENV.created.parentToken)
await suiteContracts()

// ================= 报告 =================
const report = {
  generatedAt: new Date().toISOString(),
  base: BASE,
  environment: 'SQLite 内存库（QA 服务器 :3100，限流放宽）',
  summary: { total: results.length, passed, failed, blocked, passRate: (passed / results.length * 100).toFixed(1) + '%' },
  results,
}
fs.writeFileSync(path.join(__dirname, 'functional-report.json'), JSON.stringify(report, null, 2))
console.log('==========================================')
console.log(`📊 功能测试结果: 总 ${results.length} | ✅ 通过 ${passed} | ❌ 失败 ${failed} | ⏭ 阻塞 ${blocked} | 通过率 ${report.summary.passRate}`)
if (failed) {
  console.log('❌ 失败用例:')
  for (const r of results.filter(x => x.status !== 'PASS')) {
    console.log(`  [${r.id}] ${r.name}\n    期望: ${r.expect}\n    实际: ${r.actual}`)
  }
}
console.log(`📄 报告已写入 qa/functional-report.json`)
process.exit(failed ? 1 : 0)
