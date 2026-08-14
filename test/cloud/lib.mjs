/**
 * 云端测试共享库：并发受限请求池 + 429 退避重试 + 进度统计。
 * 被 gen-data.mjs / func-test.mjs / perf-test.mjs 复用。
 */
export const BASE = process.env.BASE || 'https://tec-work-283329-8-1440166408.sh.run.tcloudbase.com/api/v1'

export const stats = { ok: 0, fail: 0, retry: 0, ms: [], byStatus: {} }
const now = () => Date.now()

export function log(...a) { console.log(...a) }

/** 单个请求：自动 JSON 解析；429 时按 Retry-After 退避重试；5xx 重试 2 次。 */
export async function req(method, path, { token, body, retries = 3 } = {}) {
  const start = now()
  let attempt = 0
  while (true) {
    attempt++
    const res = await fetch(BASE + path, {
      method,
      headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: 'Bearer ' + token } : {}) },
      body: body ? JSON.stringify(body) : undefined,
    })
    const ms = now() - start
    const txt = await res.text().catch(() => '')
    let data = null
    try { data = txt ? JSON.parse(txt) : null } catch { data = txt }
    stats.byStatus[res.status] = (stats.byStatus[res.status] || 0) + 1

    if (res.status === 429 && attempt <= retries) {
      stats.retry++
      const ra = Math.max(1, Number(res.headers.get('retry-after') || 2))
      await sleep(ra * 1000)
      continue
    }
    if (res.status >= 500 && attempt <= retries) {
      stats.retry++
      await sleep(500 * attempt)
      continue
    }
    stats.ms.push(ms)
    if (res.ok) stats.ok++; else stats.fail++
    return { status: res.status, data, ms }
  }
}

export const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

/** 并发受限任务池：同时最多 running 个任务，全部完成后 resolve。 */
export class Pool {
  constructor(concurrency) {
    this.concurrency = concurrency
    this.active = 0
    this.queue = []
    this.done = 0
    this.total = 0
  }
  add(fn) {
    this.total++
    return new Promise((resolve, reject) => {
      this.queue.push({ fn, resolve, reject })
      this._pump()
    })
  }
  _pump() {
    while (this.active < this.concurrency && this.queue.length) {
      const { fn, resolve, reject } = this.queue.shift()
      this.active++
      fn().then(
        (v) => { this.active--; this.done++; this._pump(); resolve(v) },
        (e) => { this.active--; this.done++; this._pump(); reject(e) },
      )
    }
  }
  async idle() {
    while (this.active > 0 || this.queue.length) await sleep(50)
  }
}

/** 汇总请求耗时统计。 */
export function msStats() {
  const arr = stats.ms
  if (!arr.length) return { n: 0, avg: 0, p95: 0, p99: 0, max: 0 }
  const s = [...arr].sort((a, b) => a - b)
  const q = (p) => s[Math.min(s.length - 1, Math.floor(s.length * p))]
  return {
    n: arr.length,
    avg: Math.round(arr.reduce((a, b) => a + b, 0) / arr.length),
    p95: Math.round(q(0.95)),
    p99: Math.round(q(0.99)),
    max: Math.round(s[s.length - 1]),
  }
}

export function dumpStats(label) {
  const m = msStats()
  log(`  [${label}] 请求=${m.n} 平均=${m.avg}ms p95=${m.p95}ms p99=${m.p99}ms 最大=${m.max}ms`)
  log(`  [${label}] 成功=${stats.ok} 失败=${stats.fail} 重试=${stats.retry} 状态分布=${JSON.stringify(stats.byStatus)}`)
}
