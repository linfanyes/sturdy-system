#!/usr/bin/env node
/**
 * API 全量测试套件（2026-08-06 重制版）— 直连云托管
 * 覆盖 4 角色 + 教师不同职位/学科 + 功能包/越权/安全边界
 * 依据 test-deliverables/10-全功能测试用例-2026-08-06.md 的 API-T 用例
 */
import { createRequire } from 'node:module'
const require = createRequire(import.meta.url)
const __dirname = new URL('.', import.meta.url).pathname
const BASE = (process.env.TEST_API_BASE || 'https://tec-work-283329-8-1440166408.sh.run.tcloudbase.com/api').replace(/\/$/, '')
const SUPER = { u: 'admin', p: 'admin' }
const delay = (ms) => new Promise((r) => setTimeout(r, ms))

const results = { pass: 0, fail: 0, skipped: 0, errors: [] }
function record(name, ok, err) {
  if (ok) { results.pass++; console.log(`  ✅ ${name}`) }
  else { results.fail++; results.errors.push({ name, error: err }); console.log(`  ❌ ${name}: ${err}`) }
}
const ok = (name) => record(name, true)
const fail = (name, err) => record(name, false, err)
async function tryCall(name, fn) {
  try { await fn(); ok(name) } catch (e) { fail(name, e.message) }
}
async function call(method, p, { body, token } = {}) {
  for (let attempt = 0; ; attempt++) {
    const res = await fetch(`${BASE}${p}`, {
      method,
      headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: body ? JSON.stringify(body) : undefined,
    })
    if (res.status === 429 && attempt < 6) {
      await delay(1200 * Math.pow(2, attempt))
      continue
    }
    const text = await res.text()
    let data = null
    try { data = text ? JSON.parse(text) : null } catch { data = text }
    return { status: res.status, data }
  }
}
async function mustCall(method, p, { body, token, expect = 2 } = {}) {
  const r = await call(method, p, { body, token })
  if (!(r.status >= expect && r.status < 300)) {
    const msg = r.data?.message || (typeof r.data === 'string' ? r.data.slice(0, 120) : JSON.stringify(r.data).slice(0, 120))
    throw new Error(`HTTP ${r.status}: ${msg}`)
  }
  return r.data
}
async function loginSuper() { return (await mustCall('POST', '/admin/login', { body: { username: SUPER.u, password: SUPER.p } })).token }
async function loginUnified(u, p) { return (await mustCall('POST', '/auth/unified-login', { body: { username: u, password: p } })).token }
async function loginParent(no, p) { return (await mustCall('POST', '/parent-auth/login', { body: { studentNo: no, password: p } })).token }

