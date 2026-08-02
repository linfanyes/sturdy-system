// 检查 qa_t_sub3 登录
const BASE = 'http://localhost:3100/api'
async function call(p, { method = 'GET', body } = {}) {
  const r = await fetch(BASE + p, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  })
  const t = await r.text()
  let d
  try { d = t ? JSON.parse(t) : null } catch { d = t }
  return { status: r.status, ok: r.ok, d }
}
for (const u of ['qa_t_sub1', 'qa_t_sub2', 'qa_t_sub3']) {
  const r = await call('/auth/unified-login', { method: 'POST', body: { username: u, password: 'Test@2026' } })
  console.log(u, '=>', r.status, JSON.stringify(r.d).slice(0, 120))
}
