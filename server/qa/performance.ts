/**
 * 性能测试用例：登录吞吐 / 大数据集查询 / 家长看板聚合 / 分页 / 混合并发
 * 阈值设定基于单核内存库（better-sqlite3）环境，生产 MySQL 云环境应更优。
 */
import { http } from './harness'
import { addPerf, assert, PerfMetrics } from './framework'
import { SeedResult, SUPER_USER, SUPER_PASS, PARENT_PASS, TEACHER_PASS, teacherUser, studentNo } from './seed'

function pct(arr: number[], p: number) {
  if (!arr.length) return 0
  const s = [...arr].sort((a, b) => a - b)
  return s[Math.min(s.length - 1, Math.floor((p / 100) * s.length))]
}
function statsOf(times: number[], okCount: number, total: number, wallMs: number): PerfMetrics {
  return {
    total, ok: okCount,
    p50Ms: Math.round(pct(times, 50)),
    p95Ms: Math.round(pct(times, 95)),
    avgMs: Math.round(times.reduce((a, b) => a + b, 0) / Math.max(1, times.length)),
    maxMs: Math.round(Math.max(0, ...times)),
    rps: Math.round((okCount / Math.max(1, wallMs / 1000)) * 100) / 100,
  }
}

/** 受限并发执行器 */
async function pooled<T>(tasks: Array<() => Promise<T>>, concurrency: number): Promise<T[]> {
  const results: T[] = new Array(tasks.length)
  let idx = 0
  async function worker() {
    while (idx < tasks.length) {
      const i = idx++
      results[i] = await tasks[i]()
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, tasks.length) }, worker))
  return results
}