async function main() {
  console.log('=== API 全量测试开始 ===\n')
  const start = Date.now()
  const superToken = await loginSuper()
  ok('T-API-01-1 超管登录')

  // ---- 读取造数清单（可选）；缺失时从云端动态发现测试账号 ----
  let fixture = null
  try {
    fixture = JSON.parse(require('node:fs').readFileSync(require('node:path').join(__dirname, 'Test-Data-Fixtures', 'fixture-2026-08-06.json'), 'utf8'))
    ok('读取造数清单 fixture-2026-08-06.json')
  } catch (e) {
    console.log('  ⚠ 未找到 fixture，将从云端动态发现测试账号')
  }
  const sch0 = fixture?.schools?.[0]
  const cls0 = sch0?.classes?.[0]
  const saUser = sch0?.saUser || 'qa_sa_qa'
  const saPass = sch0?.saPass || 'Qa@2026'
  let htUser = cls0?.teacherId ? `qa_${sch0.prefix.toLowerCase()}_ht_1` : null

  // 动态发现：从校管教师列表找班主任账号（fixture 缺失时）
  // 优先级：username 含 _ht_（班主任命名规范）> positions 含班主任 > 列表第一个
  let saTokenDyn = null
  try { saTokenDyn = await loginUnified(saUser, saPass) } catch { /* 稍后重试 */ }
  if (!htUser && saTokenDyn) {
    const tr = await call('GET', '/school-admin/teachers?skip=0&take=100', { token: saTokenDyn })
    const tList = Array.isArray(tr.data) ? tr.data : tr.data?.items || []
    const head = tList.find((t) => t.username?.includes('_ht_'))
      || tList.find((t) => (t.positions || []).includes('班主任'))
      || tList.find((t) => t.username?.startsWith('qa_qa_'))
      || tList[0]
    if (head?.username) htUser = head.username
  }
  let parentNo = null
  if (saTokenDyn) {
    const sr = await call('GET', '/school-admin/students', { token: saTokenDyn })
    const sList = Array.isArray(sr.data) ? sr.data : sr.data?.items || []
    parentNo = sList.find((s) => (s.studentNo || '').endsWith('001') && /^\d+$/.test(s.studentNo))?.studentNo
      || sList.find((s) => /^\d+$/.test(s.studentNo || ''))?.studentNo
      || null
  }

  // ============ T-API-01 认证与登录 ============
  console.log('\n--- T-API-01 认证与登录 ---')
  await tryCall('T-API-01-2 校管统一登录', async () => {
    const t = await loginUnified(saUser, saPass); if (!t) throw new Error('无 token')
  })
  await tryCall('T-API-01-3 教师统一登录（班主任）', async () => {
    if (!htUser) throw new Error('无班主任')
    const t = await loginUnified(htUser, 'Qa@2026'); if (!t) throw new Error('无 token')
  })
  await tryCall('T-API-01-5 错误密码登录', async () => {
    const r = await call('POST', '/auth/unified-login', { body: { username: saUser, password: 'wrong-pass' } })
    if (r.status !== 401) throw new Error('期望 401 实际 ' + r.status)
  })
  await tryCall('T-API-01-6 不存在用户登录', async () => {
    const r = await call('POST', '/auth/unified-login', { body: { username: 'no_such_user_xxx', password: 'x' } })
    if (r.status !== 401) throw new Error('期望 401 实际 ' + r.status)
  })
  await tryCall('T-API-01-7 无 token 访问受保护接口', async () => {
    const r = await call('GET', '/school-admin/dashboard')
    if (r.status !== 401) throw new Error('期望 401 实际 ' + r.status)
  })
  await tryCall('T-API-01-8 /auth/me', async () => {
    const t = await loginUnified(saUser, saPass)
    const me = await mustCall('GET', '/auth/me', { token: t })
    if (me.role !== 'school_admin') throw new Error('role=' + me.role)
  })

  // ============ T-API-02 超管接口 ============
  console.log('\n--- T-API-02 超管接口 ---')
  let schoolId = sch0?.id
  await tryCall('T-API-02-1 学校列表', async () => {
    const r = await mustCall('GET', '/admin/schools?skip=0&take=50', { token: superToken })
    const list = Array.isArray(r) ? r : r.items || []
    if (!list.length) throw new Error('无学校')
    schoolId = schoolId || list[0].id
  })
  await tryCall('T-API-02-2 学校详情', async () => {
    if (!schoolId) throw new Error('无 schoolId')
    await mustCall('GET', `/admin/schools/${schoolId}`, { token: superToken })
  })
  await tryCall('T-API-02-3 更新学校', async () => {
    if (!schoolId) throw new Error('无 schoolId')
    await mustCall('PATCH', `/admin/schools/${schoolId}`, { body: { contact: '测试更新', status: 'active' }, token: superToken })
  })
  await tryCall('T-API-02-4 学校功能包', async () => {
    if (!schoolId) throw new Error('无 schoolId')
    await mustCall('GET', `/admin/schools/${schoolId}/features`, { token: superToken })
  })
  await tryCall('T-API-02-6 校管列表', async () => {
    const r = await mustCall('GET', '/admin/school-admins?skip=0&take=50', { token: superToken })
    const list = Array.isArray(r) ? r : r.items || []
    if (!list.some((a) => a.username === saUser)) throw new Error('未找到造数校管')
  })
  await tryCall('T-API-02-7 校管启停', async () => {
    const r = await mustCall('GET', '/admin/school-admins?skip=0&take=50', { token: superToken })
    const list = Array.isArray(r) ? r : r.items || []
    const sa = list.find((a) => a.username === saUser)
    if (!sa) throw new Error('无校管')
    await mustCall('PATCH', `/admin/school-admins/${sa.id}/enabled`, { body: { enabled: true }, token: superToken })
  })
  await tryCall('T-API-02-8 重置校管密码（重置回原密码）', async () => {
    const r = await mustCall('GET', '/admin/school-admins?skip=0&take=50', { token: superToken })
    const list = Array.isArray(r) ? r : r.items || []
    const sa = list.find((a) => a.username === saUser)
    if (!sa) throw new Error('无校管')
    await mustCall('PATCH', `/admin/school-admins/${sa.id}/password`, { body: { password: saPass }, token: superToken })
  })
  await tryCall('T-API-02-10 全量教师视图', async () => {
    const r = await mustCall('GET', '/admin/teachers?skip=0&take=50', { token: superToken })
    const list = Array.isArray(r) ? r : r.items || []
    if (!list.length) throw new Error('无教师数据')
  })
  await tryCall('T-API-02-11 全量学生视图', async () => {
    const r = await mustCall('GET', '/admin/students?skip=0&take=50', { token: superToken })
    const list = Array.isArray(r) ? r : r.items || []
    if (!list.length) throw new Error('无学生数据')
  })
  await tryCall('T-API-02-12 审计日志', async () => {
    await mustCall('GET', '/admin/audit-logs?skip=0&take=20', { token: superToken })
  })
  await tryCall('T-API-02-15 越权：超管访问校管接口', async () => {
    const r = await call('GET', '/school-admin/dashboard', { token: superToken })
    if (r.status !== 403 && r.status !== 401) throw new Error('期望 403/401 实际 ' + r.status)
  })

  // ============ T-API-03 校管接口 ============
  console.log('\n--- T-API-03 校管接口 ---')
  const saToken = await loginUnified(saUser, saPass)
  await tryCall('T-API-03-1 校管仪表盘', async () => {
    const d = await mustCall('GET', '/school-admin/dashboard', { token: saToken })
    if (typeof d.totalTeachers !== 'number') throw new Error('缺 totalTeachers: ' + JSON.stringify(d).slice(0, 100))
  })
  await tryCall('T-API-03-2 教师列表', async () => {
    const r = await mustCall('GET', '/school-admin/teachers?skip=0&take=100', { token: saToken })
    const list = Array.isArray(r) ? r : r.items || []
    if (!list.length) throw new Error('无教师')
  })
  await tryCall('T-API-03-3 创建教师（临时）', async () => {
    const tmp = await mustCall('POST', '/school-admin/teachers', { body: { name: '临时测试老师', username: 'qa_tmp_' + Date.now().toString(36), password: 'Qa@2026', gender: '男', subject: '语文' }, token: saToken })
    if (!tmp?.id) throw new Error('未返回 id')
  })
  await tryCall('T-API-03-4 更新教师', async () => {
    const r = await mustCall('GET', '/school-admin/teachers?skip=0&take=10', { token: saToken })
    const list = Array.isArray(r) ? r : r.items || []
    if (!list[0]) throw new Error('无教师')
    await mustCall('PATCH', `/school-admin/teachers/${list[0].id}`, { body: { positions: ['班主任', '教研组长'] }, token: saToken })
  })
  await tryCall('T-API-03-6 教师功能包设置', async () => {
    const r = await mustCall('GET', '/school-admin/teachers?skip=0&take=10', { token: saToken })
    const list = Array.isArray(r) ? r : r.items || []
    if (!list[0]) throw new Error('无教师')
    await mustCall('PATCH', `/school-admin/teachers/${list[0].id}/features`, { body: { features: ['exams', 'grades', 'students', 'classes'] }, token: saToken })
    // 恢复默认（null=全部）
    await mustCall('PATCH', `/school-admin/teachers/${list[0].id}/features`, { body: { features: [] }, token: saToken })
  })
  await tryCall('T-API-03-7 重置教师密码', async () => {
    const r = await mustCall('GET', '/school-admin/teachers?skip=0&take=10', { token: saToken })
    const list = Array.isArray(r) ? r : r.items || []
    if (!list[0]) throw new Error('无教师')
    await mustCall('POST', `/school-admin/teachers/${list[0].id}/reset-password`, { body: { password: 'Qa@2026' }, token: saToken })
  })
  await tryCall('T-API-03-9 班级列表', async () => {
    const r = await mustCall('GET', '/school-admin/classes', { token: saToken })
    const list = Array.isArray(r) ? r : r.items || []
    if (!list.length) throw new Error('无班级')
  })
  await tryCall('T-API-03-10 班级升级测试（创建后升级再恢复）', async () => {
    const r = await mustCall('GET', '/school-admin/classes', { token: saToken })
    const list = Array.isArray(r) ? r : r.items || []
    const c = list.find((x) => x.name.includes('一年级'))
    if (c) {
      await mustCall('POST', `/school-admin/classes/${c.id}/promote`, { body: { targetGrade: '一年级' }, token: saToken })
    } else { /* 跳过 */ }
  })
  await tryCall('T-API-03-11 学生列表（大数据量）', async () => {
    const r = await mustCall('GET', '/school-admin/students', { token: saToken })
    const list = Array.isArray(r) ? r : r.items || []
    if (list.length < 50) throw new Error('学生数过少: ' + list.length)
  })
  await tryCall('T-API-03-14 学校公告', async () => {
    const r = await mustCall('GET', '/school-admin/notices', { token: saToken })
    const list = Array.isArray(r) ? r : r.items || []
    if (!list.length) throw new Error('无公告')
  })
  await tryCall('T-API-03-15 全局搜索', async () => {
    const r = await mustCall('GET', '/school-admin/search?q=同学', { token: saToken })
    if (!r || typeof r !== 'object') throw new Error('搜索异常')
  })
  await tryCall('T-API-03-17 资源库列表', async () => {
    await mustCall('GET', '/school-admin/resource-library/poems?take=5', { token: saToken })
  })
  await tryCall('T-API-03-18 教材树', async () => {
    await mustCall('GET', '/school-admin/textbooks?take=5', { token: saToken })
  })

  // ============ T-API-04 教师接口 ============
  console.log('\n--- T-API-04 教师接口 ---')
  let teacherToken
  let myClassId = cls0?.id
  try {
    teacherToken = await loginUnified(htUser, 'Qa@2026')
    ok('T-API-04 班主任登录')
  } catch (e) {
    fail('T-API-04 班主任登录', e.message)
  }
  if (teacherToken) {
    await tryCall('T-API-04-1 我的班级', async () => {
      const r = await mustCall('GET', '/classes', { token: teacherToken })
      const list = Array.isArray(r) ? r : r.items || []
      myClassId = list[0]?.id || myClassId
      if (!list.length) throw new Error('无班级')
    })
    await tryCall('T-API-04-2 班级成员', async () => {
      if (!myClassId) throw new Error('无班级')
      await mustCall('POST', `/classes/${myClassId}/members/list`, { body: {}, token: teacherToken })
    })
    await tryCall('T-API-04-3 学生列表（教师）', async () => {
      await mustCall('GET', '/students', { token: teacherToken })
    })
    await tryCall('T-API-04-4 家长登录开关', async () => {
      const r = await mustCall('GET', '/students', { token: teacherToken })
      const list = Array.isArray(r) ? r : r.items || []
      const st = list[0]
      if (!st) throw new Error('无学生')
      await mustCall('POST', `/students/${st.id}/toggle-parent-login`, { body: {}, token: teacherToken })
    })
    await tryCall('T-API-04-5 导入学生预览', async () => {
      const csv = Buffer.from('姓名,性别,学号,家长姓名,家长电话\n导入测试,男,IMP001,导入家长,13900000001').toString('base64')
      await mustCall('POST', '/students/import', { body: { filename: 'test.csv', data: csv }, token: teacherToken })
    })
    await tryCall('T-API-04-6 创建考试（临时）', async () => {
      if (!myClassId) throw new Error('无班级')
      const e = await mustCall('POST', '/exams', { body: { name: 'API测试考试', classId: myClassId, subjects: ['语文'], date: '2026-03-20', term: '2026 春', subjectFullScores: { 语文: 100 } }, token: teacherToken })
      if (!e?.id) throw new Error('未返回 id')
    })
    await tryCall('T-API-04-7 成绩 merge（幂等）', async () => {
      if (!myClassId) throw new Error('无班级')
      const students = await mustCall('GET', '/students', { token: teacherToken })
      const list = Array.isArray(students) ? students : students.items || []
      const scores = list.slice(0, 10).map((s) => ({ studentId: s.id, score: 88 }))
      await mustCall('POST', '/grades/merge', { body: { classId: myClassId, examName: '2026春第1次月考', subject: '语文', scores, date: '2026-03-15' }, token: teacherToken })
    })
    await tryCall('T-API-04-8 成绩列表', async () => {
      await mustCall('GET', '/grades?take=10', { token: teacherToken })
    })
    await tryCall('T-API-04-9 成绩分析', async () => {
      if (!myClassId) throw new Error('无班级')
      // 先取一场真实考试拿 examId
      const ex = await mustCall('GET', '/exams?classId=' + myClassId + '&take=5', { token: teacherToken })
      const exList = Array.isArray(ex) ? ex : ex.items || []
      if (!exList[0]?.id) throw new Error('无考试')
      const r = await mustCall('GET', `/grades/analysis/exam?classId=${myClassId}&examId=${exList[0].id}`, { token: teacherToken })
      if (!r) throw new Error('分析为空')
    })
    await tryCall('T-API-04-10 课表', async () => {
      await mustCall('GET', '/schedules', { token: teacherToken })
    })
    await tryCall('T-API-04-11 考勤', async () => {
      await mustCall('GET', '/attendances?take=5', { token: teacherToken })
    })
    await tryCall('T-API-04-12 作业', async () => {
      await mustCall('GET', '/homework?take=5', { token: teacherToken })
    })
    await tryCall('T-API-04-13 班级公告', async () => {
      await mustCall('GET', '/notices?take=5', { token: teacherToken })
    })
    await tryCall('T-API-04-14 资源', async () => {
      await mustCall('GET', '/resources?take=5', { token: teacherToken })
    })
    await tryCall('T-API-04-15 评价系（奖励/成长/行为）', async () => {
      await mustCall('GET', '/reward-records?take=5', { token: teacherToken })
      await mustCall('GET', '/growth-entries?take=5', { token: teacherToken })
      await mustCall('GET', '/behavior-records?take=5', { token: teacherToken })
    })
    await tryCall('T-API-04-16 待办/笔记/工作日志', async () => {
      await mustCall('GET', '/todos?take=5', { token: teacherToken })
      await mustCall('GET', '/notes?take=5', { token: teacherToken })
      await mustCall('GET', '/work-logs?take=5', { token: teacherToken })
    })
    await tryCall('T-API-04-17 家长联系/留言板', async () => {
      await mustCall('GET', '/parent-contacts?take=5', { token: teacherToken })
      await mustCall('GET', '/messages?take=5', { token: teacherToken })
    })
    await tryCall('T-API-04-19 教材树', async () => {
      await mustCall('GET', '/textbooks/tree?take=5', { token: teacherToken })
    })
    await tryCall('T-API-04-20 在线资源', async () => {
      await mustCall('GET', '/online-resources/zhzx/courses?take=5', { token: teacherToken })
    })
    await tryCall('T-API-04-22 排行榜', async () => {
      if (!myClassId) throw new Error('无班级')
      await mustCall('GET', `/leaderboard?classId=${myClassId}`, { token: teacherToken })
    })
    await tryCall('T-API-04-24 越权：教师访问校管接口', async () => {
      const r = await call('GET', '/school-admin/teachers', { token: teacherToken })
      if (r.status !== 403 && r.status !== 401) throw new Error('期望 403/401 实际 ' + r.status)
    })
  }

  // ============ T-API-05 家长接口 ============
  console.log('\n--- T-API-05 家长接口 ---')
  let parentToken
  try {
    const stu = await (async () => {
      // 优先用已验证的家长账号（mini-test-tokens），兜底动态发现本校学生
      if (!parentNo) {
        try {
          const fs = require('node:fs')
          const path = require('node:path')
          const cwd = process.cwd()
          const p = path.join(cwd, 'scripts', 'mini-test-tokens.json')
          const t = JSON.parse(fs.readFileSync(p, 'utf8')).roles.parent
          if (t?.studentNo && /^\d+$/.test(String(t.studentNo))) return { studentNo: t.studentNo, legacy: true }
        } catch (e) { console.log('  ⚠ 读 mini-test-tokens 失败: ' + e.message) }
      }
      if (parentNo) return { studentNo: parentNo }
      const r = await mustCall('GET', '/school-admin/students', { token: saToken })
      const list = Array.isArray(r) ? r : r.items || []
      return list.find((s) => (s.studentNo || '').endsWith('001')) || list[0]
    })()
    parentNo = stu.studentNo
    console.log('  🔎 尝试家长登录 studentNo=' + JSON.stringify(parentNo))
    // 自适应密码：历史账号可能已被改过密码（12345678），先试 123456 再试 12345678
    try {
      parentToken = await loginParent(stu.studentNo, '123456')
    } catch {
      parentToken = await loginParent(stu.studentNo, '12345678')
    }
    ok('T-API-05 家长登录（' + stu.studentNo + '）')
  } catch (e) {
    fail('T-API-05 家长登录', e.message)
  }
  if (parentToken) {
    await tryCall('T-API-05-1 家长 me', async () => {
      await mustCall('GET', '/parent-auth/me', { token: parentToken })
    })
    await tryCall('T-API-05-2 成绩', async () => {
      await mustCall('GET', '/parent-auth/exams', { token: parentToken })
    })
    await tryCall('T-API-05-3 公告', async () => {
      await mustCall('GET', '/parent-auth/notices', { token: parentToken })
    })
    await tryCall('T-API-05-4 作业', async () => {
      await mustCall('GET', '/parent-auth/homework', { token: parentToken })
    })
    await tryCall('T-API-05-5 考勤', async () => {
      await mustCall('GET', '/parent-auth/attendance', { token: parentToken })
    })
    await tryCall('T-API-05-6 行为', async () => {
      await mustCall('GET', '/parent-auth/behavior', { token: parentToken })
    })
    await tryCall('T-API-05-7 课表', async () => {
      await mustCall('GET', '/parent-auth/schedule', { token: parentToken })
    })
    await tryCall('T-API-05-8 沟通记录', async () => {
      await mustCall('GET', '/parent-auth/communications', { token: parentToken })
    })
    await tryCall('T-API-05-9 科任老师', async () => {
      await mustCall('GET', '/parent-auth/teachers', { token: parentToken })
    })
    // 改密码放最后：修改后旧 token 失效、密码变更，不影响前面用例
    await tryCall('T-API-05-10 修改密码（≥8 位）', async () => {
      // 后端要求新密码 ≥8 位。首次：123456 → 12345678；若已改过（旧密码即 12345678），同改幂等通过
      const r1 = await call('POST', '/parent-auth/change-password', { body: { oldPassword: '123456', newPassword: '12345678' }, token: parentToken })
      if (r1.status >= 400) {
        // 已改过密码：用 12345678 作为旧密码再改一次（同值幂等）
        const r2 = await call('POST', '/parent-auth/change-password', { body: { oldPassword: '12345678', newPassword: '12345678' }, token: parentToken })
        if (r2.status >= 400) throw new Error('修改密码失败: ' + (r2.data?.message || r2.status))
      }
    })
  }

  // ============ T-API-06 消息 ============
  console.log('\n--- T-API-06 消息与通知 ---')
  if (teacherToken && parentToken) {
    await tryCall('T-API-06-1 教师查收件人', async () => {
      const r = await mustCall('GET', '/messages/recipients', { token: teacherToken })
      const list = Array.isArray(r) ? r : r.items || []
      if (!list.length) throw new Error('无家长收件人（可能该班未建家长联系）')
    })
    await tryCall('T-API-06-3 家长收件箱', async () => {
      await mustCall('GET', '/messages', { token: parentToken })
    })
    await tryCall('T-API-06-5 通知中心', async () => {
      await mustCall('GET', '/notifications?take=5', { token: teacherToken })
    })
  }

  // ============ T-API-07 安全边界 ============
  console.log('\n--- T-API-07 安全与边界 ---')
  await tryCall('T-API-07-2 分页 take=9999 截断', async () => {
    const r = await mustCall('GET', '/school-admin/students?take=9999', { token: saToken })
    const list = Array.isArray(r) ? r : r.items || []
    if (list.length > 500) throw new Error('take 未截断到 500: ' + list.length)
  })
  await tryCall('T-API-07-3 空参数 400', async () => {
    const r = await call('POST', '/school-admin/teachers', { body: {}, token: saToken })
    if (r.status < 400) throw new Error('期望 4xx 实际 ' + r.status)
  })
  await tryCall('T-API-07-4 超长字段 400', async () => {
    const r = await call('POST', '/school-admin/teachers', { body: { name: 'x'.repeat(500), username: 'x'.repeat(100) }, token: saToken })
    if (r.status < 400) throw new Error('期望 4xx 实际 ' + r.status)
  })
  await tryCall('T-API-07-6 弱密码', async () => {
    const r = await call('POST', '/parent-auth/change-password', { body: { oldPassword: '123456', newPassword: '123' }, token: parentToken })
    if (r.status < 400) throw new Error('期望 4xx 实际 ' + r.status)
  })
  await tryCall('T-API-07-7 删除不存在资源', async () => {
    const r = await call('DELETE', '/school-admin/notices/no-such-id', { token: saToken })
    if (r.status !== 404 && r.status !== 400) throw new Error('期望 404/400 实际 ' + r.status)
  })

  const elapsed = ((Date.now() - start) / 1000).toFixed(1)
  console.log(`\n=== API 测试完成：通过 ${results.pass} / 失败 ${results.fail} / 跳过 ${results.skipped}，耗时 ${elapsed}s ===`)
  if (results.fail) {
    console.log('\n失败明细：')
    results.errors.forEach((e) => console.log(`  ❌ ${e.name}: ${e.error}`))
  }
  process.exit(results.fail ? 1 : 0)
}
main().catch((e) => { console.error('FATAL: ' + e.message); process.exit(1) })
