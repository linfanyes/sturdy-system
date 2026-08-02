// 浏览器启动器：CI 与本地共用
//
// 可执行文件解析优先级：
//   1. SMOKE_BROWSER_PATH 环境变量（本地想复用已装的 Edge/Chrome 时最省事）
//   2. 完整版 puppeteer 自带的 Chrome（CI 里 `npm ci` 会自动下载）
//   3. 各平台常见安装路径兜底
// 这样 CI 无需额外配置，本地也不必为跑一次冒烟下载 150MB 浏览器。
import fs from 'node:fs'
import os from 'node:os'

const CANDIDATES = {
  win32: [
    'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
    'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
    'C:/Program Files/Google/Chrome/Application/chrome.exe',
    'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
  ],
  linux: [
    '/usr/bin/google-chrome',
    '/usr/bin/google-chrome-stable',
    '/usr/bin/chromium',
    '/usr/bin/chromium-browser',
    '/usr/bin/microsoft-edge',
  ],
  darwin: [
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge',
    '/Applications/Chromium.app/Contents/MacOS/Chromium',
  ],
}

/** 动态载入 puppeteer 或 puppeteer-core（两者 launch API 一致） */
async function loadPuppeteer() {
  const errors = []
  for (const pkg of ['puppeteer', 'puppeteer-core']) {
    try {
      const mod = await import(pkg)
      return { puppeteer: mod.default || mod, pkg }
    } catch (e) {
      errors.push(`${pkg}: ${e.message}`)
    }
  }
  throw new Error(
    '未找到 puppeteer / puppeteer-core，请在 e2e 目录执行 npm install。\n' + errors.join('\n'),
  )
}

/** 解析浏览器可执行文件路径；返回 '' 表示交给 puppeteer 用自带 Chrome */
function resolveExecutable(puppeteer, pkg) {
  const fromEnv = process.env.SMOKE_BROWSER_PATH
  if (fromEnv) {
    if (!fs.existsSync(fromEnv)) {
      throw new Error(`SMOKE_BROWSER_PATH 指向的文件不存在: ${fromEnv}`)
    }
    return fromEnv
  }
  // 完整版 puppeteer：优先用它自己下载的 Chrome，版本与 API 最匹配
  if (pkg === 'puppeteer' && typeof puppeteer.executablePath === 'function') {
    try {
      const p = puppeteer.executablePath()
      if (p && fs.existsSync(p)) return p
    } catch {
      /* 未下载则继续往下兜底 */
    }
  }
  for (const p of CANDIDATES[os.platform()] || []) {
    if (fs.existsSync(p)) return p
  }
  if (pkg === 'puppeteer') return '' // 让 puppeteer 自行决定
  throw new Error(
    `未找到可用的 Chromium 内核浏览器（平台 ${os.platform()}）。\n` +
      '请设置 SMOKE_BROWSER_PATH，或在 e2e 目录安装完整版 puppeteer。',
  )
}

/** 启动无头浏览器 */
export async function launchBrowser() {
  const { puppeteer, pkg } = await loadPuppeteer()
  const executablePath = resolveExecutable(puppeteer, pkg)
  const opts = {
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-gpu',
      '--disable-dev-shm-usage', // CI 容器 /dev/shm 通常只有 64MB，不加会随机崩
      '--disable-features=IsolateOrigins,site-per-process',
    ],
  }
  if (executablePath) opts.executablePath = executablePath
  const browser = await puppeteer.launch(opts)
  return { browser, executablePath: executablePath || '(puppeteer bundled)' }
}
