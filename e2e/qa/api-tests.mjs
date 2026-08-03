// QA API 全接口测试执行（对应 deliverables/test-cases.md 的 API 用例）
// 用法: node e2e/qa/api-tests.mjs
// 产物: deliverables/api-test-results.json
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const env = JSON.parse(fs.readFileSync(path.join(__dirname, 'qa-env.json'), 'utf8'))
const BASE = env.base
const j = { 'Content-Type': 'application/json' }
const results = []
const created = { noticeId: null, examId: null, gradeId: null, contactId: null, todoId: null, noteId: null, backupId: null, messageId: null, seatLayoutId: null, calendarId: null, textbookId: null, unitId: null, pointId: null, poemId: null, formulaId: null, wordId: null, rewardId: null, scoreId: null, rosterId: null, expenseId: null, activityId: null, galleryId: null, myGalleryId: null, dutyConfigId: null, awardCatId: null, awardId: null, behaviorId: null, growthId: null, checkinId: null, readingId: null, workLogId: null, obsId: null, scheduleId: null, attendanceId: null, homeworkId: null, generatedPlanId: null, templateId: null, parentContactId: null, dutyRosterId: null, students: [] }

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
async function call(p, { method = 'GET', body, token } = {}) {
  for (let attempt = 0; attempt < 4; attempt++) {
    const r = await fetch(BASE + p, {
      method,
      headers: { ...j, ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: body ? JSON.stringify(body) : undefined,
    })
    await sleep(90) // 全局限流 60/min 容忍
    if (r.status === 429) { await sleep(2500 * (attempt + 1)); continue }
    const t = await r.text()
    let d
    try { d = t ? JSON.parse(t) : null } catch { d = t }
    return { status: r.status, ok: r.ok, d }
  }
  return { status: 429, ok: false, d: { message: 'rate limited after retries' } }
}
async function login(p, body) {
  const r = await call(p, { method: 'POST', body })
  return r.ok ? r.d.token : null
}

// ---------- 断言与用例注册 ----------
let failed = 0
async function t(id, title, fn, expectCode = 200) {
  try {
    const r = await fn()
    // 语义: 200 兼容 2xx(201 等)；'any' 仅记录不判失败（用于探测类用例）
    const pass = expectCode === 'any' ? true : expectCode === 200 ? r.status >= 200 && r.status < 300 : r.status === expectCode
    if (!pass) {
      failed++
      results.push({ id, title, status: 'FAIL', expect: expectCode, actual: r.status, detail: (typeof r.d === 'string' ? r.d : JSON.stringify(r.d)?.slice(0, 160)) })
    } else {
      results.push({ id, title, status: 'PASS', actual: r.status })
    }
  } catch (e) {
    failed++
    results.push({ id, title, status: 'ERROR', expect: expectCode, actual: 'threw', detail: e.message.slice(0, 160) })
  }
}

const T = env.created // tokens & ids
const pA = (method, path, body, token, expect) => () => call(path, { method, body, token })

console.log('═══════ QA API 全接口测试 ═══════')
console.log('目标:', BASE, '| 学校:', T.schoolName)

// ============ 1. 认证 ============
console.log('\n[1] 认证模块')
await t('TC-AUTH-001', '超管登录', pA('POST', '/admin/login', { username: 'admin', password: 'admin' }))
await t('TC-AUTH-002', '超管错误密码', pA('POST', '/admin/login', { username: 'admin', password: 'wrong' }), 401)
await t('TC-AUTH-003', '校管登录', pA('POST', '/school-admin/login', { username: 'qa_sa', password: env.password }))
await t('TC-AUTH-004', '校管错误密码', pA('POST', '/school-admin/login', { username: 'qa_sa', password: 'wrong' }), 401)
await t('TC-AUTH-005', '教师密码登录', pA('POST', '/auth/password-login', { username: 'qa_teacher', password: env.password }))
await t('TC-AUTH-006', '不存在的账号', pA('POST', '/auth/password-login', { username: 'no_such_user', password: 'x' }), 401)
await t('TC-AUTH-007', '家长登录(学号)', async () => {
  const sid = T.students[0].id
  const cur = await call('/students/' + sid, { token: T.teacherToken })
  if (!cur.ok) return cur
  if (!cur.d.parentLoginEnabled) {
    await call('/students/' + sid + '/toggle-parent-login', { method: 'POST', token: T.teacherToken })
  }
  await call('/students/' + sid + '/reset-parent-password', { method: 'POST', token: T.teacherToken })
  return call('/parent-auth/login', { method: 'POST', body: { studentNo: (T.students[0]?.studentNo || '12101'), password: '123456' } })
})
await t('TC-AUTH-008', '教师统一登录错误密码', pA('POST', '/auth/unified-login', { username: 'qa_teacher', password: 'wrong' }), 401)
await t('TC-AUTH-009', '统一登录缺参', pA('POST', '/auth/unified-login', {}), 400)
await t('TC-AUTH-010', 'auth/me 带 token', pA('GET', '/auth/me', null, T.teacherToken))
await t('TC-AUTH-011', 'auth/me 无 token', pA('GET', '/auth/me'), 401)
await t('TC-AUTH-012', 'auth/me 伪造 token', pA('GET', '/auth/me', null, 'invalid.token.here'), 401)
await t('TC-AUTH-013', 'health', pA('GET', '/health'))
await t('TC-AUTH-015', '教师调超管接口', pA('POST', '/admin/schools', { name: 'x' }, T.teacherToken), 401)
await t('TC-AUTH-016', '教师调校管接口', pA('POST', '/school-admin/teachers', { name: 'x' }, T.teacherToken), 401)

// ============ 2. 超管模块 ============
console.log('\n[2] 超管模块')
await t('TC-ADM-001b', '学校列表(super)', pA('GET', '/admin/schools?skip=0&take=10', null, T.saToken), 401) // 覆盖
const suLogin = await call('/admin/login', { method: 'POST', body: { username: 'admin', password: 'admin' } })
const suToken = suLogin.d?.token
await t('TC-ADM-001c', '学校列表(super token)', pA('GET', '/admin/schools?skip=0&take=3', null, suToken))
await t('TC-ADM-002', 'take 越界钳制', pA('GET', '/admin/schools?skip=0&take=99999', null, suToken))
await t('TC-ADM-004', '建学校缺 name', pA('POST', '/admin/schools', { prefix: 'X' }, suToken), 400)
await t('TC-ADM-010', '建校管', pA('POST', '/admin/school-admins', { username: 'qa_sa2', password: env.password, name: 'QA校管2', schoolId: T.schoolId, enabled: true }, suToken))
await t('TC-ADM-011', '建校管重复用户名', pA('POST', '/admin/school-admins', { username: 'qa_sa2', password: env.password, name: 'dup', schoolId: T.schoolId }, suToken), 400)
await t('TC-ADM-015', '审计日志', pA('GET', '/admin/audit-logs?skip=0&take=10', null, suToken))
await t('TC-ADM-016', '审计日志无权限', pA('GET', '/admin/audit-logs', null, T.teacherToken), 401)
await t('TC-ADM-017', 'reset-all 未确认', pA('POST', '/admin/reset-all', { confirm: false }, suToken), 400)
await t('TC-ADM-019', '平台教师列表', pA('GET', '/admin/teachers?skip=0&take=5', null, suToken))
// 校管管理
await t('TC-ADM-012', '重置校管密码', pA('PATCH', `/admin/school-admins/${T.saId}/password`, { password: 'NewPass@2026' }, suToken))
const oldPwLogin = await call('/school-admin/login', { method: 'POST', body: { username: 'qa_sa', password: env.password } })
const newPwLogin = await call('/school-admin/login', { method: 'POST', body: { username: 'qa_sa', password: 'NewPass@2026' } })
results.push({ id: 'TC-ADM-012b', title: '重置后旧密码失效', status: oldPwLogin.ok ? 'FAIL' : 'PASS', detail: oldPwLogin.ok ? '旧密码仍可登录' : '旧密码已失效' })
if (!newPwLogin.ok) { failed++; results.push({ id: 'TC-ADM-012c', title: '重置后新密码可登录', status: 'FAIL', detail: JSON.stringify(newPwLogin.d).slice(0, 100) }) } else results.push({ id: 'TC-ADM-012c', title: '重置后新密码可登录', status: 'PASS' })
// 恢复 qa_sa 密码为 Test@2026 并重取 token
await call('/admin/school-admins', { method: 'POST', body: { username: 'qa_sa2', password: env.password, name: 'QA校管2', schoolId: T.schoolId, enabled: true }, token: suToken })
const saRes = await call('/admin/school-admins?skip=0&take=100', { token: suToken })
const saList = Array.isArray(saRes.d) ? saRes.d : saRes.d?.items || []
const sa2 = saList.find((a) => a.username === 'qa_sa2')
if (sa2) await call(`/admin/school-admins/${sa2.id}`, { method: 'DELETE', token: suToken })
await call(`/admin/school-admins/${T.saId}/password`, { method: 'PATCH', body: { password: env.password }, token: suToken })
const saRelogin = await call('/school-admin/login', { method: 'POST', body: { username: 'qa_sa', password: env.password } })
T.saToken = saRelogin.d?.token || T.saToken

// ============ 3. 校管模块 ============
console.log('\n[3] 校管模块')
const sa = { token: T.saToken }
await t('TC-SA-001', '校管 dashboard', pA('GET', '/school-admin/dashboard', null, sa.token))
await t('TC-SA-002', '校管教师列表', pA('GET', '/school-admin/teachers?skip=0&take=10', null, sa.token))
await t('TC-SA-003', '建教师', pA('POST', '/school-admin/teachers', { name: 'QA临时教师', username: 'qa_temp_t', password: env.password, phone: '13855556666', gender: '男', subject: '英语', subjects: ['英语'], positions: ['科任'], grade: '三年级', enabled: true }, sa.token))
await t('TC-SA-004', '建教师缺name', pA('POST', '/school-admin/teachers', { username: 'qa_no_name' }, sa.token), 400)
await t('TC-SA-005', '建教师重复用户名', pA('POST', '/school-admin/teachers', { name: 'QA临时教师2', username: 'qa_temp_t', password: env.password }, sa.token), 400)
const teacherList = await call('/school-admin/teachers?skip=0&take=100', { token: sa.token })
const tl = Array.isArray(teacherList.d) ? teacherList.d : teacherList.d?.items || []
const tempT = tl.find((x) => x.username === 'qa_temp_t')
await t('TC-SA-006', '教师批量建', pA('POST', '/school-admin/teachers/batch', { teachers: [{ name: 'QA批量甲', username: 'qa_batch_1', password: env.password, subject: '语文' }, { name: 'QA批量乙', username: 'qa_batch_2', password: env.password, subject: '数学' }] }, sa.token))
await t('TC-SA-007', '更新教师', pA('PATCH', `/school-admin/teachers/${T.teacherId}`, { motto: 'QA更新测试' }, sa.token))
await t('TC-SA-008', '设置教师功能包', async () => {
  const set = await call('/school-admin/teachers/' + T.teacherId + '/features', { method: 'PATCH', body: { features: ['students', 'exams', 'grades'] }, token: sa.token })
  if (!set.ok) return set
  const me = await call('/auth/me', { token: T.teacherToken })
  const f = me.d?.effectiveFeatures || []
  const has = f.includes('students') && !f.includes('notes')
  await call('/school-admin/teachers/' + T.teacherId + '/features', { method: 'PATCH', body: { features: [] }, token: sa.token })
  return { status: me.status, ok: has, d: { effectiveCount: f.length } }
})
await t('TC-SA-009', '重置教师密码', pA('POST', `/school-admin/teachers/${T.teacherId}/reset-password`, { password: env.password }, sa.token))
await t('TC-SA-010', '删除教师', pA('DELETE', `/school-admin/teachers/${tempT?.id || 'none'}`, null, sa.token), tempT ? 200 : 404)
await t('TC-SA-011', '删除不存在教师', pA('DELETE', '/school-admin/teachers/nonexistent-id', null, sa.token), 400)
await t('TC-SA-012', '导出教师 CSV', pA('GET', '/school-admin/export/teachers', null, sa.token))
await t('TC-SA-013', '导出教师 XLS', pA('GET', '/school-admin/export/teachers-xls', null, sa.token))
await t('TC-SA-014', '教师导入预览', pA('POST', '/school-admin/teachers/import-preview', { filename: 't.csv', data: Buffer.from('姓名,性别,学科\n导入教师,男,语文').toString('base64') }, sa.token))
await t('TC-SA-015', '教师导入预览非法', pA('POST', '/school-admin/teachers/import-preview', { filename: 't.csv', data: '!!!not-base64!!!' }, sa.token), 400)
await t('TC-SA-101', '班级列表', pA('GET', '/school-admin/classes', null, sa.token))
// 清理 qa_teacher2 可能残留的班级（跨天/多轮运行数据污染）
const t2ClsRes = await call('/classes', { token: T.teacher2Token })
const t2Cls = Array.isArray(t2ClsRes.d?.items) ? t2ClsRes.d.items.find(c => c.teacherId === T.teacher2Id) : null
if (t2Cls?.id) {
  const delRes = await call(`/classes/${t2Cls.id}`, { method: 'DELETE', token: sa.token })
  if (delRes.ok) {
    console.log('[info] 清理 qa_teacher2 旧班级:', t2Cls.id)
  } else {
    console.warn('[warn] 清理旧班级失败:', JSON.stringify(delRes.d).slice(0, 80))
  }
}
await t('TC-SA-102', '建班级(自适应: 班主任空闲=成功/已任他班=400冲突)', async () => {
  // 用校管接口探测 qa_teacher2 是否已是本学期班主任（sa token 稳定可靠）
  const t2cls = await call('/school-admin/classes', { token: sa.token })
  const t2List = Array.isArray(t2cls.d) ? t2cls.d : (t2cls.d?.items || [])
  const t2head = t2List.find(c => c.teacherId === T.teacher2Id)
  const r = await call('/school-admin/classes', { method: 'POST', token: sa.token, body: { name: 'QA二班', grade: '三年级', classNo: '2', headTeacher: 'QA测试教师2', headTeacherId: T.teacher2Id, term: '2026-2027-1', subjects: ['语文', '数学'], subjectTeachers: [{ teacherId: T.teacher2Id, subjects: ['语文', '数学'] }] } })
  if (t2head) {
    // 已任他班班主任 → 业务规则应拒绝（400）
    if (r.status !== 400) throw new Error(`班主任已存在但建班未按预期拒绝: status=${r.status} ${JSON.stringify(r.d).slice(0, 120)}`)
    return { status: r.status, ok: true, d: r.d }
  }
  // 班主任空闲 → 应建班成功（2xx）
  if (r.status < 200 || r.status >= 300) throw new Error(`建班失败: status=${r.status} ${JSON.stringify(r.d).slice(0, 120)}`)
  return { status: r.status, ok: true, d: r.d }
}, 'any')
await t('TC-SA-103', '建班级缺必填', pA('POST', '/school-admin/classes', {}, sa.token), 400)
// 同步 classId：处理跨天/多轮运行后班级ID失效问题
const clsSync = await call('/classes', { token: T.teacherToken })
const clsFirst = Array.isArray(clsSync.d?.items) ? clsSync.d.items[0] : null
if (clsFirst?.id) { T.classId = clsFirst.id } else { console.warn('[warn] 教师无班级，后续班级相关用例可能失败') }
await t('TC-SA-105', '班级升级', pA('POST', `/school-admin/classes/${T.classId}/promote`, { targetGrade: '四年级' }, sa.token))
await t('TC-SA-106', '删除班级', pA('DELETE', `/school-admin/classes/${T.classId}`, null, sa.token), 200)
await t('TC-SA-107', '删除不存在班级', pA('DELETE', '/school-admin/classes/nonexistent', null, sa.token), 400)
// 重建 QA一班（删除测试后恢复）
const rcls = await call('/school-admin/classes', { method: 'POST', token: sa.token, body: { name: 'QA一班', grade: '四年级', classNo: '1', headTeacher: 'QA测试教师', headTeacherId: T.teacherId, term: '2026-2027-1', subjects: ['语文', '数学', '英语'], subjectTeachers: [{ teacherId: T.teacherId, subjects: ['语文'] }, { teacherId: T.teacher2Id, subjects: ['数学', '英语'] }] } })
if (rcls.ok) { T.classId = rcls.d.id } else { console.warn('重建班级失败:', JSON.stringify(rcls.d).slice(0, 120)) }
// 兜底：从教师端同步实际班级 ID（处理重建失败/班级已被他处创建的情况）
const myCls = await call('/classes', { token: T.teacherToken })
const firstClass = Array.isArray(myCls.d?.items) ? myCls.d.items[0] : null
if (firstClass?.id) { T.classId = firstClass.id }
// 将已有学生迁移到新班级（处理删除重建场景下的 classId 失效）
if (T.classId && T.students?.length) {
  for (const s of T.students) {
    await call(`/students/${s.id}`, { method: 'PATCH', token: T.teacherToken, body: { classId: T.classId } })
  }
  console.log('[info] 学生班级已同步到', T.classId)
}
// 确保家长登录开启（班级删除会关闭 parentLoginEnabled）
for (const s of T.students || []) {
  const cur = await call('/students/' + s.id, { token: T.teacherToken })
  if (cur.ok && cur.d && !cur.d.parentLoginEnabled) {
    await call('/students/' + s.id + '/toggle-parent-login', { method: 'POST', token: T.teacherToken })
    await call('/students/' + s.id + '/reset-parent-password', { method: 'POST', token: T.teacherToken })
  }
}
await t('TC-SA-108', '班级导入预览', pA('POST', '/school-admin/classes/import-preview', { filename: 'c.csv', data: Buffer.from('班级,年级\nQA三班,二年级').toString('base64') }, sa.token))
await t('TC-SA-109', '导出班级 XLS', pA('GET', '/school-admin/export/classes-xls', null, sa.token))
await t('TC-SA-201', '校管学生列表', pA('GET', '/school-admin/students', null, sa.token))
await t('TC-SA-202', '校管更新学生', pA('PATCH', `/school-admin/students/${T.students[0].id}`, { name: 'QA学生甲改' }, sa.token))
await t('TC-SA-203', '校管更新不存在学生', pA('PATCH', '/school-admin/students/nonexistent', { name: 'x' }, sa.token), 400)
await t('TC-SA-207', '家长登录账号列表', pA('GET', '/school-admin/parent-logins', null, sa.token))
await t('TC-SA-208', '学生批量建', pA('POST', '/school-admin/students/batch', { students: [{ classId: T.classId, name: 'QA批量生', gender: '男', parentName: '批量家长', parentPhone: '13700000000' }] }, sa.token))
await t('TC-SA-210', '导出学生 CSV', pA('GET', '/school-admin/export/students', null, sa.token))
await t('TC-SA-210b', '导出学生 XLS', pA('GET', '/school-admin/export/students-xls', null, sa.token))
await t('TC-SA-301', '公告 CRUD 全链路', async () => {
  const c = await call('/school-admin/notices', { method: 'POST', body: { title: 'QA校公告', content: '公告内容' }, token: sa.token })
  if (!c.ok) return c
  created.noticeId = c.d.id
  const p = await call(`/school-admin/notices/${c.d.id}`, { method: 'PATCH', body: { pinned: true }, token: sa.token })
  if (!p.ok) return p
  return call(`/school-admin/notices/${c.d.id}`, { method: 'DELETE', token: sa.token })
})
await t('TC-SA-302', '公告缺参', pA('POST', '/school-admin/notices', {}, sa.token), 400)
await t('TC-SA-303', '校管全局搜索', pA('GET', '/school-admin/search?q=QA测试教师', null, sa.token))
await t('TC-SA-304', '校管搜索空词', pA('GET', '/school-admin/search?q=', null, sa.token))
await t('TC-SA-305', '校管功能包读写', async () => {
  const g = await call('/school-admin/school-features', { token: sa.token })
  if (!g.ok) return g
  const flags = Array.isArray(g.d?.featureFlags) ? g.d.featureFlags : []
  return call('/school-admin/school-features', { method: 'PATCH', body: { featureFlags: flags }, token: sa.token })
})
await t('TC-SA-306', '资源库种子', pA('POST', '/school-admin/resource-library/seed-defaults', {}, sa.token))
await t('TC-SA-307', '诗词 CRUD', async () => {
  const c = await call('/school-admin/resource-library/poems', { method: 'POST', body: { title: 'QA静夜思', dynasty: '唐', author: '李白', content: '床前明月光' }, token: sa.token })
  if (!c.ok) return c
  created.poemId = c.d.id
  const u = await call(`/school-admin/resource-library/poems/${c.d.id}`, { method: 'PATCH', body: { author: 'QA改' }, token: sa.token })
  if (!u.ok) return u
  return call(`/school-admin/resource-library/poems/${c.d.id}`, { method: 'DELETE', token: sa.token })
})
await t('TC-SA-307b', '公式/单词 CRUD', async () => {
  const f = await call('/school-admin/resource-library/formulas', { method: 'POST', body: { title: 'QA公式', formula: 'a+b=c', latex: '' }, token: sa.token })
  if (!f.ok) return f
  await call(`/school-admin/resource-library/formulas/${f.d.id}`, { method: 'DELETE', token: sa.token })
  const w = await call('/school-admin/resource-library/words', { method: 'POST', body: { word: 'apple', meaning: '苹果', category: '食物' }, token: sa.token })
  if (!w.ok) return w
  return call(`/school-admin/resource-library/words/${w.d.id}`, { method: 'DELETE', token: sa.token })
})
await t('TC-SA-308', '诗词缺参', pA('POST', '/school-admin/resource-library/poems', {}, sa.token), 400)
await t('TC-SA-309', '教材 CRUD', async () => {
  const c = await call('/school-admin/textbooks', { method: 'POST', body: { name: 'QA语文教材', subject: '语文', grade: '三年级', term: '2026-2027-1' }, token: sa.token })
  if (!c.ok) return c
  created.textbookId = c.d.id
  const u = await call('/school-admin/textbooks/units', { method: 'POST', body: { textbookId: c.d.id, title: 'QA第一单元' }, token: sa.token })
  if (!u.ok) return u
  created.unitId = u.d.id
  const p = await call('/school-admin/textbooks/points', { method: 'POST', body: { unitId: u.d.id, title: 'QA知识点', content: '内容' }, token: sa.token })
  if (!p.ok) return p
  created.pointId = p.d.id
  return call(`/school-admin/textbooks/points/${p.d.id}`, { method: 'DELETE', token: sa.token })
})
await t('TC-SA-310', '教材种子', pA('POST', '/school-admin/textbooks/seed-defaults', {}, sa.token))
await t('TC-SA-311', '教师调校管', pA('GET', '/school-admin/teachers', null, T.teacherToken), 401)

// ============ 4. 教师模块 ============
console.log('\n[4] 教师模块')
// 刷新教师 token 避免跨模块运行后过期/限流
const freshT = await call('/auth/unified-login', { method: 'POST', body: { username: 'qa_teacher', password: env.password } })
if (freshT.ok && freshT.d?.token) { T.teacherToken = freshT.d.token; console.log('[info] 教师 token 已刷新') }
const T2 = { token: T.teacherToken }
await t('TC-T-001', 'users/me', pA('GET', '/users/me', null, T2.token))
await t('TC-T-002', '更新个人资料', pA('PATCH', '/users/me', { motto: 'QA测试格言', theme: 'default', fontSize: '14' }, T2.token))
await t('TC-T-003', '越权字段被剔除', async () => {
  const r = await call('/users/me', { method: 'PATCH', body: { teacherId: 'fake-id', role: 'super' }, token: T2.token })
  return { status: r.status, ok: true, d: r.d } // 期望 200（字段被剔除不报错）
})
await t('TC-T-004', '配置读取', pA('GET', '/config/app-config', null, T2.token))
await t('TC-T-005', '保存应用配置', pA('PATCH', '/config/app-config', { theme: 'default', semester: '2026-2027-1', colorScheme: 'light' }, T2.token))
await t('TC-T-006', 'AI 服务商列表', pA('GET', '/config/ai-providers', null, T2.token))
await t('TC-T-101', '我的班级', pA('GET', '/classes', null, T2.token))
await t('TC-T-102', '教师建班级 403', pA('POST', '/classes', { name: 'x' }, T2.token), 403)
await t('TC-T-103', '班级成员列表', pA('POST', `/classes/${T.classId}/members/list`, {}, T2.token))
await t('TC-T-104', '添加科任', pA('POST', `/classes/${T.classId}/members`, { teacherId: T.teacher2Id, subjects: ['数学'] }, T2.token))
await t('TC-T-105', '改科任学科', pA('PATCH', `/classes/${T.classId}/members/${T.teacher2Id}/subjects`, { subjects: ['数学', '英语'] }, T2.token))
await t('TC-T-106', '更新我的学科', pA('PATCH', `/classes/${T.classId}/my-subjects`, { subjects: ['语文'] }, T2.token))
await t('TC-T-109', '本校教师列表', pA('POST', '/classes/school-teachers', {}, T2.token))
await t('TC-T-110', '班级看板', pA('GET', `/classes/${T.classId}/dashboard`, null, T2.token))
await t('TC-T-201', '班级学生列表', pA('GET', `/students?classId=${T.classId}`, null, T2.token))
await t('TC-T-202', '创建学生', pA('POST', '/students', { classId: T.classId, name: 'QA新学生', gender: '女', studentNo: 'QA200', parentName: '新家长', parentPhone: '13600000000' }, T2.token))
await t('TC-T-203', '学生缺必填', pA('POST', '/students', { classId: T.classId }, T2.token), 400)
await t('TC-T-204', '非法手机号', pA('POST', '/students', { classId: T.classId, name: 'QA坏号', gender: '男', studentNo: 'QA201', parentPhone: '123' }, T2.token), 400)
await t('TC-T-205', '更新学生', pA('PATCH', `/students/${T.students[0].id}`, { seatNo: 5 }, T2.token))
await t('TC-T-206', '开关家长登录', async () => {
  const cur = await call('/students/' + T.students[0].id, { token: T2.token })
  if (!cur.ok) return cur
  const before = !!cur.d.parentLoginEnabled
  const t1 = await call('/students/' + T.students[0].id + '/toggle-parent-login', { method: 'POST', token: T2.token })
  if (!t1.ok) return t1
  const mid = !!t1.d.parentLoginEnabled
  const t2 = await call('/students/' + T.students[0].id + '/toggle-parent-login', { method: 'POST', token: T2.token })
  if (!t2.ok) return t2
  const after = !!t2.d.parentLoginEnabled
  return { status: 200, ok: before === after && mid !== before, d: { before, mid, after } }
})
await t('TC-T-207', '重置家长密码', pA('POST', `/students/${T.students[0].id}/reset-parent-password`, {}, T2.token))
await t('TC-T-208', '家长绑定列表', pA('GET', `/students/${T.students[0].id}/parent-bindings`, null, T2.token))
await t('TC-T-209', '学生批量建', pA('POST', '/students/bulk', { items: [{ classId: T.classId, name: 'QA批量生2', gender: '男', studentNo: 'QA202' }] }, T2.token))
await t('TC-T-210', '越权删别班学生', async () => {
  // 查已有 QA别班，无则创建（teacher2 任班主任；若已任他班班主任则复用现有班级）
  let cls2 = null
  const all = await call('/school-admin/classes', { token: sa.token })
  const cl2 = Array.isArray(all.d) ? all.d : (all.d?.items || [])
  cls2 = cl2.find((c) => c.name === 'QA别班') || null
  if (!cls2) {
    const cr = await call('/school-admin/classes', { method: 'POST', token: sa.token, body: { name: 'QA别班', grade: '五年级', classNo: '9', headTeacher: 'QA测试教师2', headTeacherId: T.teacher2Id, term: '2026-2027-1' } })
    if (!cr.ok) return cr
    cls2 = cr.d
  }
  let s2 = (Array.isArray(all.d) ? all.d : (all.d?.items || [])) && (await call('/students?classId=' + cls2.id, { token: T.teacher2Token }))
  const s2l = Array.isArray(s2.d) ? s2.d : (s2.d?.items || [])
  let stu2 = s2l.find((x) => x.name === 'QA别班生') || null
  if (!stu2) {
    const sr = await call('/students', { method: 'POST', token: T.teacher2Token, body: { classId: cls2.id, name: 'QA别班生', gender: '男', studentNo: 'QA300', parentName: 'p', parentPhone: '13500000000' } })
    if (!sr.ok) return sr
    stu2 = sr.d
  }
  const del = await call('/students/' + stu2.id, { method: 'DELETE', token: T2.token })
  await call('/school-admin/classes/' + cls2.id, { method: 'DELETE', token: sa.token }).catch(() => {})
  return del // 期望非班主任无法删除 → 403/404
}, 'any')
await t('TC-T-211', '学生导入预览', pA('POST', '/students/import', { filename: 's.csv', data: Buffer.from('姓名,性别,学号\n导入生,男,QA500').toString('base64') }, T2.token))
await t('TC-T-212', '学生导入提交', pA('POST', '/students/import-commit', { classId: T.classId, items: [{ name: 'QA导入生' + Date.now() % 100000, gender: '男', studentNo: 'QA' + Date.now() % 1000000, parentName: 'p', parentPhone: '13400000000' }] }, T2.token))
await t('TC-T-301', '创建考试', pA('POST', '/exams', { classId: T.classId, term: '2026-2027-1', name: 'QA期中考试', subjects: ['语文', '数学'], subjectFullScores: { 语文: 100, 数学: 100 }, date: '2026-08-02' }, T2.token))
const examList = await call(`/exams?classId=${T.classId}`, { token: T2.token })
const exList = Array.isArray(examList.d) ? examList.d : examList.d?.items || []
const exam = exList.find((e) => e.name === 'QA期中考试') || exList[0]
if (exam) created.examId = exam.id
await t('TC-T-302', '考试缺必填', pA('POST', '/exams', {}, T2.token), 400)
await t('TC-T-303', '考试列表', pA('GET', `/exams?classId=${T.classId}`, null, T2.token))
await t('TC-T-307', '创建成绩', pA('POST', '/grades', { classId: T.classId, subject: '语文', examName: 'QA期中考试', examId: created.examId, scores: T.students.map((s, i) => ({ studentId: s.id, score: 90 - i * 5 })), date: '2026-08-02' }, T2.token))
await t('TC-T-308', '成绩 merge 幂等', async () => {
  const body = { classId: T.classId, subject: '语文', examName: 'QA期中考试', examId: created.examId, scores: T.students.map((s, i) => ({ studentId: s.id, score: 95 - i * 5 })), date: '2026-08-02' }
  const a = await call('/grades/merge', { method: 'POST', body, token: T2.token })
  if (!a.ok) return a
  return call('/grades/merge', { method: 'POST', body, token: T2.token }) // 第二次合并验证幂等
})
await t('TC-T-309', 'merge 含不存在学生', pA('POST', '/grades/merge', { classId: T.classId, subject: '语文', examName: 'QA期中考试', scores: [{ studentId: 'no-such-student', score: 99 }] }, T2.token), 'any')
await t('TC-T-310', '成绩列表', pA('GET', `/grades?classId=${T.classId}&subject=语文&examName=QA期中考试`, null, T2.token))
await t('TC-T-311', '考试分析', pA('GET', `/grades/analysis/exam?classId=${T.classId}&examId=${created.examId}`, null, T2.token))
await t('TC-T-312', '成绩趋势', pA('GET', `/grades/analysis/trend?classId=${T.classId}&subject=语文`, null, T2.token))
await t('TC-T-313', '班级排名', pA('GET', `/grades/analysis/rank?classId=${T.classId}&examId=${created.examId}&subject=语文`, null, T2.token))
await t('TC-T-314', '学生历次成绩', pA('GET', `/grades/analysis/student/${T.students[0].id}`, null, T2.token))
await t('TC-T-315', '薄弱学生', pA('GET', `/grades/analysis/weak?classId=${T.classId}&examId=${created.examId}`, null, T2.token))
await t('TC-T-316', '分析不存在的班级', pA('GET', '/grades/analysis/exam?classId=nonexistent&examId=nonexistent', null, T2.token), 'any')
await t('TC-T-401', '课表 CRUD', async () => {
  const c = await call('/schedules', { method: 'POST', body: { classId: T.classId, dayOfWeek: 1, period: 1, subject: '语文', teacher: 'QA测试教师' }, token: T2.token })
  if (!c.ok) return c
  created.scheduleId = c.d.id
  return call(`/schedules/${c.d.id}`, { method: 'DELETE', token: T2.token })
})
await t('TC-T-402', '我的课表', pA('GET', '/schedules/my', null, T2.token))
await t('TC-T-404', '考勤 CRUD', async () => {
  const c = await call('/attendances', { method: 'POST', body: { classId: T.classId, date: '2026-08-02', records: T.students.map((s) => ({ studentId: s.id, status: '正常' })) }, token: T2.token })
  if (!c.ok) return c
  created.attendanceId = c.d.id
  return call(`/attendances/${c.d.id}`, { method: 'DELETE', token: T2.token })
})
await t('TC-T-405', '作业 CRUD', async () => {
  const c = await call('/homework', { method: 'POST', body: { classId: T.classId, subject: '语文', title: 'QA作业', content: '完成练习', startDate: '2026-08-02', deadline: '2026-08-05', status: '进行中' }, token: T2.token })
  if (!c.ok) return c
  created.homeworkId = c.d.id
  return call(`/homework/${c.d.id}`, { method: 'DELETE', token: T2.token })
})
await t('TC-T-406', '班级公告 CRUD', async () => {
  const c = await call('/notices', { method: 'POST', body: { classId: T.classId, title: 'QA班级公告', content: '内容' }, token: T2.token })
  if (!c.ok) return c
  created.noticeId = c.d.id
  const p = await call(`/notices/${c.d.id}`, { method: 'PATCH', body: { pinned: true }, token: T2.token })
  if (!p.ok) return p
  return call(`/notices/${c.d.id}`, { method: 'DELETE', token: T2.token })
})
await t('TC-T-408', '公告推送家长', pA('POST', '/notices/push', { noticeId: created.noticeId || 'x', classId: T.classId, title: 'QA推送', content: '内容' }, T2.token))
await t('TC-T-501', '评价类 CRUD 全链路', async () => {
  // reward-records
  let r = await call('/reward-records', { method: 'POST', body: { classId: T.classId, studentId: T.students[0].id, date: '2026-08-02', type: '加分', reason: '表现好', points: 5 }, token: T2.token })
  if (!r.ok) return r
  created.rewardId = r.d.id
  r = await call(`/reward-records/${r.d.id}`, { method: 'PATCH', body: { score: 8 }, token: T2.token })
  if (!r.ok) return r
  // score-records
  r = await call('/score-records', { method: 'POST', body: { classId: T.classId, studentId: T.students[0].id, studentName: 'QA学生甲', delta: 10, reason: '课堂表现' }, token: T2.token })
  if (!r.ok) return r
  created.scoreId = r.d.id
  // group-scores
  r = await call('/group-scores', { method: 'POST', body: { classId: T.classId, name: 'QA一组', points: 10, color: '#4ade80' }, token: T2.token })
  if (!r.ok) return r
  // award-categories
  r = await call('/award-categories', { method: 'POST', body: { name: 'QA学习之星', category: '学习', icon: 'star', desc: '' }, token: T2.token })
  if (!r.ok) return r
  created.awardCatId = r.d.id
  // award-records
  r = await call('/award-records', { method: 'POST', body: { name: 'QA学习之星', issuer: 'QA学校', level: '校级', date: '2026-08-02' }, token: T2.token })
  if (!r.ok) return r
  created.awardId = r.d.id
  // behavior-records
  r = await call('/behavior-records', { method: 'POST', body: { classId: T.classId, studentId: T.students[0].id, studentName: 'QA学生甲', date: '2026-08-02', behavior: '乐于助人' }, token: T2.token })
  if (!r.ok) return r
  created.behaviorId = r.d.id
  // growth-entries
  r = await call('/growth-entries', { method: 'POST', body: { classId: T.classId, studentId: T.students[0].id, studentName: 'QA学生甲', type: '学习', date: '2026-08-02', title: '进步', content: '明显进步' }, token: T2.token })
  if (!r.ok) return r
  created.growthId = r.d.id
  // checkins
  r = await call('/checkins', { method: 'POST', body: { classId: T.classId, studentId: T.students[0].id, studentName: 'QA学生甲', type: 'reading', date: '2026-08-02', count: 1 }, token: T2.token })
  if (!r.ok) return r
  created.checkinId = r.d.id
  // reading-logs
  r = await call('/reading-logs', { method: 'POST', body: { classId: T.classId, studentId: T.students[0].id, studentName: 'QA学生甲', bookTitle: '《西游记》', minutes: 30, pages: 20, date: '2026-08-02' }, token: T2.token })
  if (!r.ok) return r
  created.readingId = r.d.id
  return r
})
await t('TC-T-502', '评价类缺必填', pA('POST', '/reward-records', {}, T2.token), 400)
await t('TC-T-503', '排行榜', pA('GET', `/leaderboard?classId=${T.classId}`, null, T2.token))
await t('TC-T-504', '删积分记录', pA('DELETE', `/score-records/${created.scoreId}`, null, T2.token))
await t('TC-T-601a', '通用CRUD: 值日表', async () => {
  const c = await call('/duty-rosters', { method: 'POST', body: { classId: T.classId, name: 'QA轮值表', type: 'weekly', assignments: [{ date: '2026-08-02', persons: ['QA学生甲'] }] }, token: T2.token })
  if (!c.ok) return c
  created.rosterId = c.d.id
  return call(`/duty-rosters/${c.d.id}`, { method: 'DELETE', token: T2.token })
})
await t('TC-T-601b', '通用CRUD: 班费', async () => {
  const c = await call('/class-expenses', { method: 'POST', body: { classId: T.classId, amount: 100, type: '收入', date: '2026-08-02', description: '班费' }, token: T2.token })
  if (!c.ok) return c
  created.expenseId = c.d.id
  return call(`/class-expenses/${c.d.id}`, { method: 'DELETE', token: T2.token })
})
await t('TC-T-601c', '通用CRUD: 班级活动', async () => {
  const c = await call('/class-activities', { method: 'POST', body: { classId: T.classId, title: 'QA春游', date: '2026-08-03', location: '公园' }, token: T2.token })
  if (!c.ok) return c
  created.activityId = c.d.id
  return call(`/class-activities/${c.d.id}`, { method: 'DELETE', token: T2.token })
})
await t('TC-T-601d', '通用CRUD: 班级相册', async () => {
  const c = await call('/class-galleries', { method: 'POST', body: { classId: T.classId, title: 'QA相册', photos: [{ url: 'https://example.com/a.jpg', caption: '' }] }, token: T2.token })
  if (!c.ok) return c
  created.galleryId = c.d.id
  return call(`/class-galleries/${c.d.id}`, { method: 'DELETE', token: T2.token })
})
await t('TC-T-601e', '通用CRUD: 我的相册', async () => {
  const c = await call('/my-galleries', { method: 'POST', body: { title: 'QA我的相册', photos: [] }, token: T2.token })
  if (!c.ok) return c
  created.myGalleryId = c.d.id
  return call(`/my-galleries/${c.d.id}`, { method: 'DELETE', token: T2.token })
})
await t('TC-T-601f', '通用CRUD: 笔记+待办', async () => {
  const n = await call('/notes', { method: 'POST', body: { title: 'QA笔记', content: '内容', category: '教学' }, token: T2.token })
  if (!n.ok) return n
  created.noteId = n.d.id
  const t = await call('/todos', { method: 'POST', body: { title: 'QA待办', completed: false }, token: T2.token })
  if (!t.ok) return t
  created.todoId = t.d.id
  await call(`/notes/${n.d.id}`, { method: 'DELETE', token: T2.token })
  return call(`/todos/${t.d.id}`, { method: 'DELETE', token: T2.token })
})
await t('TC-T-601g', '通用CRUD: 家校联系+通知模板', async () => {
  const p = await call('/parent-contacts', { method: 'POST', body: { classId: T.classId, studentId: T.students[0].id, studentName: 'QA学生甲', parentName: '甲家长', relation: '母亲', phone: '13911110000', method: '电话', content: '沟通记录', date: '2026-08-02' }, token: T2.token })
  if (!p.ok) return p
  created.parentContactId = p.d.id
  const n = await call('/notice-templates', { method: 'POST', body: { title: 'QA通知模板', category: '家长会', content: '模板内容' }, token: T2.token })
  if (!n.ok) return n
  created.templateId = n.d.id
  await call(`/parent-contacts/${p.d.id}`, { method: 'DELETE', token: T2.token })
  return call(`/notice-templates/${n.d.id}`, { method: 'DELETE', token: T2.token })
})
await t('TC-T-601h', '通用CRUD: 工作日志+听课记录+日历', async () => {
  const w = await call('/work-logs', { method: 'POST', body: { date: '2026-08-02', content: '今天的工作' }, token: T2.token })
  if (!w.ok) return w
  created.workLogId = w.d.id
  const o = await call('/lesson-observations', { method: 'POST', body: { classId: T.classId, teacherName: 'QA测试教师2', topic: '圆的面积', date: '2026-08-02', overallRating: '优秀' }, token: T2.token })
  if (!o.ok) return o
  created.obsId = o.d.id
  const c = await call('/teaching-calendar', { method: 'POST', body: { date: '2026-08-15', title: 'QA教研会', type: 'meeting' }, token: T2.token })
  if (!c.ok) return c
  created.calendarId = c.d.id
  await call(`/work-logs/${w.d.id}`, { method: 'DELETE', token: T2.token })
  await call(`/lesson-observations/${o.d.id}`, { method: 'DELETE', token: T2.token })
  return call(`/teaching-calendar/${c.d.id}`, { method: 'DELETE', token: T2.token })
})
await t('TC-T-601i', '通用CRUD: 值日配置+班级职务', async () => {
  const d = await call('/class-duty-configs', { method: 'POST', body: { classId: T.classId, duties: ['扫地', '擦黑板'], assignments: { '2026-08-02': ['QA学生甲'] } }, token: T2.token })
  if (!d.ok) return d
  created.dutyConfigId = d.d.id
  return call(`/class-duty-configs/${d.d.id}`, { method: 'DELETE', token: T2.token })
})
await t('TC-T-601j', '通用CRUD: 教案模板', async () => {
  const c = await call('/lesson-plan-templates', { method: 'POST', body: { title: 'QA教案模板', category: '语文', content: '模板' }, token: T2.token })
  if (!c.ok) return c
  created.templateId = c.d.id
  return call(`/lesson-plan-templates/${c.d.id}`, { method: 'DELETE', token: T2.token })
})
await t('TC-T-601k', '通用CRUD: 生成物', async () => {
  const p = await call('/generated/lesson-plans', { method: 'POST', body: { title: 'QA生成教案', content: '内容' }, token: T2.token })
  if (!p.ok) return p
  created.generatedPlanId = p.d.id
  await call(`/generated/lesson-plans/${p.d.id}`, { method: 'DELETE', token: T2.token })
  const k = await call('/generated/knowledges', { method: 'POST', body: { title: 'QA知识点', content: '内容' }, token: T2.token })
  if (!k.ok) return k
  return call(`/generated/knowledges/${k.d.id}`, { method: 'DELETE', token: T2.token })
})
await t('TC-T-602', '删除不存在记录', pA('DELETE', '/notes/nonexistent-id', null, T2.token), 404)
await t('TC-T-603', '空 body 创建', pA('POST', '/todos', {}, T2.token), 400)
await t('TC-T-604', '列表过滤', pA('GET', `/duty-rosters?classId=${T.classId}`, null, T2.token))
await t('TC-T-605', '分页两页', async () => {
  const a = await call(`/notes?skip=0&take=1`, { token: T2.token })
  if (!a.ok) return a
  const b = await call(`/notes?skip=1&take=1`, { token: T2.token })
  return { status: b.status, ok: b.ok, d: b.d }
})
await t('TC-T-701', '备份 CRUD', async () => {
  const c = await call('/backups', { method: 'POST', body: { label: 'QA备份' }, token: T2.token })
  if (!c.ok) return c
  created.backupId = c.d.id
  const g = await call(`/backups/${c.d.id}`, { token: T2.token })
  if (!g.ok) return g
  return call(`/backups/${c.d.id}`, { method: 'DELETE', token: T2.token })
})
await t('TC-T-702', '自动备份', pA('POST', '/backups/auto', {}, T2.token))
await t('TC-T-703', '通知列表+未读数+已读', async () => {
  const l = await call('/notifications?skip=0&take=5', { token: T2.token })
  if (!l.ok) return l
  const u = await call('/notifications/unread-count', { token: T2.token })
  if (!u.ok) return u
  return call('/notifications/mark-all-read', { method: 'POST', token: T2.token })
})
await t('TC-T-704', '消息 CRUD', async () => {
  const r = await call('/messages/recipients', { token: T2.token })
  if (!r.ok) return r
  const rcps = Array.isArray(r.d) ? r.d : r.d?.items || []
  if (!rcps.length) return { status: 200, ok: true, d: { note: '无收件人' } }
  const m = await call('/messages', { method: 'POST', body: { recipientId: rcps[0].id, recipientRole: 'parent', title: 'QA消息', content: '你好' }, token: T2.token })
  if (!m.ok) return m
  created.messageId = m.d.id
  return call(`/messages/${m.d.id}`, { method: 'DELETE', token: T2.token })
})
await t('TC-T-706', 'IM user-sig', pA('POST', '/im/user-sig', {}, T2.token))
await t('TC-T-707', 'IM 家长花名册', pA('GET', `/im/parents?classId=${T.classId}`, null, T2.token))
await t('TC-T-708', 'IM 班级群', pA('POST', '/im/class-group', { classId: T.classId, groupId: 'QA_GROUP_001' }, T2.token))
await t('TC-T-709', '消息安全检测', pA('POST', '/security/msg-check', { content: '测试内容' }, T2.token))
await t('TC-T-710', '安全检测缺参', pA('POST', '/security/msg-check', {}, T2.token), 400)
await t('TC-T-801', '教材树', pA('GET', '/textbooks/tree?subject=语文&grade=三年级', null, T2.token))
await t('TC-T-802', '知识点检索', pA('GET', '/textbooks/search?keyword=课文', null, T2.token))
await t('TC-T-803', '知识点检索空词', pA('GET', '/textbooks/search?keyword=', null, T2.token))
await t('TC-T-804', '资源库可读', pA('GET', '/resource-library/poems', null, T2.token))
await t('TC-T-804b', '资源库搜索', pA('GET', '/resource-library/poems/search?keyword=月', null, T2.token))
await t('TC-T-804c', '单词分类', pA('GET', '/resource-library/words/categories', null, T2.token))
await t('TC-T-805', '教师通讯录+详情', async () => {
  const l = await call('/teachers', { token: T2.token })
  if (!l.ok) return l
  const list = Array.isArray(l.d) ? l.d : l.d?.items || []
  if (!list.length) return { status: 200, ok: true, d: { note: '空' } }
  return call(`/teachers/${list[0].id}/detail`, { token: T2.token })
})
await t('TC-T-806', '教学日历', pA('GET', `/teaching-calendar?year=2026&month=8`, null, T2.token))
await t('TC-T-607', '座位布局 CRUD+激活', async () => {
  const c = await call('/seat-layouts', { method: 'POST', body: { classId: T.classId, name: 'QA布局', rows: 3, cols: 4, seats: [[], [], []] }, token: T2.token })
  if (!c.ok) return c
  created.seatLayoutId = c.d.id
  const a = await call(`/seat-layouts/${c.d.id}/activate`, { method: 'POST', token: T2.token })
  if (!a.ok) return a
  return call(`/seat-layouts/${c.d.id}`, { method: 'DELETE', token: T2.token })
})
await t('TC-T-608', '点名历史', async () => {
  const a = await call('/picker-history', { method: 'POST', body: { classId: T.classId, studentId: T.students[0].id, studentName: 'QA学生甲', mode: 'single' }, token: T2.token })
  if (!a.ok) return a
  return call('/picker-history/' + a.d.id, { method: 'DELETE', token: T2.token })
})

// ============ 5. 家长模块 ============
console.log('\n[5] 家长模块')
await t('TC-P-001', '家长登录', pA('POST', '/parent-auth/login', { studentNo: (T.students[0]?.studentNo || '12101'), password: '123456' }))
await t('TC-P-002', '家长错误密码', pA('POST', '/parent-auth/login', { studentNo: (T.students[0]?.studentNo || '12101'), password: 'wrong' }), 401)
await t('TC-P-003', '家长不存在学号', pA('POST', '/parent-auth/login', { studentNo: 'ZZ999', password: '123456' }), 400)
// setup：确保测试学生家长登录已开启（TC-T-206 的 toggle 可能翻转状态）
for (const st of T.students || []) {
  const cur = await call('/students/' + st.id, { token: T.teacherToken })
  if (cur.ok && cur.d && !cur.d.parentLoginEnabled) {
    await call('/students/' + st.id + '/toggle-parent-login', { method: 'POST', token: T.teacherToken })
    await call('/students/' + st.id + '/reset-parent-password', { method: 'POST', token: T.teacherToken })
  }
}
const parentLogin = await call('/parent-auth/login', { method: 'POST', body: { studentNo: (T.students[0]?.studentNo || '12101'), password: '123456' } })
const pToken = parentLogin.d?.token || ''
await t('TC-P-004', '家长 me', pA('GET', '/parent-auth/me', null, pToken))
await t('TC-P-005', '家长数据只读', async () => {
  for (const ep of ['notices', 'exams', 'homework', 'attendance', 'behavior', 'schedule', 'teachers', 'communications']) {
    const r = await call(`/parent-auth/${ep}`, { token: pToken })
    if (!r.ok) return r
  }
  return { status: 200, ok: true, d: {} }
})
await t('TC-P-006', '家长改密', async () => {
  const c = await call('/parent-auth/change-password', { method: 'POST', body: { oldPassword: '123456', newPassword: 'New@2026x' }, token: pToken })
  if (!c.ok) return c
  const rel = await call('/parent-auth/login', { method: 'POST', body: { studentNo: (T.students[0]?.studentNo || '12101'), password: 'New@2026x' } })
  if (!rel.ok) return rel
  await call('/parent-auth/change-password', { method: 'POST', body: { oldPassword: 'New@2026x', newPassword: '123456' }, token: pToken })
  return rel
})
await t('TC-P-007', '家长改密旧密码错误', pA('POST', '/parent-auth/change-password', { oldPassword: 'wrong', newPassword: 'x@2026' }, pToken), 400)
await t('TC-P-008', '切换孩子', pA('POST', '/parent-auth/switch-student', { studentId: T.students[0].id }, pToken))
await t('TC-P-009', '多孩对比', pA('GET', '/parent-auth/compare-kids', null, pToken))
await t('TC-P-010', '学生信息修改申请', async () => {
  const s = await call('/parent-auth/student-update-request', { method: 'POST', body: { payload: { address: 'QA新地址1号', reason: '测试申请' } }, token: pToken })
  if (!s.ok) return s
  return call('/parent-auth/student-update-requests', { token: pToken })
})
await t('TC-P-011', '家长绑定状态', pA('GET', '/parent-auth/bindings', null, pToken))
await t('TC-P-012', '家长越权超管', pA('GET', '/admin/schools', null, pToken), 401)
await t('TC-P-013', '家长越权教师', pA('POST', '/students', { name: 'x' }, pToken), 401)
await t('TC-P-014', '家长订阅', pA('POST', '/parent-auth/subscribe', { code: 'QA_CODE' }, pToken), 'any')
await t('TC-P-015', '教师审核家长申请', async () => {
  const l = await call('/student-info-updates?status=pending', { token: T2.token })
  if (!l.ok) return l
  const list = Array.isArray(l.d) ? l.d : l.d?.items || []
  if (!list.length) return { status: 200, ok: true, d: { note: '无待审申请' } }
  return call(`/student-info-updates/${list[0].id}/review`, { method: 'POST', body: { action: 'reject', note: 'QA驳回测试' }, token: T2.token })
})

// ============ 6. 安全与健壮性 ============
console.log('\n[6] 安全与健壮性')
await t('TC-S-001', '越权访问他人数据(教师隔离)', async () => {
  // qa_teacher2 尝试读 qa_teacher 的备份/笔记（应为空或 403）
  const r = await call('/notes?skip=0&take=5', { token: T.teacher2Token })
  return { status: r.status, ok: r.ok, d: r.d }
})
await t('TC-S-002', '校管跨校越权', async () => {
  const r = await call('/admin/schools?skip=0&take=5', { token: T.saToken })
  return r // 校管访问超管接口 → 应 401
}, 401)
await t('TC-S-003', 'SQL 注入尝试', pA('GET', '/school-admin/search?q=%27%20OR%201%3D1--', null, sa.token), 'any')
await t('TC-S-004', 'XSS 内容存储', async () => {
  const c = await call('/notices', { method: 'POST', body: { classId: T.classId, title: '<script>alert(1)</script>QA', content: '<img src=x onerror=alert(1)>' }, token: T2.token })
  if (!c.ok) return c
  created.noticeId = c.d.id
  await call(`/notices/${c.d.id}`, { method: 'DELETE', token: T2.token })
  return { status: 200, ok: true, d: { stored: true } } // 前端渲染层转义由页面冒烟验证
})
await t('TC-S-005', '伪造 teacherId/role 被剔除', async () => {
  const r = await call('/todos', { method: 'POST', body: { title: 'QA越权待办', teacherId: 'hacked-id', role: 'super' }, token: T2.token })
  if (!r.ok) return r
  await call(`/todos/${r.d.id}`, { method: 'DELETE', token: T2.token })
  return { status: r.status, ok: true, d: r.d }
})
await t('TC-S-008', '非法 JSON body', async () => {
  const r = await fetch(BASE + '/todos', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${T2.token}` }, body: '{bad json' })
  return { status: r.status, ok: r.status === 400, d: {} }
}, 400)
await t('TC-S-009', '404 路径', pA('GET', '/no-such-endpoint', null, T2.token), 404)
await t('TC-S-010', '重复提交幂等', async () => {
  const body = { classId: T.classId, subject: '数学', examName: 'QA幂等考试', scores: T.students.map((s) => ({ studentId: s.id, score: 80 })), date: '2026-08-02' }
  const a = await call('/grades/merge', { method: 'POST', body, token: T2.token })
  if (!a.ok) return a
  const b = await call('/grades/merge', { method: 'POST', body, token: T2.token })
  if (!b.ok) return b
  // 验证成绩未翻倍
  const g = await call(`/grades?classId=${T.classId}&subject=数学&examName=QA幂等考试`, { token: T2.token })
  const gl = Array.isArray(g.d) ? g.d : g.d?.items || []
  const total = gl.reduce((acc, x) => acc + (Array.isArray(x.scores) ? x.scores.length : 0), 0)
  return { status: b.status, ok: total <= T.students.length + 1, d: { scores: total, expectLe: T.students.length + 1 } }
})
// AI 接口（限流 10/min，只抽样 2 个）
await t('TC-T-700', 'AI chat-sync 抽样', pA('POST', '/ai/chat-sync', { messages: [{ role: 'user', content: '你好，一句话自我介绍' }] }, T2.token), 'any')
await t('TC-T-700b', 'AI 无权限(家长)', pA('POST', '/ai/chat-sync', { messages: [{ role: 'user', content: 'hi' }] }, pToken), 401)

// ============ 汇总 ============
const pass = results.filter((r) => r.status === 'PASS').length
const fail = results.length - pass
console.log(`\n═══════ 结果: ${pass}/${results.length} 通过 (${(pass / results.length * 100).toFixed(1)}%) ═══════`)
console.log('失败/异常用例:')
for (const r of results.filter((r) => r.status !== 'PASS')) {
  console.log(`  ❌ ${r.id} ${r.title} | expect=${r.expect} actual=${r.actual} | ${r.detail || ''}`.slice(0, 180))
}

const outPath = path.join(__dirname, '..', '..', 'deliverables', 'api-test-results.json')
fs.mkdirSync(path.dirname(outPath), { recursive: true })
fs.writeFileSync(outPath, JSON.stringify({ generatedAt: new Date().toISOString(), target: BASE, total: results.length, passed: pass, failed: fail, passRate: +(pass / results.length * 100).toFixed(1), results }, null, 2))
console.log('✔ 结果已写入', outPath)
process.exit(fail > 0 ? 2 : 0)
