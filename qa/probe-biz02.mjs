// 调查 BIZ-02：qa_t_perf（应无关联）访问其他班级成员
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
const perfToken = env.created.isoTokens.qa_t_perf

// 1. qa_t_perf 登录确认
const login = await call('/auth/unified-login', { method: 'POST', body: { username: 'qa_t_perf', password: env.password } })
console.log('qa_t_perf login:', login.status, login.d?.user?.name)

// 2. qa_t_perf 访问四年级一班成员
const cls3 = env.created.classIds[2]
const m = await call(`/classes/${cls3}/members/list`, { method: 'POST', token: perfToken })
console.log('perf -> class3 members:', m.status, JSON.stringify(m.d).slice(0, 200))

// 3. qa_t_perf 访问三年级一班成员
const cls1 = env.created.classIds[0]
const m1 = await call(`/classes/${cls1}/members/list`, { method: 'POST', token: perfToken })
console.log('perf -> class1 members:', m1.status, JSON.stringify(m1.d).slice(0, 200))

// 4. qa_t_perf 查看班级列表（看它属于哪些班）
const cl = await call('/classes', { token: perfToken })
console.log('perf classes:', cl.status, JSON.stringify(cl.d).slice(0, 300))

// 5. qa_t_perf 访问非本班 dashboard
const db = await call(`/classes/${cls1}/dashboard`, { token: perfToken })
console.log('perf -> class1 dashboard:', db.status, JSON.stringify(db.d).slice(0, 150))
