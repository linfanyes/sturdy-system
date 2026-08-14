/**
 * 云端现状扫描（真实环境，直连微信云托管）。
 * 在 0033 迁移未生效、无法建班建生的前提下，
 * 测试一切「不依赖 T1 生成数据」即可验证的功能面：
 *   - 超管全部页面端点
 *   - 校管可测端点（已有学校 / 教师 / 导出 / 资源库）
 *   - 教师登录与权限边界
 *   - 越权 / 鉴权边界
 *   - 并发吞吐 + 全局限流 + 登录限流
 *   - Schema 漂移复现（建班/建生报错，供报告记录阻塞点）
 * 输出：终端 + .cloud-sweep-result.json
 * 用法：node test/cloud/cloud-sweep.mjs
 */
import { writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { req, log, Pool, stats, msStats, dumpStats } from './lib.mjs'

const __dirname = dirname(fileURLToPath(import.meta.url))
const SUPER = { username: 'admin', password: 'admin@520' }
const T = { pass: 0, fail: 0, blocked: 0, cases: [] }
const ok = (name, cond, detail = '', blocked = false) => {
  T.cases.push({ name, pass: !!cond, detail: String(detail).slice(0, 120), blocked })
  if (cond) T.pass++
  else if (blocked) T.blocked++
  else { T.fail++; log(`  ❌ FAIL: ${name} | ${detail}`) }
}
const j = (d) => JSON.stringify(d)

async function main() {
  const t0 = Date.now()
  log('=== 云端现状扫描（真实环境） ===')

  // ---------- 0. 健康 + 超管登录 ----------
  let r = await req('GET', '/health', {})
  ok('S0-1 GET /health', r.status === 200 && r.data?.status === 'ok', `status=${r.status} ${r.ms}ms`)
  r = await req('GET', '/api-version', {})
  ok('S0-2 GET /api-version', r.status === 200, `status=${r.status}`)
  r = await req('POST', '/auth/unified-login', { body: SUPER })
  ok('S0-3 超管登录 admin/admin@520', r.status < 400 && !!r.data?.token, `status=${r.status}`)
  const superToken = r.data?.token
  if (!superToken) throw new Error('超管登录失败')
  r = await req('GET', '/auth/me', { token: superToken })
  ok('S0-4 超管 /auth/me role=super', r.data?.role === 'super', `role=${r.data?.role}`)

  // ---------- 1. 超管页面覆盖 ----------
  log('\n[1] 超管页面端点')
  const S = [
    ['S1-1 GET /admin/schools', () => req('GET', '/admin/schools?take=10', { token: superToken })],
    ['S1-2 GET /admin/school-admins', () => req('GET', '/admin/school-admins?take=10', { token: superToken })],
    ['S1-3 GET /admin/teachers', () => req('GET', '/admin/teachers?take=10', { token: superToken })],
    ['S1-4 GET /admin/classes', () => req('GET', '/admin/classes?take=10', { token: superToken })],
    ['S1-5 GET /admin/students', () => req('GET', '/admin/students?take=10', { token: superToken })],
    ['S1-6 GET /admin/audit-logs', () => req('GET', '/admin/audit-logs?take=10', { token: superToken })],
    ['S1-7 GET /admin/audit-exams', () => req('GET', '/admin/audit-exams?take=10', { token: superToken })],
    ['S1-8 GET /admin/audit-grades', () => req('GET', '/admin/audit-grades?take=10', { token: superToken })],
    ['S1-9 GET /admin/audit-grade-summary', () => req('GET', '/admin/audit-grade-summary', { token: superToken })],
    ['S1-10 GET /config/app', () => req('GET', '/config/app', { token: superToken })],
    ['S1-11 GET /config/ai', () => req('GET', '/config/ai', { token: superToken })],
    ['S1-12 GET /config/ai-providers', () => req('GET', '/config/ai-providers', { token: superToken })],
    ['S1-13 GET /config/ai-settings', () => req('GET', '/config/ai-settings', { token: superToken })],
    ['S1-14 GET /config/app-config', () => req('GET', '/config/app-config', { token: superToken })],
    ['S1-15 GET /monitor/logs', () => req('GET', '/monitor/logs?take=10', { token: superToken })],
    ['S1-16 GET /admin/dashboard', () => req('GET', '/admin/dashboard', { token: superToken })],
    ['S1-17 POST 建校(新探测校)', () => req('POST', '/admin/schools', { token: superToken, body: { name: '扫描探测校', prefix: 'SW', platform: 'web', address: '扫描路1号', status: 'active' } })],
  ]
  for (const [name, fn] of S) {
    const rr = await fn()
    ok(name, rr.status < 400, `status=${rr.status} msg=${String(rr.data?.message || '').slice(0, 50)}`)
  }

  // ---------- 2. 校管可测端点 ----------
  log('\n[2] 校管端点（复用已有探测校）')
  // 尝试登录已有校管（probe-schema 创建的 sad_px）
  let sadToken = null
  r = await req('POST', '/auth/unified-login', { body: { username: 'sad_probe_2', password: 'Sad12345' } })
  if (r.data?.token) sadToken = r.data.token
  ok('S2-0 复用已有校管登录', !!sadToken, `status=${r.status}`)

  if (sadToken) {
    const C = [
      ['S2-1 GET /school-admin/dashboard', () => req('GET', '/school-admin/dashboard', { token: sadToken })],
      ['S2-2 GET /school-admin/classes', () => req('GET', '/school-admin/classes?take=500', { token: sadToken })],
      ['S2-3 GET /school-admin/teachers', () => req('GET', '/school-admin/teachers?take=500', { token: sadToken })],
      ['S2-4 GET /school-admin/school-features', () => req('GET', '/school-admin/school-features', { token: sadToken })],
      ['S2-5 GET /school-admin/search?q=一年级', () => req('GET', '/school-admin/search?q=一年级', { token: sadToken })],
      ['S2-6 GET /school-admin/homework', () => req('GET', '/school-admin/homework', { token: sadToken })],
      ['S2-7 GET /school-admin/parent-logins', () => req('GET', '/school-admin/parent-logins?take=10', { token: sadToken })],
      ['S2-8 GET /school-admin/academic/summary', () => req('GET', '/school-admin/academic/summary', { token: sadToken })],
      ['S2-9 GET /school-admin/academic/class-comparison', () => req('GET', '/school-admin/academic/class-comparison', { token: sadToken })],
      ['S2-10 GET /school-admin/academic/class-trend', () => req('GET', '/school-admin/academic/class-trend', { token: sadToken })],
      ['S2-11 GET /school-admin/notices', () => req('GET', '/school-admin/notices?take=10', { token: sadToken })],
      ['S2-12 GET /school-admin/textbooks', () => req('GET', '/school-admin/textbooks?take=10', { token: sadToken })],
      ['S2-13 GET /school-admin/resource-library/words', () => req('GET', '/school-admin/resource-library/words?take=10', { token: sadToken })],
      ['S2-14 GET /school-admin/resource-library/formulas', () => req('GET', '/school-admin/resource-library/formulas?take=10', { token: sadToken })],
      ['S2-15 GET /school-admin/resource-library/moral', () => req('GET', '/school-admin/resource-library/moral?take=10', { token: sadToken })],
      ['S2-16 GET /school-admin/resource-library/poems', () => req('GET', '/school-admin/resource-library/poems?take=10', { token: sadToken })],
      ['S2-17 GET /school-admin/resource-library/science', () => req('GET', '/school-admin/resource-library/science?take=10', { token: sadToken })],
      ['S2-18 导出 teachers-xls', () => req('GET', '/school-admin/export/teachers-xls', { token: sadToken })],
      ['S2-19 导出 classes-xls', () => req('GET', '/school-admin/export/classes-xls', { token: sadToken })],
      ['S2-20 导出 students-xls', () => req('GET', '/school-admin/export/students-xls', { token: sadToken })],
    ]
    for (const [name, fn] of C) {
      const rr = await fn()
      ok(name, rr.status < 400, `status=${rr.status} msg=${String(rr.data?.message || '').slice(0, 50)}`)
    }
  }

  // ---------- 3. 教师登录 + 权限边界 ----------
  log('\n[3] 教师登录与权限边界')
  r = await req('POST', '/auth/unified-login', { body: { username: 'ht_px9', password: 'Teacher123' } })
  const headToken = r.data?.token
  ok('S3-1 已有班主任登录', !!headToken, `status=${r.status}`)
  if (headToken) {
    r = await req('GET', '/auth/me', { token: headToken })
    ok('S3-2 教师 /auth/me role=teacher', r.data?.role === 'teacher', `role=${r.data?.role}`)
    r = await req('GET', '/classes?take=500', { token: headToken })
    ok('S3-3 GET /classes', r.status < 400, `status=${r.status} count=${(r.data?.items || []).length}`)
    r = await req('GET', '/semesters?take=50', { token: headToken })
    ok('S3-4 GET /semesters', r.status < 400, `status=${r.status}`)
    r = await req('GET', '/users/me', { token: headToken })
    ok('S3-5 GET /users/me', r.status < 400 && !!r.data?.id, `status=${r.status}`)
    r = await req('GET', '/config/public', { token: headToken })
    ok('S3-6 GET /config/public', r.status < 400, `status=${r.status}`)
  }

  // ---------- 4. 越权 / 鉴权边界 ----------
  log('\n[4] 越权 / 鉴权边界')
  const G = [
    ['S4-1 未登录访问 /classes → 401', () => req('GET', '/classes'), 401],
    ['S4-2 教师访问超管 /admin/schools → 403', () => req('GET', '/admin/schools', { token: headToken }), 403],
    ['S4-3 教师访问校管 /school-admin/dashboard → 403', () => req('GET', '/school-admin/dashboard', { token: headToken }), 403],
    ['S4-4 校管访问超管 /admin/schools → 403', () => req('GET', '/admin/schools', { token: sadToken }), 403],
    ['S4-5 错误密码登录被拒', () => req('POST', '/auth/unified-login', { body: { username: 'admin', password: 'wrong-xyz' } }), null],
  ]
  for (const [name, fn, expect] of G) {
    const rr = await fn()
    if (expect === null) ok(name, rr.status === 401 || rr.status === 400, `status=${rr.status}`)
    else ok(name, rr.status === expect, `status=${rr.status} (期望${expect}) msg=${String(rr.data?.message || '').slice(0, 40)}`)
  }

  // ---------- 5. 并发吞吐 ----------
  log('\n[5] 并发吞吐（120 并发轻请求）')
  const pool = new Pool(30)
  const tasks = []
  for (let i = 0; i < 120; i++) {
    tasks.push(pool.add(async () => {
      await req('GET', i % 3 === 0 ? '/health' : '/admin/schools?take=5', { token: superToken })
    }))
  }
  const tP2 = Date.now()
  await Promise.all(tasks)
  const p2ms = Date.now() - tP2
  const p2 = { total: 120, ms: p2ms, reqs: (120000 / p2ms).toFixed(0), '429': stats.byStatus[429] || 0, '5xx': (stats.byStatus[500] || 0) + (stats.byStatus[502] || 0) + (stats.byStatus[503] || 0) }
  log(`  120 并发 / ${p2ms}ms = ${p2.reqs} req/s（429=${p2['429']} 5xx=${p2['5xx']}）`)
  ok('S5-1 并发无 429', p2['429'] === 0, `429=${p2['429']}`)
  ok('S5-2 并发无 5xx', p2['5xx'] === 0, `5xx=${p2['5xx']}`)

  // ---------- 6. 登录限流（10/min） ----------
  log('\n[6] 登录限流')
  let hits = 0
  for (let i = 0; i < 12; i++) {
    const rr = await req('POST', '/auth/unified-login', { body: { username: 'ht_px9', password: 'Teacher123' } })
    if (rr.status === 429) hits++
  }
  ok('S6-1 登录限流触发(429)', hits >= 1, `429=${hits}/12`)
  await new Promise((r) => setTimeout(r, 1000))

  // ---------- 7. Schema 漂移复现 ----------
  log('\n[7] Schema 漂移复现（建班/建生）')
  r = await req('POST', '/school-admin/classes/batch', { token: sadToken, body: { classes: [{ name: '扫描班', grade: '一年级', classNo: '1', headTeacher: '探测班主任', term: '2026春' }] } })
  const clsErr = String(r.data?.results?.[0]?.error || r.data?.message || '').slice(0, 120)
  ok('S7-1 建班', r.status < 400 && r.data?.success === 1, `status=${r.status} ${clsErr}`, true)

  // ---------- 汇总 ----------
  dumpStats('扫描')
  const m = msStats()
  const result = {
    generatedAt: new Date().toISOString(),
    env: process.env.BASE || 'https://tec-work-283329-8-1440166408.sh.run.tcloudbase.com/api/v1',
    summary: { pass: T.pass, fail: T.fail, blocked: T.blocked, total: T.cases.length },
    latency: m,
    concurrency: p2,
    loginRateLimit429: hits,
    schemaBlocker: clsErr,
    cases: T.cases,
  }
  writeFileSync(join(__dirname, '.cloud-sweep-result.json'), JSON.stringify(result, null, 2))
  log(`\n=== 扫描结束: 通过 ${T.pass} / 失败 ${T.fail} / 阻塞 ${T.blocked} / 共 ${T.cases.length}，总耗时 ${((Date.now() - t0) / 1000).toFixed(1)}s ===`)
  log(`结果已写入 test/cloud/.cloud-sweep-result.json`)
  process.exit(T.fail ? 1 : 0)
}

main().catch((e) => { console.error('扫描失败:', e); process.exit(1) })
