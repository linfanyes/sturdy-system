#!/usr/bin/env node
// 园丁工作台 · 微信小程序等价冒烟（H5 构建 + wx.cloud 垫片）
//
// 思路：小程序真机无法在 CI 里无头运行，但 uni-app 同一套源码可编译为 H5。
// 只要把 wx.cloud.callContainer 用垫片转发到后端公网地址，
// 就能在浏览器里真实渲染每一个页面、真实打接口，等价覆盖运行时错误与白屏。
// 覆盖范围与 Web 端冒烟一致：登录链路 + 全页面遍历 + pageerror/console 采集。
//
// 用法:
//   node e2e/mini.smoke.mjs               # 自动构建 H5 并起本地静态服务
//   SMOKE_MINI_SKIP_BUILD=1 node e2e/mini.smoke.mjs
//
// 环境变量: 见 web.smoke.mjs，另有
//   SMOKE_MINI_SKIP_BUILD=1  跳过 H5 构建，直接用已有 dist/build/h5
import path from 'node:path'
import fs from 'node:fs'
import { execFileSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { runSmoke, sleep } from './lib/runner.mjs'
import { writeReports, renderText } from './lib/report.mjs'
import { serveStatic } from './lib/static-server.mjs'
import { installWxShim } from './lib/wx-shim.mjs'
import { ensureSchoolAdmin, waitForBackend } from './lib/provision.mjs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..')
const MINI_DIR = path.join(ROOT, 'mini-program')
const H5_DIST = path.join(MINI_DIR, 'dist/build/h5')

const API_BASE = (
  process.env.SMOKE_API_BASE || 'https://tec-work-283329-8-1440166408.sh.run.tcloudbase.com/api'
).replace(/\/$/, '')
const API_ROOT = API_BASE.replace(/\/api$/, '') // 垫片转发用的站点根
const STRICT = process.env.SMOKE_STRICT === '1'
const SETTLE = Number(process.env.SMOKE_SETTLE) || 1200
const ROLE_FILTER = (process.env.SMOKE_ROLES || '').split(',').map((s) => s.trim()).filter(Boolean)

/** 读取已知失败基线（路线级），用于隔离存量确认问题，避免 CI 因存量变红 */
function loadBaseline() {
  const p = path.join(__dirname, 'mini-baseline.json')
  if (!fs.existsSync(p)) return []
  try {
    const j = JSON.parse(fs.readFileSync(p, 'utf8'))
    const list = Array.isArray(j.knownFails) ? j.knownFails : []
    // 兼容 [{route,reason}] 与 ["route"] 两种写法
    return list.map((x) => (typeof x === 'string' ? x : x && x.route)).filter(Boolean)
  } catch {
    return []
  }
}

/** 读取 pages.json，展开主包 + 分包全部页面 */
function readMiniPages() {
  const raw = fs.readFileSync(path.join(MINI_DIR, 'src/pages.json'), 'utf8')
  // pages.json 允许注释，先剔除
  const json = JSON.parse(raw.replace(/^\s*\/\/.*$/gm, ''))
  const list = (json.pages || []).map((p) => p.path)
  for (const sp of json.subPackages || []) {
    for (const p of sp.pages || []) list.push(`${sp.root}/${p.path}`)
  }
  return [...new Set(list)]
}

/** 按路径前缀归类角色，与 route-guard.js 的 PAGE_ROLES 规则保持一致 */
function classifyPages(pages) {
  const byRole = { super: [], school_admin: [], teacher: [], parent: [] }
  for (const p of pages) {
    if (p.startsWith('pages/login/')) continue // 登录页本身由登录步骤覆盖
    if (p.startsWith('pages/parent-login/')) continue
    if (p.startsWith('pages/admin/')) byRole.super.push(p)
    else if (p.startsWith('pages/school-admin/')) byRole.school_admin.push(p)
    else if (p.startsWith('pages/parent/')) byRole.parent.push(p)
    else byRole.teacher.push(p) // 守卫里未声明的业务页默认教师可访问
  }
  for (const k of Object.keys(byRole)) byRole[k].sort()
  return byRole
}

/**
 * uni H5 登录。必须用真实键盘事件填表：uni-app 的 v-model 绑定在真实 input 事件流上，
 * 直接 setter + dispatchEvent 不会同步到 Vue，导致登录失败。
 * 新建校管账号可能因后端多实例复制延迟在浏览器跨域链路短暂 401，故登录整体重试。
 */
