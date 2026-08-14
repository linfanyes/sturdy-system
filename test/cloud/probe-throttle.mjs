/**
 * 探测真实环境全局限流上限：超管登录后并发打轻量 GET，统计 429 与吞吐。
 * 用法：node test/cloud/probe-throttle.mjs [并发数] [总请求数]
 */
const BASE = process.env.BASE || 'https://tec-work-283329-8-1440166408.sh.run.tcloudbase.com/api/v1'
const CONCURRENCY = Number(process.argv[2] || 50)
const TOTAL = Number(process.argv[3] || 200)

async function login() {
  const r = await fetch(BASE + '/auth/unified-login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'admin', password: 'admin@520' }),
  })
  const d = await r.json()
  if (!d.token) throw new Error('login failed ' + r.status)
  return d.token
}

async function main() {
  const token = await login()
  const t0 = Date.now()
  let ok = 0, tooMany = 0, other = 0
  let next = 0
  const runOne = async () => {
    while (next < TOTAL) {
      const i = next++
      const r = await fetch(BASE + '/admin/schools?take=1', {
        headers: { Authorization: 'Bearer ' + token },
      })
      if (r.status === 429) tooMany++
      else if (r.status === 200) ok++
      else other++
    }
  }
  await Promise.all(Array.from({ length: CONCURRENCY }, runOne))
  const el = (Date.now() - t0) / 1000
  console.log(`并发=${CONCURRENCY} 总=${TOTAL} 通过=${ok} 429=${tooMany} 其他=${other}`)
  console.log(`耗时=${el.toFixed(1)}s 吞吐=${(TOTAL / el).toFixed(1)} req/s = ${(TOTAL / el * 60).toFixed(0)} req/min`)
}
main().catch((e) => { console.error(e); process.exit(1) })