export function registerPerfCases(baseUrl: string, seed: SeedResult) {
  const api = (p: string) => `${baseUrl}${p}`

  addPerf('PERF-01', 'performance', '统一登录并发吞吐（bcrypt 校验为 CPU 密集）',
    '100 次登录 / 并发 10：成功率 100%，p95 < 3000ms，RPS ≥ 5',
    (m) => {
      if ((m.ok || 0) !== m.total) return `存在失败请求（${m.ok}/${m.total}）`
      if ((m.p95Ms || 0) > 3000) return `p95=${m.p95Ms}ms 超过 3000ms`
      if ((m.rps || 0) < 5) return `RPS=${m.rps} 低于 5`
      return null
    },
    async () => {
      const tasks = Array.from({ length: 100 }, (_, i) => async () => {
        const t0 = Date.now()
        // 轮流用教师/家长账号，贴近真实混合登录
        const body = i % 2 === 0
          ? { username: teacherUser((i % 10) + 1, 1), password: TEACHER_PASS }
          : { username: studentNo((i % 10) + 1, 1, (i % 50) + 1), password: PARENT_PASS }
        const r = await http('POST', api('/auth/unified-login'), { body, timeoutMs: 20000 })
        return { dt: Date.now() - t0, ok: r.status < 300 }
      })
      const wall0 = Date.now()
      const res = await pooled(tasks, 10)
      const wall = Date.now() - wall0
      return statsOf(res.filter((r) => r.ok).map((r) => r.dt), res.filter((r) => r.ok).length, res.length, wall)
    })

  addPerf('PERF-02', 'performance', '家长成绩查询（10 考试 × 6 科数据集）',
    '100 次顺序查询：p95 < 500ms，无失败',
    (m) => {
      if ((m.ok || 0) !== m.total) return '存在失败请求'
      if ((m.p95Ms || 0) > 500) return `p95=${m.p95Ms}ms 超过 500ms`
      return null
    },
    async () => {
      const lg = await http('POST', api('/auth/unified-login'), { body: { username: studentNo(1, 1, 1), password: PARENT_PASS } })
      const tok = lg.body.token
      const times: number[] = []
      let ok = 0
      for (let i = 0; i < 100; i++) {
        const t0 = Date.now()
        const r = await http('GET', api('/parent-auth/exams'), { token: tok })
        times.push(Date.now() - t0)
        if (r.status < 300) ok++
      }
      return statsOf(times, ok, 100, times.reduce((a, b) => a + b, 0))
    })

  addPerf('PERF-03', 'performance', '家长看板聚合（9 接口 × 30 位家长，并发 15）',
    '270 请求：错误率 < 1%，p95 < 800ms',
    (m) => {
      const errRate = 1 - (m.ok || 0) / Math.max(1, m.total)
      if (errRate > 0.01) return `错误率 ${(errRate * 100).toFixed(1)}% 超过 1%`
      if ((m.p95Ms || 0) > 800) return `p95=${m.p95Ms}ms 超过 800ms`
      return null
    },
    async () => {
      // 预登录 30 位家长
      const tokens: string[] = []
      for (let i = 0; i < 30; i++) {
        const no = studentNo((i % 10) + 1, (i % 10) + 1, (i % 50) + 1)
        const lg = await http('POST', api('/auth/unified-login'), { body: { username: no, password: PARENT_PASS } })
        if (lg.body.token) tokens.push(lg.body.token)
      }
      const paths = ['/parent-auth/me', '/parent-auth/notices', '/parent-auth/exams', '/parent-auth/homework', '/parent-auth/attendance', '/parent-auth/behavior', '/parent-auth/schedule', '/parent-auth/communications', '/parent-auth/teachers']
      const tasks: Array<() => Promise<{ dt: number; ok: boolean }>> = []
      for (const tok of tokens) {
        for (const p of paths) {
          tasks.push(async () => {
            const t0 = Date.now()
            const r = await http('GET', api(p), { token: tok })
            return { dt: Date.now() - t0, ok: r.status < 300 }
          })
        }
      }
      const wall0 = Date.now()
      const res = await pooled(tasks, 15)
      const wall = Date.now() - wall0
      return statsOf(res.filter((r) => r.ok).map((r) => r.dt), res.filter((r) => r.ok).length, res.length, wall)
    })

  addPerf('PERF-04', 'performance', '教师班级成绩查询（50 生 × 6 科 JSON 分数）',
    '100 次顺序查询：p95 < 500ms',
    (m) => {
      if ((m.ok || 0) !== m.total) return '存在失败请求'
      if ((m.p95Ms || 0) > 500) return `p95=${m.p95Ms}ms 超过 500ms`
      return null
    },
    async () => {
      const lg = await http('POST', api('/auth/unified-login'), { body: { username: teacherUser(1, 1), password: TEACHER_PASS } })
      const tok = lg.body.token
      const classId = seed.schools[0].classIds[0]
      const times: number[] = []
      let ok = 0
      for (let i = 0; i < 100; i++) {
        const t0 = Date.now()
        const r = await http('GET', api(`/grades?classId=${classId}`), { token: tok })
        times.push(Date.now() - t0)
        if (r.status < 300) ok++
      }
      return statsOf(times, ok, 100, times.reduce((a, b) => a + b, 0))
    })

  addPerf('PERF-05', 'performance', '5000 学生分页遍历（pageSize=50 × 前 40 页）',
    '40 次分页查询：p95 < 400ms',
    (m) => {
      if ((m.ok || 0) !== m.total) return '存在失败请求'
      if ((m.p95Ms || 0) > 400) return `p95=${m.p95Ms}ms 超过 400ms`
      return null
    },
    async () => {
      const tok = seed.schools[0].adminToken
      const times: number[] = []
      let ok = 0
      for (let page = 1; page <= 40; page++) {
        const t0 = Date.now()
        const r = await http('GET', api(`/school-admin/students?page=${page}&pageSize=50`), { token: tok })
        times.push(Date.now() - t0)
        if (r.status < 300) ok++
      }
      return statsOf(times, ok, 40, times.reduce((a, b) => a + b, 0))
    })

  addPerf('PERF-06', 'performance', '混合并发只读负载（教师+家长+校管，300 请求 / 并发 20）',
    '错误率 < 1%，p95 < 1000ms',
    (m) => {
      const errRate = 1 - (m.ok || 0) / Math.max(1, m.total)
      if (errRate > 0.01) return `错误率 ${(errRate * 100).toFixed(1)}% 超过 1%`
      if ((m.p95Ms || 0) > 1000) return `p95=${m.p95Ms}ms 超过 1000ms`
      return null
    },
    async () => {
      const tLg = await http('POST', api('/auth/unified-login'), { body: { username: teacherUser(1, 1), password: TEACHER_PASS } })
      const pLg = await http('POST', api('/auth/unified-login'), { body: { username: studentNo(1, 1, 5), password: PARENT_PASS } })
      const tokT = tLg.body.token, tokP = pLg.body.token, tokA = seed.schools[0].adminToken
      const classId = seed.schools[0].classIds[0]
      const mix: Array<{ path: string; token: string }> = [
        { path: `/grades?classId=${classId}`, token: tokT },
        { path: `/exams?classId=${classId}`, token: tokT },
        { path: `/students?classId=${classId}&pageSize=50`, token: tokT },
        { path: '/parent-auth/exams', token: tokP },
        { path: '/parent-auth/me', token: tokP },
        { path: '/parent-auth/attendance', token: tokP },
        { path: '/school-admin/dashboard', token: tokA },
        { path: '/school-admin/teachers?pageSize=20', token: tokA },
      ]
      const tasks = Array.from({ length: 300 }, (_, i) => {
        const m = mix[i % mix.length]
        return async () => {
          const t0 = Date.now()
          const r = await http('GET', api(m.path), { token: m.token })
          return { dt: Date.now() - t0, ok: r.status < 300 }
        }
      })
      const wall0 = Date.now()
      const res = await pooled(tasks, 20)
      const wall = Date.now() - wall0
      return statsOf(res.filter((r) => r.ok).map((r) => r.dt), res.filter((r) => r.ok).length, res.length, wall)
    })
}