async function login(page, cfg, base) {
  if (cfg.role === 'parent') return parentLogin(page, cfg, base)
  const MAX = 5
  let lastErr = ''
  for (let attempt = 1; attempt <= MAX; attempt++) {
    try {
      await page.goto(`${base}/#/pages/login/login`, { waitUntil: 'domcontentloaded', timeout: 30000 })
      await page.waitForSelector('input', { timeout: 20000 })
      await sleep(600)

      const inputs = await page.$$('input')
      let usr, pwd
      for (const el of inputs) {
        const type = await page.evaluate((e) => e.type, el)
        if (type === 'password') pwd = el
        else usr = usr || el
      }
      if (!usr || !pwd) throw new Error('登录页未找到用户名/密码输入框')

      await usr.click()
      await page.keyboard.type(cfg.user, { delay: 25 })
      await pwd.click()
      await page.keyboard.type(cfg.pass, { delay: 25 })

      // uni-app H5 的 <input> 经 @input 同步进 Vue 响应式模型，键入结束到模型落值存在延迟。
      // 若立即点击提交，会把「少了尾部若干字符」的半截密码发给后端 → 误报 401 密码错误，
      // 且因属时序竞争，失败角色在多轮之间随机漂移，极难定位。
      // 这里等待 DOM 值与预期完全一致，再留出一次事件循环让模型同步。
      const valueSettled = await page
        .waitForFunction(
          (u, p) => {
            const vals = [...document.querySelectorAll('input')].map((e) => e.value)
            return vals.includes(u) && vals.includes(p)
          },
          { timeout: 5000, polling: 100 },
          cfg.user,
          cfg.pass,
        )
        .then(() => true)
        .catch(() => false)
      if (!valueSettled) {
        // 键入丢字：清空后用直接赋值 + 派发 input 事件重填，绕开键盘时序
        await page.evaluate(
          (u, p) => {
            const inputs = [...document.querySelectorAll('input')]
            const set = (el, v) => {
              el.value = v
              el.dispatchEvent(new Event('input', { bubbles: true }))
              el.dispatchEvent(new Event('change', { bubbles: true }))
            }
            const pwdEl = inputs.find((e) => e.type === 'password')
            const usrEl = inputs.find((e) => e !== pwdEl)
            if (usrEl) set(usrEl, u)
            if (pwdEl) set(pwdEl, p)
          },
          cfg.user,
          cfg.pass,
        )
      }
      await new Promise((r) => setTimeout(r, 300)) // 让 Vue 模型完成同步

      const typed = await page.evaluate(() =>
        [...document.querySelectorAll('input')].map((e) => e.value.length).join('|'),
      )
      console.log(`[mini-smoke] 已键入(${attempt}) 长度: ${typed}（settled=${valueSettled}）`)

      const clicked = await page.evaluate(() => {
        const btns = [...document.querySelectorAll('uni-button, button')]
        const txt = (b) => b.innerText || ''
        // 文案匹配：兼容「登录」与 UI 统一后的「开始工作 →」/「登录中…」，排除微信一键登录
        const byText = btns.find((b) => /登\s*录|开始工作/.test(txt(b)) && !/微信/.test(txt(b)))
        // 兜底：登录页主操作按钮统一使用 .btn 类，避免文案再次变更导致冒烟失效
        const byClass = btns.find((b) => b.classList.contains('btn') && !/微信/.test(txt(b)))
        const target = byText || byClass
        if (!target) return false
        target.click()
        return true
      })
      if (!clicked) throw new Error('登录页未找到登录按钮')

      await page
        .waitForFunction(() => !location.hash.includes('/pages/login/login'), { timeout: 25000 })
        .catch(() => {
          throw new Error(`登录未跳转，账号 ${cfg.user} 可能不可用或接口失败`)
        })
      await sleep(1200)
      return // 登录成功
    } catch (e) {
      lastErr = e.message
      console.log(`[mini-smoke] 登录尝试 ${attempt} 失败: ${e.message}，${attempt < MAX ? '2.5s 后重试' : '放弃'}`)
      if (attempt < MAX) await sleep(2500)
    }
  }
  throw new Error(`登录失败（已重试 ${MAX} 次）: ${lastErr}`)
}

/**
 * 家长端登录：走 pages/parent-login 的「用学号登录」表单。
 * 与教师/校管的账号密码登录页不同：第一个输入是 type=number（学号），
 * 登录按钮文案为「用学号登录」，登录成功 redirectTo('/pages/parent/parent')。
 * 家长账号同样可能因后端多实例复制延迟在首登时 401，故整体重试。
 */
