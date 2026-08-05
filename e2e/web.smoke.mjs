#!/usr/bin/env node
// 园丁工作台 · Web 端全路由冒烟
//
// 用法:
//   node e2e/web.smoke.mjs
//   SMOKE_BASE_URL=http://localhost:4173 SMOKE_STRICT=1 node e2e/web.smoke.mjs
//
// 环境变量:
//   SMOKE_BASE_URL     被测前端地址（默认 http://localhost:4173，即 vite preview）
//   SMOKE_API_BASE     后端 API 根（默认取云托管地址，用于探活与临时账号管理）
//   SMOKE_SUPER_USER/PASS      超管账号（默认 admin/admin）
//   SMOKE_TEACHER_USER/PASS    教师账号（默认 teacher1/123456）
//   SMOKE_SA_USER/PASS         校管账号；不可用时自动用超管接口临时创建并在结束时删除
//   SMOKE_STRICT=1     把 console 错误也判为失败（CI 建议开启）
//   SMOKE_ROLES        只跑指定角色，逗号分隔，如 super,teacher
//   SMOKE_SETTLE       每路由等待毫秒（默认 1400）
//   SMOKE_BROWSER_PATH 指定浏览器可执行文件
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { runSmoke, sleep } from './lib/runner.mjs'
import { writeReports, renderText } from './lib/report.mjs'
import { extractWebRoutes, groupRoutesByRole } from './lib/extract-routes.mjs'
import { ensureSchoolAdmin, waitForBackend } from './lib/provision.mjs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..')

const BASE = (process.env.SMOKE_BASE_URL || 'http://localhost:4173').replace(/\/$/, '')
const API_BASE = (
  process.env.SMOKE_API_BASE || 'https://tec-work-283329-8-1440166408.sh.run.tcloudbase.com/api'
).replace(/\/$/, '')
const STRICT = process.env.SMOKE_STRICT === '1'
const SETTLE = Number(process.env.SMOKE_SETTLE) || 1400
const ROLE_FILTER = (process.env.SMOKE_ROLES || '').split(',').map((s) => s.trim()).filter(Boolean)

/** Web 端登录：走真实登录表单，确保守卫/存储/拦截器链路都被覆盖 */
async function login(page, cfg) {
  await page.goto(`${BASE}/#/login`, { waitUntil: 'domcontentloaded', timeout: 30000 })
  await page.waitForSelector('input[placeholder*="用户名"]', { timeout: 20000 })
  await page.type('input[placeholder*="用户名"]', cfg.user)
  await page.type('input[placeholder*="密码"]', cfg.pass)
  await page.click('button[type="submit"]')
  // 等待跳出登录页；失败时抛错，避免后面 160 条路由白跑
  await page
    .waitForFunction(() => !location.hash.startsWith('#/login'), { timeout: 20000 })
    .catch(() => {
      throw new Error(`登录未跳转，账号 ${cfg.user} 可能不可用`)
    })
  await sleep(1200) // 等仪表盘首屏接口回来
}

const goto = async (page, route) => {
  await Promise.race([
    page.evaluate((r) => {
      window.location.hash = r
    }, route),
    new Promise((resolve) =>
      setTimeout(() => {
        console.warn(`WARN: Timeout visiting ${route}`)
        resolve()
      }, 5000)
    ),
  ])
}

const currentRoute = (page) => page.evaluate(() => location.hash.replace(/^#/, '').split('?')[0])

async function main() {
  console.log(`[smoke] 前端: ${BASE}`)
  console.log(`[smoke] 后端: ${API_BASE}`)
  await waitForBackend(API_BASE)
  console.log('[smoke] 后端探活通过')

  // 校管账号：环境里未必预置，自动兜底创建
  const sa = await ensureSchoolAdmin(API_BASE, {
    superUser: process.env.SMOKE_SUPER_USER || 'admin',
    superPass: process.env.SMOKE_SUPER_PASS || 'admin',
    preferUser: process.env.SMOKE_SA_USER || '',
    preferPass: process.env.SMOKE_SA_PASS || '',
  })
  console.log(`[smoke] 校管账号: ${sa.user}${sa.created ? '（临时创建，结束后自动删除）' : '（复用已有）'}`)

  const flat = extractWebRoutes(path.join(ROOT, 'web-app/src/router/index.ts'))
  const byRole = groupRoutesByRole(flat)
  console.log(
    `[smoke] 自动提取路由: super=${byRole.super.length} ` +
      `school_admin=${byRole.school_admin.length} teacher=${byRole.teacher.length}`,
  )

  let roles = [
    {
      role: 'super',
      user: process.env.SMOKE_SUPER_USER || 'admin',
      pass: process.env.SMOKE_SUPER_PASS || 'admin',
      routes: byRole.super,
    },
    { role: 'school_admin', user: sa.user, pass: sa.pass, routes: byRole.school_admin },
    {
      role: 'teacher',
      user: process.env.SMOKE_TEACHER_USER || 'teacher1',
      pass: process.env.SMOKE_TEACHER_PASS || '123456',
      routes: byRole.teacher,
    },
  ]
  if (ROLE_FILTER.length) roles = roles.filter((r) => ROLE_FILTER.includes(r.role))

  console.error('[smoke] DEBUG: before runSmoke, roles=', roles.map(r=>r.role))
  let report
  try {
    report = await runSmoke({
      title: '园丁工作台 Web 端冒烟',
      base: BASE,
      roles,
      login,
      goto,
      currentRoute,
      settle: SETTLE,
      strict: STRICT,
      minTextLen: 20,
    })
  } catch (e) {
    console.error('[smoke] runSmoke threw:', e)
    throw e
  } finally {
    await sa.cleanup()
    if (sa.created) console.log('[smoke] 临时校管账号已清理')
  }

  console.error('[smoke] DEBUG report type:', typeof report, 'keys:', report ? Object.keys(report) : 'null')
  const files = writeReports(report, path.join(__dirname, 'reports'), 'web-smoke')
  console.log('\n' + renderText(report))
  console.log(`\n[smoke] 报告: ${files.txt}\n         ${files.json}\n         ${files.xml}`)

  if (report.totals.fail > 0) {
    console.error(`\n[smoke] 失败 ${report.totals.fail} 条，退出码 1`)
    process.exit(1)
  }
  console.log('\n[smoke] 全部通过')
}

main().catch((e) => {
  console.error('[smoke] 执行崩溃:', e)
  process.exit(1)
})
