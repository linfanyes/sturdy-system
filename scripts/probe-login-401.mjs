#!/usr/bin/env node
/**
 * 一次性诊断脚本：抓取 H5 等价冒烟中登录请求的真实报文。
 *
 * 背景：同一教师凭证 Node 直连 /auth/unified-login 返回 201，
 * 但浏览器（wx-shim 转发）返回 401。本脚本拦截该请求，
 * 打印实际发出的 URL / 方法 / 请求头 / 请求体 与响应状态 / 响应体，
 * 用于区分「请求构造错误」与「网关/CORS 拒绝」。
 *
 * 用法: node scripts/probe-login-401.mjs
 */
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { launchBrowser } from '../e2e/lib/browser.mjs'
import { serveStatic } from '../e2e/lib/static-server.mjs'
import { installWxShim } from '../e2e/lib/wx-shim.mjs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..')
const API_BASE =
  process.env.SMOKE_API_BASE ||
  'https://tec-work-283329-8-1440166408.sh.run.tcloudbase.com/api'
const H5_DIST = path.join(ROOT, 'mini-program/dist/build/h5')
const USER = process.env.SMOKE_TEACHER_USER || 'qa_teacher1_MSDGCIUN'
const PASS = process.env.SMOKE_TEACHER_PASS || 'Test@2026'

const server = await serveStatic(H5_DIST, 0)
const { browser } = await launchBrowser()
const page = await browser.newPage()
// 与 mini.smoke.mjs 一致：垫片接收的是站点根（不含 /api），否则会拼出 /api/api/...
const API_ROOT = API_BASE.replace(/\/api$/, '')
await installWxShim(page, API_ROOT)

page.on('request', (req) => {
  if (req.url().includes('/auth/unified-login')) {
    console.log('\n──── 请求 ────')
    console.log('URL   :', req.url())
    console.log('方法  :', req.method())
    console.log('请求头:', JSON.stringify(req.headers(), null, 2))
    console.log('请求体:', req.postData())
  }
})
page.on('response', async (res) => {
  if (res.url().includes('/auth/unified-login')) {
    let body = ''
    try {
      body = await res.text()
    } catch (e) {
      body = '(读取失败: ' + e.message + ')'
    }
    console.log('\n──── 响应 ────')
    console.log('状态  :', res.status())
    console.log('响应头:', JSON.stringify(res.headers(), null, 2))
    console.log('响应体:', body.slice(0, 500))
  }
})

await page.goto(`${server.url}/#/pages/login/login`, { waitUntil: 'networkidle2' })
await new Promise((r) => setTimeout(r, 1500))

const els = await page.$$('input')
let usr, pwd
for (const el of els) {
  const type = await page.evaluate((e) => e.type, el)
  if (type === 'password') pwd = el
  else usr = usr || el
}
if (!usr || !pwd) {
  console.log('未找到输入框，退出')
  await browser.close()
  await server.close()
  process.exit(1)
}
await usr.click()
await page.keyboard.type(USER, { delay: 20 })
await pwd.click()
await page.keyboard.type(PASS, { delay: 20 })

const clicked = await page.evaluate(() => {
  const btns = [...document.querySelectorAll('uni-button, button')]
  const txt = (b) => b.innerText || ''
  const t =
    btns.find((b) => /登\s*录|开始工作/.test(txt(b)) && !/微信/.test(txt(b))) ||
    btns.find((b) => b.classList.contains('btn') && !/微信/.test(txt(b)))
  if (!t) return false
  t.click()
  return true
})
console.log('\n点击登录按钮:', clicked)

await new Promise((r) => setTimeout(r, 6000))
console.log('\n当前 hash:', await page.evaluate(() => location.hash))

await browser.close()
await server.close()
