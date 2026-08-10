/**
 * QA 轻量测试框架：用例收集 + 执行 + 结果汇总（无第三方依赖）
 * 用例 ID 与 qa/TEST_CASES.md 一一对应。
 */
export type CaseStatus = 'pass' | 'fail' | 'skip'

export interface CaseResult {
  id: string
  name: string
  module: string
  status: CaseStatus
  durationMs: number
  error?: string
  detail?: string
}

export interface PerfMetrics {
  p50Ms?: number
  p95Ms?: number
  avgMs?: number
  maxMs?: number
  rps?: number
  total?: number
  ok?: number
  extra?: Record<string, number | string>
}

export interface PerfResult extends CaseResult {
  metrics?: PerfMetrics
  /** 性能阈值断言说明 */
  threshold?: string
}

type CaseFn = () => Promise<string | void>
type PerfFn = () => Promise<PerfMetrics>

interface CaseDef {
  id: string
  name: string
  module: string
  fn: CaseFn
}
interface PerfDef {
  id: string
  name: string
  module: string
  fn: PerfFn
  threshold: string
  check: (m: PerfMetrics) => string | null // 返回错误信息 = 不达标
}

const cases: CaseDef[] = []
const perfs: PerfDef[] = []

export function addCase(id: string, module: string, name: string, fn: CaseFn) {
  cases.push({ id, name, module, fn })
}
export function addPerf(id: string, module: string, name: string, threshold: string, check: (m: PerfMetrics) => string | null, fn: PerfFn) {
  perfs.push({ id, name, module, fn, threshold, check })
}

export async function runAll(): Promise<{ functional: CaseResult[]; performance: PerfResult[] }> {
  const functional: CaseResult[] = []
  for (const c of cases) {
    const t0 = Date.now()
    try {
      const detail = await c.fn()
      functional.push({ id: c.id, name: c.name, module: c.module, status: 'pass', durationMs: Date.now() - t0, detail: detail || undefined })
    } catch (e: any) {
      functional.push({ id: c.id, name: c.name, module: c.module, status: 'fail', durationMs: Date.now() - t0, error: e?.message || String(e) })
    }
  }
  const performance: PerfResult[] = []
  for (const p of perfs) {
    const t0 = Date.now()
    try {
      const metrics = await p.fn()
      const err = p.check(metrics)
      performance.push({
        id: p.id, name: p.name, module: p.module,
        status: err ? 'fail' : 'pass',
        durationMs: Date.now() - t0,
        metrics, threshold: p.threshold, error: err || undefined,
      })
    } catch (e: any) {
      performance.push({ id: p.id, name: p.name, module: p.module, status: 'fail', durationMs: Date.now() - t0, threshold: p.threshold, error: e?.message || String(e) })
    }
  }
  return { functional, performance }
}

export function summarize(functional: CaseResult[], performance: PerfResult[]) {
  const f = {
    total: functional.length,
    pass: functional.filter((c) => c.status === 'pass').length,
    fail: functional.filter((c) => c.status === 'fail').length,
  }
  const p = {
    total: performance.length,
    pass: performance.filter((c) => c.status === 'pass').length,
    fail: performance.filter((c) => c.status === 'fail').length,
  }
  return { functional: f, performance: p }
}

/** 断言辅助 */
export function assert(cond: any, msg: string) {
  if (!cond) throw new Error(msg)
}
export function assertEq(actual: any, expected: any, msg: string) {
  if (actual !== expected) throw new Error(`${msg}（期望 ${JSON.stringify(expected)}，实际 ${JSON.stringify(actual)}）`)
}
export function assertIncludes(haystack: any, needle: any, msg: string) {
  const ok = typeof haystack === 'string' ? haystack.includes(needle) : Array.isArray(haystack) && haystack.includes(needle)
  if (!ok) throw new Error(`${msg}（未包含 ${JSON.stringify(needle)}）`)
}
