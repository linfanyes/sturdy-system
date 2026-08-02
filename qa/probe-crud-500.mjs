// 复现 CRUD 500：查看各资源创建失败原因
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

const login = await call('/auth/unified-login', { method: 'POST', body: { username: 'qa_t_head', password: 'Test@2026' } })
const T = login.d.token

const cases = [
  ['/reading-logs', { studentId: 'x', studentName: 'QA学生', book: 'QA图书', date: '2026-08-02' }],
  ['/class-expenses', { title: 'QA班费', amount: 100, date: '2026-08-02' }],
  ['/class-activities', { title: 'QA活动', date: '2026-08-02', location: '教室' }],
  ['/growth-entries', { title: 'QA成长记录', date: '2026-08-02', content: '表现良好' }],
  ['/behavior-records', { studentId: 'x', studentName: 'QA学生', type: 'good', date: '2026-08-02' }],
  ['/reward-records', { studentId: 'x', studentName: 'QA学生', reason: '表现好', date: '2026-08-02' }],
  ['/score-records', { studentId: 'x', studentName: 'QA学生', score: 90, date: '2026-08-02' }],
  ['/parent-contacts', { studentId: 'x', studentName: 'QA学生', parentName: 'QA家长', phone: '13911112222', date: '2026-08-02' }],
  ['/seat-layouts', { title: 'QA座位表', classId: '7a14cf1e-e3a2-455b-9d12-2b59a643fff8' }],
]
for (const [p, body] of cases) {
  const r = await call(p, { method: 'POST', token: T, body })
  console.log(p, '=>', r.status, JSON.stringify(r.d).slice(0, 160))
}
