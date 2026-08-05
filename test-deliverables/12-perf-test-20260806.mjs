#!/usr/bin/env node
/**
 * 性能压测脚本（2026-08-06 版）— 直连云托管
 * 场景：登录并发 / dashboard 并发 / 大数据分页 / 成绩列表 / 家长查询 / 搜索 / 稳定性
 * 输出：各场景 P50/P95/P99、QPS、错误率
 */
const BASE = (process.env.PERF_API_BASE || 'https://tec-work-283329-8-1440166408.sh.run.tcloudbase.com/api').replace(/\/$/, '')

async function call(method, p, { body, token } = {}) {
  for (let attempt = 0; ; attempt++) {
    const t0 = Date.now()
    const res = await fetch(`${BASE}${p}`, {
      method,
      headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: body ? JSON.stringify(body) : undefined,
    })
    const lat = Date.now() - t0
    const text = await res.text()
    let data = null
    try { data = text ? JSON.parse(text) : null } catch { data = text }
    if (res.status === 429 && attempt < 5) {
      // 限速退避重试（不计入有效延迟）
      await new Promise((r) => setTimeout(r, 1200 * Math.pow(2, attempt)))
      continue
    }
    return { status: res.status, lat, data }
  }
}

async function runScenario(name, { concurrency, iterations, fn }) {
  const latencies = []
  let okCount = 0, failCount = 0
  const errors = {}
  const t0 = Date.now()
  let cursor = 0
  async function worker() {
    while (true) {
      const i = cursor++
      if (i >= iterations) break
      try {
        const r = await fn(i)
        latencies.push(r.lat)
        if (r.status >= 200 && r.status < 300) okCount++
        else {
          failCount++
          const key = `${r.status}` + (r.data?.message ? ':' + String(r.data.message).slice(0, 40) : '')
          errors[key] = (errors[key] || 0) + 1
        }
      } catch (e) {
        failCount++
        latencies.push(9999)
        const key = 'ERR:' + e.message.slice(0, 40)
        errors[key] = (errors[key] || 0) + 1
      }
    }
  }
  await Promise.all(Array.from({ length: concurrency }, worker))
  const elapsed = (Date.now() - t0) / 1000
  const sorted = latencies.sort((a, b) => a - b)
  const pct = (p) => sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * p))]
  const qps = (okCount + failCount) / elapsed
  const errRate = ((failCount / (okCount + failCount)) * 100).toFixed(2)
  console.log(`\n[${name}] 并发=${concurrency} 请求=${iterations} 耗时=${elapsed.toFixed(1)}s QPS=${qps.toFixed(1)} 错误率=${errRate}%`)
  console.log(`  P50=${pct(0.5)}ms P95=${pct(0.95)}ms P99=${pct(0.99)}ms 成功=${okCount} 失败=${failCount}`)
  if (failCount) console.log(`  错误分布: ${JSON.stringify(errors)}`)
  return { name, ok: okCount, fail: failCount, errRate: Number(errRate), p99: pct(0.99), qps: Number(qps.toFixed(1)) }
}

async function main() {
  console.log('=== 性能压测开始 ===')
  const report = []

  // 准备 token
  const superLogin = await call('POST', '/admin/login', { body: { username: 'admin', password: 'admin' } })
  const superToken = superLogin.data?.token
  if (!superToken) { console.error('超管登录失败'); process.exit(1) }

  // 找校管 + 班主任 + 家长
  const saUser = 'qa_sa_qa'
  const saLogin = await call('POST', '/auth/unified-login', { body: { username: saUser, password: 'Qa@2026' } })
  const saToken = saLogin.data?.token
  const htLogin = await call('POST', '/auth/unified-login', { body: { username: 'qa_qa_ht_1', password: 'Qa@2026' } })
  const htToken = htLogin.data?.token

  let parentNo, parentToken
  if (saToken) {
    const st = await call('GET', '/school-admin/students', { token: saToken })
    const list = Array.isArray(st.data) ? st.data : st.data?.items || []
    const target = list.find((s) => (s.studentNo || '').endsWith('001')) || list[0]
    if (target?.studentNo) {
      parentNo = target.studentNo
      const pl = await call('POST', '/parent-auth/login', { body: { studentNo: target.studentNo, password: '123456' } })
      parentToken = pl.data?.token
    }
  }

  // 1. 登录并发（超管）
  report.push(await runScenario('P1 超管登录并发', {
    concurrency: 6, iterations: 18,
    fn: async () => call('POST', '/admin/login', { body: { username: 'admin', password: 'admin' } }),
  }))

  // 2. dashboard 并发（校管）
  if (saToken) {
    report.push(await runScenario('P2 校管 dashboard 并发', {
      concurrency: 10, iterations: 100,
      fn: async () => call('GET', '/school-admin/dashboard', { token: saToken }),
    }))
  }

  // 3. 学生列表大数据分页（校管）
  if (saToken) {
    report.push(await runScenario('P4 学生列表分页(3000+)', {
      concurrency: 15, iterations: 120,
      fn: async (i) => call('GET', `/school-admin/students?skip=${(i % 10) * 100}&take=100`, { token: saToken }),
    }))
  }

  // 4. 成绩列表（教师）
  if (htToken) {
    report.push(await runScenario('P3 教师成绩列表', {
      concurrency: 10, iterations: 80,
      fn: async () => call('GET', '/grades?take=50', { token: htToken }),
    }))
  }

  // 5. 家长查询
  if (parentToken) {
    report.push(await runScenario('P5 家长成绩查询', {
      concurrency: 8, iterations: 60,
      fn: async () => call('GET', '/parent-auth/exams', { token: parentToken }),
    }))
    report.push(await runScenario('P5b 家长 me', {
      concurrency: 8, iterations: 60,
      fn: async () => call('GET', '/parent-auth/me', { token: parentToken }),
    }))
  }

  // 6. 全局搜索（校管）
  if (saToken) {
    report.push(await runScenario('P7 全局搜索', {
      concurrency: 8, iterations: 60,
      fn: async () => call('GET', '/school-admin/search?q=同学', { token: saToken }),
    }))
  }

  // 7. 稳定性：混合读（teacher /students + /exams + /schedules）
  if (htToken) {
    report.push(await runScenario('P8 教师混合读稳定性', {
      concurrency: 12, iterations: 150,
      fn: async (i) => {
        const path = i % 3 === 0 ? '/students?take=50' : i % 3 === 1 ? '/exams?take=50' : '/schedules'
        return call('GET', path, { token: htToken })
      },
    }))
  }

  console.log('\n=== 压测汇总 ===')
  report.forEach((r) => console.log(`  ${r.name}: QPS=${r.qps} P99=${r.p99}ms 错误率=${r.errRate}%`))
  console.log('=== 压测完成 ===')
}
main().catch((e) => { console.error('FATAL: ' + e.message); process.exit(1) })
