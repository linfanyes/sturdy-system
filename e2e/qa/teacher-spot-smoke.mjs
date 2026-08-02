// 教师端核心路由快速抽样冒烟（替代全量遍历，避免长连接页面卡死）
// 用法: node e2e/qa/teacher-spot-smoke.mjs
import puppeteer from 'puppeteer-core'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const env = JSON.parse(fs.readFileSync(path.join(__dirname, 'qa-env.json'), 'utf8'))
const BASE = process.env.SMOKE_BASE_URL || 'http://localhost:5201'
const EDGE = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'

// 代表性核心路由（覆盖各功能域）
const ROUTES = [
  '/teacher', '/teacher/notifications', '/teacher/profile', '/teacher/config', '/teacher/todos', '/teacher/notes',
  '/teacher/schedule', '/teacher/notices', '/teacher/classes', '/teacher/students', '/teacher/exams', '/teacher/grades',
  '/teacher/attendance', '/teacher/homework', '/teacher/rewards', '/teacher/score-records', '/teacher/leaderboard',
  '/teacher/parent-contacts', '/teacher/ai-chat', '/teacher/work-log', '/teacher/gallery', '/teacher/class-finance',
  '/teacher/checkin', '/teacher/growth', '/teacher/textbook', '/teacher/resource-library', '/teacher/toolbox',
  '/teacher/games', '/teacher/duty-roster', '/teacher/teaching-calendar',
]

const results = []
const browser = await puppeteer.launch({ executablePath: EDGE, headless: true, args: ['--no-sandbox'] })
const page = await browser.newPage()
const errors = []
page.on('pageerror', (e) => errors.push('pageerror: ' + String(e).slice(0, 120)))
page.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text().slice(0, 120)) })

async function login() {
  await page.goto(`${BASE}/#/login`, { waitUntil: 'domcontentloaded', timeout: 30000 })
  await page.waitForSelector('input[placeholder*="用户名"]', { timeout: 20000 })
  await page.type('input[placeholder*="用户名"]', 'qa_teacher')
  await page.type('input[placeholder*="密码"]', env.password)
  await page.click('button[type="submit"]')
  await page.waitForFunction(() => !location.hash.startsWith('#/login'), { timeout: 20000 })
  await new Promise((r) => setTimeout(r, 1500))
}
await login()
console.log('✔ 教师登录成功，抽样', ROUTES.length, '条路由\n')

for (const route of ROUTES) {
  errors.length = 0
  try {
    await page.evaluate((r) => { window.location.hash = r }, route)
    await page.waitForFunction(() => {
      const el = document.querySelector('#app')
      return el && el.textContent && el.textContent.trim().length > 0
    }, { timeout: 10000 })
    await new Promise((r) => setTimeout(r, 900))
    const textLen = await page.evaluate(() => document.querySelector('#app')?.textContent?.trim().length || 0)
    const ok = textLen > 0 && errors.length === 0
    results.push({ route, ok, textLen, errors: [...errors] })
    console.log(ok ? '  ✅' : '  ⚠️', route, 'textLen=' + textLen, errors.slice(0, 1).join(' | '))
  } catch (e) {
    results.push({ route, ok: false, textLen: 0, errors: ['TIMEOUT/ERR: ' + String(e).slice(0, 80)] })
    console.log('  ❌', route, String(e).slice(0, 100))
  }
}
await browser.close()

const pass = results.filter((r) => r.ok).length
console.log(`\n═══════ 教师抽样: ${pass}/${results.length} 通过 (${(pass / results.length * 100).toFixed(1)}%) ═══════`)
const out = path.join(__dirname, '..', '..', 'deliverables', 'teacher-spot-smoke.json')
fs.writeFileSync(out, JSON.stringify({ at: new Date().toISOString(), base: BASE, total: results.length, passed: pass, results }, null, 2))
console.log('✔ 结果写入', out)
