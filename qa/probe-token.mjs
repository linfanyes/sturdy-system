// 探测 token 有效性
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

// 1. 新登录 qa_t_head
const login = await call('/auth/unified-login', { method: 'POST', body: { username: 'qa_t_head', password: 'Test@2026' } })
console.log('login:', login.status, login.d?.role, login.d?.user?.username)
const fresh = login.d?.token

// 2. 用新 token 调 /notes
const n1 = await call('/notes', { token: fresh })
console.log('fresh token /notes:', n1.status)

// 3. 用 seed token 调 /notes
const env = JSON.parse(await (await import('node:fs')).promises.readFile('qa/qa-env.json', 'utf8'))
const n2 = await call('/notes', { token: env.created.headToken })
console.log('seed headToken /notes:', n2.status)

// 4. 解 JWT 看 secret 是否一致（无法直接验，但看 payload）
const b64 = (s) => JSON.parse(Buffer.from(s, 'base64url').toString())
try {
  const p1 = b64(fresh.split('.')[1])
  console.log('fresh token payload:', JSON.stringify(p1))
  const p2 = b64(env.created.headToken.split('.')[1])
  console.log('seed token payload:', JSON.stringify(p2))
} catch (e) { console.log('decode err', e.message) }

// 5. 试试 school-admin login 拿的 token 是否有效
const sa = await call('/school-admin/login', { method: 'POST', body: { username: 'sa1', password: '123456' } })
console.log('sa login:', sa.status)
const n3 = await call('/school-admin/dashboard', { token: sa.d?.token })
console.log('sa token dashboard:', n3.status)