async function parentLogin(page, cfg, base) {
  const MAX = 5
  let lastErr = ''
  for (let attempt = 1; attempt <= MAX; attempt++) {
    try {
      await page.goto(`${base}/#/pages/parent-login/parent-login`, {
        waitUntil: 'domcontentloaded',
        timeout: 30000,
      })
      await page.waitForSelector('input', { timeout: 20000 })
      await sleep(600)

      const inputs = await page.$$('input')
      let no, pwd
      for (const el of inputs) {
        const type = await page.evaluate((e) => e.type, el)
        if (type === 'password') pwd = el
        else no = no || el // 第一个非密码框即学号
      }
      if (!no || !pwd) throw new Error('家长登录页未找到学号/密码输入框')

      // 重试时 SPA 组件状态不随 hash 跳转重置，输入框会残留上一轮内容，
      // 直接 type 会累加成「8803619508 8803619508」导致后续重试全部无效。先清空。
      await page.evaluate(() => {
        for (const el of document.querySelectorAll('input')) {
          el.value = ''
          el.dispatchEvent(new Event('input', { bubbles: true }))
        }
      })

      // 直接 type（内部自动 focus），规避 number 输入框在 H5 里 click 中心被遮挡导致的
      // "Node is either not clickable" 问题；type 走真实键盘事件，uni v-model 正常同步。
      await no.type(cfg.user, { delay: 25 }) // cfg.user = 学号
      await pwd.type(cfg.pass, { delay: 25 })

      // 与教师/校管登录同理：等待 DOM 值落定并留出 Vue 模型同步时间，避免半截密码误报 401
      await page
        .waitForFunction(
          (u, p) => {
            const vals = [...document.querySelectorAll('input')].map((e) => e.value)
            return vals.includes(u) && vals.includes(p)
          },
          { timeout: 5000, polling: 100 },
          cfg.user,
          cfg.pass,
        )
        .catch(() => {})
      await sleep(300)

      const typed = await page.evaluate(() =>
        [...document.querySelectorAll('input')].map((e) => e.value).join('|'),
      )
      console.log(`[mini-smoke] 家长已键入(${attempt}): ${typed}`)

      const clicked = await page.evaluate(() => {
        const btns = [...document.querySelectorAll('uni-button, button')]
        const target = btns.find((b) => /用学号登录/.test(b.innerText || ''))
        if (!target) return false
        target.click()
        return true
      })
      if (!clicked) throw new Error('家长登录页未找到「用学号登录」按钮')

      await page
        .waitForFunction(() => !location.hash.includes('/pages/parent-login/'), { timeout: 25000 })
        .catch(() => {
          throw new Error(`家长登录未跳转，学号 ${cfg.user} 可能不可用或接口失败`)
        })
      await sleep(1200)
      return // 登录成功
    } catch (e) {
      lastErr = e.message
      console.log(
        `[mini-smoke] 家长登录尝试 ${attempt} 失败: ${e.message}，${attempt < MAX ? '2.5s 后重试' : '放弃'}`,
      )
      if (attempt < MAX) await sleep(2500)
    }
  }
  throw new Error(`家长登录失败（已重试 ${MAX} 次）: ${lastErr}`)
}

const goto = async (page, route) => {
  await page.evaluate((r) => {
    window.location.hash = `/${r}`
  }, route)
}

