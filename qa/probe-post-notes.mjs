// 复现 CRUD 401：登录后 POST /notes
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
console.log('login:', login.status, login.d?.role)
const token = login.d?.token

// GET /notes
const g = await call('/notes', { token })
console.log('GET /notes:', g.status)

// POST /notes
const p = await call('/notes', { method: 'POST', token, body: { title: 'QA探测笔记', content: 'x', category: '其他' } })
console.log('POST /notes:', p.status, JSON.stringify(p.d).slice(0, 100))

// GET /todos
const g2 = await call('/todos', { token })
console.log('GET /todos:', g2.status)

// 检查 /notes POST 的响应头看限流
console.log('--- 完整 POST 响应 ---')
const r = await fetch(BASE + '/notes', {
  method: 'POST',
  headers: { ...j, Authorization: `Bearer ${token}` },
  body: JSON.stringify({ title: 'QA探测笔记2', content: 'x', category: '其他' }),
})
console.log('status:', r.status)
console.log('headers:', JSON.stringify(Object.fromEntries(r.headers.entries())))
console.log('body:', (await r.text()).slice(0, 200))
