import { writeFileSync } from 'node:fs'
const BASE = 'https://tec-work-283329-8-1440166408.sh.run.tcloudbase.com/api'

async function api(method, path, body = null, token = '') {
  const headers = { 'Content-Type': 'application/json' }
  if (token) headers['Authorization'] = `Bearer ${token}`
  const resp = await fetch(BASE + path, { method, headers, body: body === null ? undefined : JSON.stringify(body) })
  const text = await resp.text()
  let data
  try { data = JSON.parse(text) } catch { data = text }
  return { status: resp.status, data }
}

const out = { base: BASE, obtainedAt: new Date().toISOString(), roles: {}, notes: [] }

// 1) 超管
let r = await api('POST', '/admin/login', { username: 'admin', password: 'admin' })
console.log('admin/login ->', r.status, r.data?.role)
out.roles.super = { username: 'admin', token: r.data?.token || r.data?.data?.token, role: r.data?.role }

// 2) 校管
r = await api('POST', '/auth/unified-login', { username: 'sa1', password: '123456' })
console.log('sa1 login ->', r.status, r.data?.role)
out.roles.school_admin = { username: 'sa1', token: r.data?.token, role: r.data?.role }

// 3) 教师 1/2/3
for (const u of ['teacher1', 'teacher2', 'teacher3']) {
  r = await api('POST', '/auth/unified-login', { username: u, password: '123456' })
  console.log(`${u} login ->`, r.status, r.data?.role)
  out.roles['teacher_' + u] = { username: u, token: r.data?.token, role: r.data?.role }
}

// 4) 家长：取 teacher1 班级里第一个学生的学号，用默认密码 123456 登录
const t1 = out.roles.teacher_teacher1.token
r = await api('GET', '/classes', null, t1)
const cls = Array.isArray(r.data) ? r.data : (r.data?.items || [])
const classId = cls[0]?.id
out.notes.push('teacher1 first classId=' + (classId || 'NONE'))
let studentNo = null
if (classId) {
  r = await api('GET', `/students?classId=${classId}&take=5`, null, t1)
  const stus = Array.isArray(r.data) ? r.data : (r.data?.items || [])
  if (stus[0]) { studentNo = stus[0].studentNo; out.notes.push('sample studentNo=' + studentNo + ' name=' + stus[0].name) }
}
if (studentNo) {
  r = await api('POST', '/parent-auth/login', { studentNo, password: '123456' })
  console.log('parent login ->', r.status, 'hasToken=' + !!r.data?.token)
  out.roles.parent = { studentNo, token: r.data?.token, role: 'parent', raw: { id: r.data?.parent?.id, studentId: r.data?.parent?.studentId } }
  if (r.status !== 201 && r.status !== 200) out.notes.push('parent login failed status=' + r.status + ' ' + JSON.stringify(r.data).slice(0, 120))
} else {
  out.notes.push('NO studentNo available for parent login')
}

// 校验超管 token 可用性
const saTok = out.roles.super.token
r = await api('GET', '/admin/schools?take=1', null, saTok)
out.notes.push('super /admin/schools -> ' + r.status)

writeFileSync(new URL('./mini-test-tokens.json', import.meta.url), JSON.stringify(out, null, 2))
console.log('\n=== TOKENS SAVED ===')
for (const [k, v] of Object.entries(out.roles)) console.log(`  ${k}: tokenLen=${v.token ? v.token.length : 0} role=${v.role}`)