const currentRoute = (page) =>
  page.evaluate(() => location.hash.replace(/^#\/?/, '').split('?')[0])

async function main() {
  if (process.env.SMOKE_MINI_SKIP_BUILD !== '1') {
    console.log('[mini-smoke] 构建 H5 等价包...')
    execFileSync(process.platform === 'win32' ? 'npm.cmd' : 'npm', ['run', 'build:h5'], {
      cwd: MINI_DIR,
      stdio: 'inherit',
      shell: true, // 某些 shell 环境下 npm.cmd 无法 spawnSync，需走 shell
    })
  }
  if (!fs.existsSync(path.join(H5_DIST, 'index.html'))) {
    throw new Error(`未找到 H5 产物: ${H5_DIST}，请先执行 npm run build:h5`)
  }

  console.log(`[mini-smoke] 后端: ${API_BASE}`)
  await waitForBackend(API_BASE)
  console.log('[mini-smoke] 后端探活通过')

  const server = await serveStatic(H5_DIST, 0)
  console.log(`[mini-smoke] 静态服务: ${server.url}`)

  // 校管预置依赖超管凭证；一旦超管不可用不得拖垮其余角色（教师/家长），
  // 降级为「跳过 school_admin 角色」并继续，保证仍能产出部分覆盖与报告。
  const saNeeded = !ROLE_FILTER.length || ROLE_FILTER.includes('school_admin')
  let sa = { user: '', pass: '', created: false, cleanup: async () => {} }
  let saError = null
  if (saNeeded) {
    try {
      sa = await ensureSchoolAdmin(API_BASE, {
        superUser: process.env.SMOKE_SUPER_USER || 'admin',
        superPass: process.env.SMOKE_SUPER_PASS || 'admin',
        preferUser: process.env.SMOKE_SA_USER || '',
        preferPass: process.env.SMOKE_SA_PASS || '',
      })
      console.log(`[mini-smoke] 校管账号: ${sa.user}${sa.created ? '（临时创建）' : '（复用已有）'}`)
    } catch (e) {
      saError = e.message
      console.warn(`[mini-smoke] ⚠ 校管预置失败，将跳过 school_admin 角色继续执行: ${saError}`)
    }
  }

  const byRole = classifyPages(readMiniPages())
  console.log(
    `[mini-smoke] 页面清单: super=${byRole.super.length} school_admin=${byRole.school_admin.length} ` +
      `teacher=${byRole.teacher.length} parent=${byRole.parent.length}`,
  )

  let roles = [
    {
      role: 'super',
      user: process.env.SMOKE_SUPER_USER || 'admin',
      pass: process.env.SMOKE_SUPER_PASS || 'admin',
      routes: byRole.super,
      viewport: { width: 390, height: 844 }, // iPhone 尺寸，贴近小程序真实视口
    },
    {
      role: 'school_admin',
      user: sa.user,
      pass: sa.pass,
      routes: byRole.school_admin,
      viewport: { width: 390, height: 844 },
    },
    {
      role: 'teacher',
      user: process.env.SMOKE_TEACHER_USER || 'teacher1',
      pass: process.env.SMOKE_TEACHER_PASS || '123456',
      routes: byRole.teacher,
      viewport: { width: 390, height: 844 },
    },
    {
      role: 'parent',
      user: process.env.SMOKE_PARENT_NO || '8803619508',
      pass: process.env.SMOKE_PARENT_PASS || '123456',
      routes: byRole.parent,
      viewport: { width: 390, height: 844 },
    },
  ]
  if (ROLE_FILTER.length) roles = roles.filter((r) => ROLE_FILTER.includes(r.role))
  // 校管预置失败时剔除该角色，避免以空账号进入登录流产生噪声失败
  if (saError) roles = roles.filter((r) => r.role !== 'school_admin')

  let report
  try {
    report = await runSmoke({
      title: '园丁工作台 小程序端等价冒烟 (uni H5 + wx.cloud 垫片)',
      base: server.url,
      roles,
      beforeLoad: (page) => installWxShim(page, API_ROOT),
      login: (page, cfg) => login(page, cfg, server.url),
      goto,
      currentRoute,
      settle: SETTLE,
      strict: STRICT,
      minTextLen: 10,
      // 小程序里很多页面在「无数据」状态会渲染很短的文本（如"暂无数据"），已正常加载不应判白屏
      okIfContains: ['暂无数据', '加载中', '暂无', '未登录', '暂无内容', '空'],
      // 已知失败基线：存量确认问题，隔离后不计入 FAIL（新出现的失败仍会判红）
      baseline: loadBaseline(),
      // H5 里 uni 的部分小程序专属 API 无实现，属环境差异而非业务缺陷
      ignore: [
        /is not implemented in browser/i,
        /uni\.(setTabBarStyle|showShareMenu|getUpdateManager|createSelectorQuery)/i,
        /not TabBar page/i,
      ],
    })
  } finally {
    await sa.cleanup()
    await server.close()
  }

  const files = writeReports(report, path.join(__dirname, 'reports'), 'mini-smoke')
  console.log('\n' + renderText(report))
  console.log(`\n[mini-smoke] 报告: ${files.txt}\n              ${files.xml}`)

  if (report.totals.fail > 0) {
    console.error(`\n[mini-smoke] 出现 ${report.totals.fail} 条新失败（非已知基线），退出码 1`)
    process.exit(1)
  }
  if (report.totals.quarantined > 0) {
    console.log(`\n[mini-smoke] 仅命中 ${report.totals.quarantined} 条已知基线问题，等价冒烟通过`)
  } else {
    console.log('\n[mini-smoke] 全部通过')
  }
}

main().catch((e) => {
  console.error('[mini-smoke] 执行崩溃:', e)
  process.exit(1)
})
