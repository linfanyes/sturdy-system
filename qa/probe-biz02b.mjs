// 完整重现 BIZ-02 序列：登录 sub3 → 调 members/list
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
const cls3 = env.created.classIds[2]

const login = await call('/auth/unified-login', { method: 'POST', body: { username: 'qa_t_sub3', password: 'Test@2026' } })
console.log('login sub3:', login.status, login.d?.role)
const token = login.d?.token

const m = await call(`/classes/${cls3}/members/list`, { method: 'POST', token, body: {} })
console.log('sub3 -> class3 members:', m.status, JSON.stringify(m.d).slice(0, 120))

// 还测：sub3 访问 class1（他是 class1 科学科任，应该 200）
const m1 = await call(`/classes/${env.created.classIds[0]}/members/list`, { method: 'POST', token, body: {} })
console.log('sub3 -> class1 members:', m1.status, JSON.stringify(m1.d).slice(0, 120))
