/**
 * 云端性能测试（真实环境，直连微信云托管）。
 *
 * 场景：
 *  P1 核心列表延迟（classes/students/grades/exams，含 900 班 40500 生大数据集）
 *  P2 并发请求吞吐（100 并发 × 健康检查/轻查询）
 *  P3 分页边界（take 截断、深分页）
 *  P4 登录限流（10/min/IP+username）
 *  P5 全局限流（600/min/IP）
 *  P6 成绩分析接口延迟（在 27000 考试 / 81000 成绩记录上）
 *
 * 依赖：gen-data.mjs 已生成数据。用法：node test/cloud/perf-test.mjs
 */
import { req, log, Pool, stats, msStats, dumpStats } from './lib.mjs'

const SUPER = { username: 'admin', password: 'admin@520' }
const SAD = { username: 'sad_test01', password: 'Sad12345' }
const HEAD = { username: 'ht_T1_01_01', password: 'Teacher123' }

async function main() {
  const t0 = Date.now()
  log('=== 云端性能测试 ===')

  let r = await req('POST', '/auth/unified-login', { body: SUPER })
  const superToken = r.data?.token
  r = await req('POST', '/auth/unified-login', { body: SAD })
  const sadToken = r.data?.token
  r = await req('POST', '/auth/unified-login', { body: HEAD })
  const headToken = r.data?.token
  if (!superToken || !sadToken || !headToken) throw new Error('登录失败')

  // 定位目标学校与班级
  r = await req('GET', '/admin/schools?take=500', { token: superToken })
  const school = (r.data?.items || []).find((s) => String(s.code || '').startsWith('T1'))
  const schoolId = school?.id
  r = await req('GET', '/school-admin/classes?take=500', { token: sadToken })
  const cls = (r.data?.items || []).find((c) => c.grade === '一年级' && c.classNo === '1')
  const classId = cls?.id

  // ---------- P1 核心列表延迟（串行 ×3 轮，避免限流干扰） ----------
  log('\n[P1] 核心列表延迟（3 轮均值）')
  const listCases = [
    ['GET /admin/schools', () => req('GET', '/admin/schools?take=500', { token: superToken })],
    ['GET /school-admin/classes', () => req('GET', '/school-admin/classes?take=500', { token: sadToken })],
    ['GET /school-admin/teachers', () => req('GET', '/school-admin/teachers?take=500', { token: sadToken })],
    [`GET /school-admin/students(classId)`, () => req('GET', `/school-admin/students?classId=${classId}&take=500`, { token: sadToken })],
    ['GET /admin/students(全校)', () => req('GET', '/admin/students?take=500', { token: superToken })],
    [`GET /exams(classId)`, () => req('GET', `/exams?classId=${classId}&take=500`, { token: headToken })],
    [`GET /grades(classId)`, () => req('GET', `/grades?classId=${classId}&take=500`, { token: headToken })],
    [`GET /school-admin/academic/summary`, () => req('GET', '/school-admin/academic/summary', { token: sadToken })],
  ]
  for (const [name, fn] of listCases) {
    const times = []
    for (let i = 0; i < 3; i++) {
      const rr = await fn()
      times.push(rr.ms)
    }
    times.sort((a, b) => a - b)
    log(`  ${name}: 中位=${times[1]}ms 最慢=${times[2]}ms`)
  }

  // ---------- P2 并发吞吐 ----------
  log('\n[P2] 并发请求吞吐（100 并发健康检查 + 轻查询）')
  const pool = new Pool(30)
  const tasks = []
  const total = 120
  for (let i = 0; i < total; i++) {
    tasks.push(pool.add(async () => {
      await req('GET', i % 3 === 0 ? '/health' : `/admin/schools?take=5`, { token: superToken })
    }))
  }
  const tP2 = Date.now()
  await Promise.all(tasks)
  const p2ms = Date.now() - tP2
  log(`  120 并发请求 / ${p2ms}ms = ${(120000 / p2ms).toFixed(0)} req/s（429=${stats.byStatus[429] || 0} 5xx=${(stats.byStatus[500] || 0) + (stats.byStatus[502] || 0) + (stats.byStatus[503] || 0)}）`)
  dumpStats('并发段')

  // ---------- P3 分页边界 ----------
  log('\n[P3] 分页边界')
  r = await req('GET', `/admin/students?take=100000`, { token: superToken })
  log(`  take=100000: status=${r.status} 返回条数=${Array.isArray(r.data?.items) ? r.data.items.length : '-'}（应被截断≤500）耗时=${r.ms}ms`)
  r = await req('GET', `/admin/students?skip=9000&take=50`, { token: superToken })
  log(`  深分页 skip=9000 take=50: status=${r.status} 条数=${Array.isArray(r.data?.items) ? r.data.items.length : '-'} 耗时=${r.ms}ms`)

  // ---------- P4 登录限流（10/min） ----------
  log('\n[P4] 登录限流（同账号连续登录）')
  let hits = 0
  for (let i = 0; i < 14; i++) {
    const rr = await req('POST', '/auth/unified-login', { body: SAD })
    if (rr.status === 429) hits++
  }
  log(`  14 次连续登录: 429=${hits} 次（期望 ≥1 触发限流）`)

  // ---------- P5 全局限流（600/min） ----------
  log('\n[P5] 全局限流（200 请求健康检查）')
  let g429 = 0
  for (let i = 0; i < 200; i++) {
    const rr = await req('GET', '/health', {})
    if (rr.status === 429) g429++
  }
  log(`  200 次 /health: 429=${g429}`)

  // ---------- P6 成绩分析延迟 ----------
  log('\n[P6] 成绩分析延迟（大数据集）')
  const examR = await req('GET', `/exams?classId=${classId}&take=500`, { token: headToken })
  const exam = examR.data?.items?.[0]
  const ana = [
    [`/grades/analysis/exam`, () => req('GET', `/grades/analysis/exam?examId=${exam?.id}`, { token: headToken })],
    [`/grades/analysis/rank`, () => req('GET', `/grades/analysis/rank?classId=${classId}&subject=数学`, { token: headToken })],
    [`/grades/analysis/trend`, () => req('GET', `/grades/analysis/trend?classId=${classId}&subject=语文`, { token: headToken })],
    [`/grades/analysis/weak`, () => req('GET', `/grades/analysis/weak?classId=${classId}`, { token: headToken })],
  ]
  for (const [name, fn] of ana) {
    const times = []
    for (let i = 0; i < 3; i++) {
      const rr = await fn()
      times.push(rr.ms)
    }
    times.sort((a, b) => a - b)
    log(`  ${name}: 中位=${times[1]}ms 最慢=${times[2]}ms`)
  }

  log(`\n=== 性能测试结束，总耗时 ${((Date.now() - t0) / 1000).toFixed(1)}s ===`)
  dumpStats('性能测试')
  process.exit(0)
}

main().catch((e) => { console.error('性能测试失败:', e); process.exit(1) })
