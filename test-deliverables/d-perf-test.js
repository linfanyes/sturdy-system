/**
 * d-perf-test.js — 轻量性能测试（直连真实云托管后台）
 * ====================================================================
 * 目标系统: https://tec-work-283329-8-1440166408.sh.run.tcloudbase.com  (全局前缀 /api)
 * 技术栈:   NestJS + TypeORM + MySQL + JWT
 *
 * 目标接口（按需求）:
 *   1. GET  /api/health                          —— 匿名健康检查
 *   2. POST /api/admin/login                      —— 登录（获取 token，后续复用）
 *   3. GET  /api/classes                          —— 典型列表读取（教师 token）
 *   4. GET  /api/students                         —— 典型列表读取（教师 token）
 *   5. POST /api/todos                            —— 典型写入（教师 token，跑后 teardown）
 *
 * 指标: 并发 20、每接口 50~100 次请求，统计 P50 / P95 / 平均响应时间、错误率。
 *
 * 约束与处理:
 *   - 全局节流 ThrottlerGuard = 60 req/min/IP（实测云部署较宽松，70 并发全 200）。
 *     本脚本对读/写接口采用并发 20 的突发，并对 429 做指数退避重试，保证稳定。
 *   - 登录端点有角色级节流（super 6/min、teacher 10/min，滑动窗口）。
 *     因此登录仅做小样本（6 次，间隔 11s）测延迟，不复用其做吞吐压测；
 *     真正的读/写压测统一复用一次登录拿到的 token。
 *   - 造数据前缀 test_qa_perf_，run 结束后 teardown 仅清理该前缀数据，不动生产数据。
 * ====================================================================
 */
const BASE = 'https://tec-work-283329-8-1440166408.sh.run.tcloudbase.com'
const PREFIX = 'test_qa_perf_'

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

/** 带 429 退避重试的 HTTP 助手 */
async function api(method, path, body = null, token = '', opts = {}) {
  const maxRetry = opts.maxRetry ?? 3
  const url = BASE + path
  for (let attempt = 0; attempt <= maxRetry; attempt++) {
    const t0 = Date.now()
    try {
      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: 'Bearer ' + token } : {}),
        },
        body: body != null ? JSON.stringify(body) : undefined,
      })
      const ct = res.headers.get('content-type') || ''
      let data = null
      if (ct.includes('application/json')) {
        try { data = await res.json() } catch (e) { /* ignore */ }
      }
      const dt = Date.now() - t0
      if (res.status === 429 && attempt < maxRetry) {
        await sleep(400 * (attempt + 1))
        continue
      }
      return { status: res.status, data, ms: dt }
    } catch (e) {
      if (attempt < maxRetry) { await sleep(300); continue }
      return { status: 0, error: String(e), ms: Date.now() - t0 }
    }
  }
}

/** 一次性获取并复用 token（不计入吞吐，仅作基准） */
async function getTokens() {
  const out = {}
  let r = await api('POST', '/api/admin/login', { username: 'admin', password: 'admin' })
  if (r.status !== 201 && r.status !== 200) throw new Error('super login failed: ' + r.status)
  out.super = r.data?.token || (r.data?.data && r.data.data.token)
  r = await api('POST', '/api/auth/unified-login', { username: 'teacher1', password: '123456' })
  if (r.status !== 201) throw new Error('teacher login failed: ' + r.status)
  out.teacher = r.data?.token
  return out
}

function percentile(arr, p) {
  if (!arr.length) return 0
  const s = [...arr].sort((a, b) => a - b)
  const idx = Math.min(s.length - 1, Math.max(0, Math.floor((p / 100) * s.length)))
  return s[idx]
}
function latencyStats(lat) {
  if (!lat.length) return { count: 0, p50: 0, p95: 0, avg: 0, min: 0, max: 0 }
  const sum = lat.reduce((a, b) => a + b, 0)
  return {
    count: lat.length,
    p50: percentile(lat, 50),
    p95: percentile(lat, 95),
    avg: Math.round(sum / lat.length),
    min: Math.min(...lat),
    max: Math.max(...lat),
  }
}

/**
 * 通用压测函数
 * @param {string} label
 * @param {(i:number, created:string[])=>Promise<{status:number}>} fn  单次请求；如需 teardown 把 id 推入 created
 * @param {{total?:number, concurrency?:number, spacingMs?:number, maxRetry?:number}} opts
 */
async function bench(label, fn, opts = {}) {
  const { total = 60, concurrency = 20, spacingMs = 0, maxRetry = 3 } = opts
  const lat = []
  let ok = 0
  let err = 0
  const created = []
  let started = 0

  async function worker() {
    while (true) {
      const i = started++
      if (i >= total) break
      const before = Date.now()
      try {
        const res = await fn(i, created, maxRetry)
        if (res && res.status >= 200 && res.status < 400) ok++
        else err++
      } catch (e) {
        err++
      }
      lat.push(Date.now() - before)
      if (spacingMs) await sleep(spacingMs)
    }
  }

  const n = Math.min(concurrency, total)
  const workers = []
  for (let k = 0; k < n; k++) workers.push(worker())
  await Promise.all(workers)

  const st = latencyStats(lat)
  const errorRate = total ? (err / total) * 100 : 0
  console.log(
    `  ${label.padEnd(26)} 总数=${String(total).padStart(3)} 成功=${String(ok).padStart(3)} ` +
    `失败=${String(err).padStart(3)} 错误率=${errorRate.toFixed(1).padStart(4)}%  ` +
    `P50=${String(st.p50).padStart(4)}ms P95=${String(st.p95).padStart(4)}ms 平均=${String(st.avg).padStart(4)}ms 最大=${String(st.max).padStart(4)}ms`
  )
  return { label, total, ok, err, errorRate: +errorRate.toFixed(2), ...st, created }
}

