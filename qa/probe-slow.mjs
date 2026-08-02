// 计时验证 dashboard / schools 单次响应
const BASE = 'http://localhost:3100/api'
const env = JSON.parse(await (await import('node:fs')).promises.readFile('qa/qa-env.json', 'utf8'))

async function timed(label, p, token) {
  const t0 = performance.now()
  try {
    const r = await fetch(BASE + p, {
      headers: { Authorization: `Bearer ${token}` },
    })
    const ms = (performance.now() - t0).toFixed(1)
    const body = await r.text()
    console.log(`${label}: ${r.status} | ${ms}ms | ${body.length}B | ${body.slice(0, 100)}`)
  } catch (e) {
    console.log(`${label}: ERROR ${e.message} | ${(performance.now() - t0).toFixed(1)}ms`)
  }
}

await timed('dashboard(校管)', '/school-admin/dashboard', env.created.saToken)
await timed('schools(超管)', '/admin/schools', env.created.suToken)
await timed('schools 第2次', '/admin/schools', env.created.suToken)
