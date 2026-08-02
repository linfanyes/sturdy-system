// 复现学生创建 500：探测 QA 服务器
const BASE = 'http://localhost:3100/api'
const j = { 'Content-Type': 'application/json' }
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

const env = JSON.parse(await (await import('node:fs')).promises.readFile('qa/qa-env.json', 'utf8'))
console.log('classIds:', env.created.classIds)
console.log('class1Id:', env.created.class1Id)

// 班主任 token
const head = await call('/auth/unified-login', { method: 'POST', body: { username: 'qa_t_head', password: env.password } })
const HEAD = head.d.token

// 对 class 3（四年级一班）建学生
const r = await call('/students', { method: 'POST', token: HEAD, body: { classId: env.created.classIds[2], name: '测试学生X', gender: '男', studentNo: '99999', parentName: '测试家长', parentPhone: '13900001111' } })
console.log('create student in class3 with HEAD:', r.status, JSON.stringify(r.d).slice(0, 300))

// 对 class 1 建学生
const r2 = await call('/students', { method: 'POST', token: HEAD, body: { classId: env.created.classIds[0], name: '测试学生Y', gender: '女', studentNo: '99998', parentName: '测试家长2', parentPhone: '13900002222' } })
console.log('create student in class1 with HEAD:', r2.status, JSON.stringify(r2.d).slice(0, 200))

// 教师属于哪些班级（members list）
const members = await call('/classes/' + env.created.classIds[2] + '/members/list', { method: 'POST', token: HEAD, body: {} })
console.log('members of class3:', members.status, JSON.stringify(members.d).slice(0, 200))
const members1 = await call('/classes/' + env.created.classIds[0] + '/members/list', { method: 'POST', token: HEAD, body: {} })
console.log('members of class1:', members1.status, JSON.stringify(members1.d).slice(0, 200))
