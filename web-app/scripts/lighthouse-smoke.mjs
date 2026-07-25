/**
 * 真实浏览器冒烟 + Lighthouse 性能基线
 * ---------------------------------------------------------------
 * 复用系统已装的 Microsoft Edge（Chromium 内核），不下载额外浏览器。
 * - 冒烟：用 Playwright 加载页面，校验 SPA 挂载、标题、关键元素、控制台错误、截图。
 * - Lighthouse：自行拉起 Edge 调试端口，连接后跑 CWV（性能/无障碍/最佳实践/SEO）。
 *
 * 用法：
 *   node scripts/lighthouse-smoke.mjs <URL> <OUTPUT_DIR>
 * 例：
 *   node scripts/lighthouse-smoke.mjs http://127.0.0.1:4173/ .
 *
 * 依赖解析：优先项目 node_modules，其次受管 node workspace（沙箱用）。
 */
import { createRequire } from 'module'
import * as fs from 'fs'
import * as path from 'path'
import * as os from 'os'
import { spawn, execSync } from 'child_process'

const require = createRequire(import.meta.url)

// 沙箱受管 workspace 的 node_modules（CI 中若已装 devDep 则走项目路径，无需此项）
const WS_NM = 'C:\\Users\\linfa\\.workbuddy\\binaries\\node\\workspace\\node_modules'

function loadPkg(name) {
  const resolvers = [
    () => require.resolve(name),
    () => require.resolve(name, { paths: [WS_NM] }),
    () => require.resolve(name, { paths: [path.join(WS_NM, 'lighthouse', 'node_modules')] }),
  ]
  for (const r of resolvers) {
    try {
      return require(r())
    } catch (e) {
      /* try next */
    }
  }
  throw new Error(`无法解析模块 "${name}"，请先安装：npm i -D ${name}`)
}

const lighthouseMod = loadPkg('lighthouse')
const lighthouse = typeof lighthouseMod === 'function' ? lighthouseMod : lighthouseMod.default
const { chromium } = loadPkg('playwright')

// 系统 Edge 可执行文件（Git Bash: /c/Program Files (x86)/Microsoft/Edge/Application/msedge.exe）
const EDGE =
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe'

const URL = process.argv[2] || 'http://127.0.0.1:4173/'
const OUT = process.argv[3] || '.'

function log(...a) {
  console.log('[lighthouse-smoke]', ...a)
}

// 找一个空闲端口并拉起独立的 Edge 无头实例（独立 userDataDir 避免被系统 Edge 单例接管）
async function launchEdge() {
  const port = 9200 + Math.floor(Math.random() * 100)
  const userDataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'edge-lh-'))
  const proc = spawn(
    EDGE,
    [
      '--headless=new',
      '--no-sandbox',
      '--disable-gpu',
      '--disable-dev-shm-usage',
      '--no-first-run',
      '--no-default-browser-check',
      `--remote-debugging-port=${port}`,
      `--user-data-dir=${userDataDir}`,
      'about:blank',
    ],
    { stdio: 'ignore', detached: false }
  )

  // 轮询 DevTools 端点直到就绪
  const endpoint = `http://127.0.0.1:${port}/json/version`
  const deadline = Date.now() + 20000
  while (Date.now() < deadline) {
    try {
      const res = await fetch(endpoint)
      if (res.ok) {
        log('Edge 调试端口就绪:', port)
        return { proc, port, userDataDir }
      }
    } catch (e) {
      /* not ready */
    }
    await new Promise((r) => setTimeout(r, 300))
  }
  try {
    proc.kill('SIGKILL')
  } catch (e) {}
  throw new Error('Edge 调试端口在 20s 内未就绪')
}

async function killEdge({ proc, port }) {
  try {
    proc.kill('SIGKILL')
  } catch (e) {}
  // 兜底：释放端口占用（仅针对本拉起的 Edge 进程树）
  try {
    execSync(`taskkill /F /PID ${proc.pid}`, { stdio: 'ignore' })
  } catch (e) {}
}

async function smoke() {
  log('Playwright 冒烟 =>', URL)
  const browser = await chromium.launch({
    executablePath: EDGE,
    args: ['--no-sandbox', '--disable-gpu'],
  })
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } })
  const consoleErrors = []
  page.on('console', (m) => {
    if (m.type() === 'error') consoleErrors.push(m.text())
  })
  page.on('pageerror', (e) => consoleErrors.push('pageerror: ' + e.message))

  const started = Date.now()
  await page.goto(URL, { waitUntil: 'load', timeout: 30000 })
  await page.waitForFunction(
    () => {
      const el = document.getElementById('app')
      return el && el.childElementCount > 0
    },
    { timeout: 15000 }
  )
  const title = await page.title()
  const inputCount = await page.locator('input').count()
  const bodyText = (await page.textContent('body')) || ''
  const hasWelcome = /欢迎|园丁|登录|工作台/.test(bodyText)

  await page.screenshot({ path: path.join(OUT, 'lighthouse-smoke.png'), fullPage: false })
  await browser.close()

  const result = {
    ok: true,
    title,
    inputCount,
    hasWelcome,
    consoleErrorCount: consoleErrors.length,
    consoleErrors: consoleErrors.slice(0, 10),
    loadMs: Date.now() - started,
  }
  log('冒烟结果:', JSON.stringify(result, null, 2))
  return result
}

async function lighthouseRun(port) {
  log('Lighthouse 跑分 =>', URL, '(连接端口', port + ')')
  const opts = {
    logLevel: 'info',
    output: ['html', 'json'],
    onlyCategories: ['performance', 'accessibility', 'best-practices', 'seo'],
    port, // 连接已拉起的 Edge，不让 Lighthouse 自己再拉起
  }
  const runner = await lighthouse(URL, opts)
  const { report, lhr } = runner
  const html = report.find((r) => r.startsWith('<!')) || report[0]
  const json = report.find((r) => r.trim().startsWith('{')) || report[1]
  fs.writeFileSync(path.join(OUT, 'lighthouse-report.html'), html)
  fs.writeFileSync(path.join(OUT, 'lighthouse-report.json'), json)

  const scores = {}
  for (const [k, v] of Object.entries(lhr.categories)) {
    scores[k] = Math.round((v.score ?? 0) * 100)
  }
  log('Lighthouse 分数:', JSON.stringify(scores))
  return { scores, lhr }
}

;(async () => {
  let edge = null
  try {
    const smokeRes = await smoke()
    edge = await launchEdge()
    const lh = await lighthouseRun(edge.port)
    const summary = {
      smoke: {
        title: smokeRes.title,
        inputCount: smokeRes.inputCount,
        hasWelcome: smokeRes.hasWelcome,
        consoleErrorCount: smokeRes.consoleErrorCount,
        note: '无后端联调时出现的 404 等 API 报错属预期，不影响渲染冒烟。',
      },
      lighthouse: lh.scores,
    }
    fs.writeFileSync(
      path.join(OUT, 'lighthouse-summary.json'),
      JSON.stringify(summary, null, 2)
    )
    log('完成。报告: lighthouse-report.html / lighthouse-report.json / lighthouse-summary.json / lighthouse-smoke.png')
  } catch (e) {
    console.error('[lighthouse-smoke] 失败:', e)
    process.exitCode = 1
  } finally {
    if (edge) await killEdge(edge)
  }
})()