async function main() {
  console.log('🔧 获取并复用 token...')
  const tok = await getTokens()
  if (!tok.super || !tok.teacher) throw new Error('token 获取失败')
  console.log(`  super token: ${tok.super ? 'OK' : 'FAIL'}   teacher token: ${tok.teacher ? 'OK' : 'FAIL'}`)

  const results = []
  console.log('\n═══ 性能测试（并发 20，每接口 ~60 次）═══')

  // 1. 健康检查（匿名）
  console.log('\n[Phase 1] GET /api/health  —— 匿名，测基础设施基线')
  results.push(await bench('GET /api/health', async () => api('GET', '/api/health'), { total: 60, concurrency: 20 }))
  await sleep(2000)

  // 2. 登录延迟（受角色级节流限制，仅小样本测延迟）
  console.log('\n[Phase 2] POST /api/admin/login —— 超管登录延迟（受 6/min 节流，仅 6 次、间隔 11s）')
  results.push(await bench('POST /api/admin/login', async () => api('POST', '/api/admin/login', { username: 'admin', password: 'admin' }, '', { maxRetry: 1 }), { total: 6, concurrency: 1, spacingMs: 11000 }))
  await sleep(2000)

  // 3. 班级列表（教师 token 复用）
  console.log('\n[Phase 3] GET /api/classes —— 教师 token 复用，典型列表读取')
  results.push(await bench('GET /api/classes', async () => api('GET', '/api/classes', null, tok.teacher), { total: 60, concurrency: 20 }))
  await sleep(2000)

  // 4. 学生列表（教师 token 复用）
  console.log('\n[Phase 4] GET /api/students —— 教师 token 复用，典型列表读取')
  results.push(await bench('GET /api/students', async () => api('GET', '/api/students', null, tok.teacher), { total: 60, concurrency: 20 }))
  await sleep(2000)

  // 5. 写入（教师 token 复用），跑后 teardown
  console.log('\n[Phase 5] POST /api/todos —— 教师 token 复用，典型写入（前缀 ' + PREFIX + '）')
  const write = await bench('POST /api/todos', async (i, created) => {
    const r = await api('POST', '/api/todos', { title: PREFIX + 'todo_' + i }, tok.teacher)
    const id = r.data?.id || (r.data?.data && r.data.data.id)
    if ((r.status === 201 || r.status === 200) && id) created.push(id)
    return r
  }, { total: 60, concurrency: 20 })
  results.push(write)
  await sleep(1000)

  // teardown: 清理写入的 test_qa_perf_ todos
  console.log('\n🧹 teardown: 清理本次写入的 ' + PREFIX + ' 数据...')
  let cleaned = 0
  let cleanFail = 0
  // 直接按收集到的 id 删除
  for (const id of write.created) {
    const r = await api('DELETE', '/api/todos/' + id, null, tok.teacher, { maxRetry: 2 })
    if (r.status === 200 || r.status === 204 || r.status === 404) cleaned++
    else cleanFail++
  }
  // 兜底：按前缀再扫一遍，防止遗漏
  const list = await api('GET', '/api/todos?take=500', null, tok.teacher)
  if (list.status === 200 && Array.isArray(list.data)) {
    for (const it of list.data) {
      const title = it?.title || (it?.data && it.data.title) || ''
      const id = it?.id || (it?.data && it.data.id)
      if (title.startsWith(PREFIX) && id) {
        const r = await api('DELETE', '/api/todos/' + id, null, tok.teacher, { maxRetry: 2 })
        if (r.status === 200 || r.status === 204 || r.status === 404) cleaned++
        else cleanFail++
      }
    }
  }
  console.log(`🧹 teardown 完成: 成功 ${cleaned} / 失败 ${cleanFail}`)

  // 汇总
  console.log('\n═══════════════════════════════════════════════')
  console.log('📊 性能测试汇总')
  console.log('───────────────────────────────────────────────')
  console.log('  接口'.padEnd(26) + '总数  错误率    P50    P95   平均   最大')
  for (const r of results) {
    console.log(
      '  ' + r.label.padEnd(24) +
      String(r.total).padStart(4) + '  ' +
      (r.errorRate + '%').padStart(6) + '  ' +
      (r.p50 + 'ms').padStart(6) + ' ' +
      (r.p95 + 'ms').padStart(6) + ' ' +
      (r.avg + 'ms').padStart(6) + ' ' +
      (r.max + 'ms').padStart(6)
    )
  }
  console.log('═══════════════════════════════════════════════')

  const out = {
    generatedAt: new Date().toISOString(),
    base: BASE,
    tokenReuse: true,
    concurrency: 20,
    results,
    teardown: { cleaned, cleanFail },
  }
  const fs = await import('fs')
  fs.writeFileSync('d-perf-results.json', JSON.stringify(out, null, 2))
  console.log('📄 结果已保存: d-perf-results.json')
}

main().catch((e) => {
  console.error('❌ 性能测试异常:', e)
  process.exit(1)
})
