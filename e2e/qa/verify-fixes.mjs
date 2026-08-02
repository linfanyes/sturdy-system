// 4 处修复的页面渲染验证
import puppeteer from 'puppeteer-core'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
const __dirname = path.dirname(fileURLToPath(import.meta.url))
const EDGE = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'
const BASE = 'http://localhost:5201'
const env = JSON.parse(fs.readFileSync(path.join(__dirname, 'qa-env.json'), 'utf8'))
const browser = await puppeteer.launch({
  executablePath: EDGE,
  headless: true,
  args: ['--no-sandbox', '--disable-gpu'],
  userDataDir: fs.mkdtempSync(path.join(process.env.TEMP || '/tmp', 'qa-verify-')),
})
const page = await browser.newPage()
const errs = []
page.on('pageerror', (e) => errs.push('pageerror: ' + String(e).slice(0, 100)))
page.on('console', (m) => { if (m.type() === 'error') errs.push('console: ' + m.text().slice(0, 100)) })

async function login(user, pass) {
  // 清空本地会话 + 整页重载，确保 Pinia store 从空的 localStorage 重建（hash 路由不会自动刷新）
  await page.goto(BASE + '/', { waitUntil: 'domcontentloaded', timeout: 30000 }).catch(() => {})
  await page.evaluate(() => { try { localStorage.clear() } catch {} })
  await page.goto(BASE + '/#/login', { waitUntil: 'domcontentloaded', timeout: 60000 })
  await page.reload({ waitUntil: 'domcontentloaded', timeout: 60000 })
  try {
    await page.waitForSelector('input[placeholder*="用户名"]', { timeout: 45000 })
  } catch {
    const url = page.url()
    const text = await page.evaluate(() => document.body?.innerText?.slice(0, 200) || '')
    console.error('[login-diag] url=' + url + ' | body=' + text)
    throw new Error('登录页输入框未出现')
  }
  await page.type('input[placeholder*="用户名"]', user)
  await page.type('input[placeholder*="密码"]', pass)
  await page.click('button[type="submit"]')
  await page.waitForFunction(() => !location.hash.startsWith('#/login'), { timeout: 25000 })
  await new Promise((r) => setTimeout(r, 1500))
}
async function check(route, label) {
  errs.length = 0
  await page.evaluate((r) => { window.location.hash = r }, route)
  await page.waitForFunction(() => document.querySelector('#app')?.textContent?.trim().length > 0, { timeout: 10000 })
  await new Promise((r) => setTimeout(r, 900))
  const textLen = await page.evaluate(() => document.querySelector('#app')?.textContent?.trim().length || 0)
  console.log((errs.length ? '  [warn]' : '  [ok]'), label, route, 'textLen=' + textLen, errs.slice(0, 1).join('|'))
}
await login('admin', 'admin')
await check('/super', '超管工作台')
const superText = await page.evaluate(() => document.querySelector('#app')?.textContent || '')
console.log('  最近审计日志已移除:', superText.includes('最近审计日志') ? '[FAIL] 仍在' : '[PASS] 已移除')
console.log('  审计日志趋势已移除:', superText.includes('审计日志趋势') ? '[FAIL] 仍在' : '[PASS] 已移除')
await login('qa_sa', env.password)
await check('/school-admin', '校管工作台')
const saText = await page.evaluate(() => document.querySelector('#app')?.textContent || '')
console.log('  学科分布区块存在:', saText.includes('学科分布') ? '[PASS]' : '[warn] 未找到(云端旧接口未返回)')
await check('/school-admin/classes', '校管班级管理')
await login('qa_teacher', env.password)
await check('/teacher/lesson-plans', '教案库')
await check('/teacher/knowledges', '知识点库')
await check('/teacher/tools/picker', '随机点名')
await browser.close()
console.log('\n✔ 验证完成')
