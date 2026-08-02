import { launchBrowser } from './lib/browser.mjs'

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

const BASE = 'http://localhost:4173'
const { browser } = await launchBrowser()
const page = await browser.newPage()
await page.setViewport({ width: 1280, height: 900 })

async function login(user, pass) {
  await page.goto(`${BASE}/#/login`, { waitUntil: 'domcontentloaded' })
  await page.waitForSelector('input', { timeout: 20000 })
  await sleep(600)
  const inputs = await page.$$('input')
  console.log('input count:', inputs.length)
  let usr, pwd
  for (const el of inputs) {
    const t = await page.evaluate((e) => e.type, el)
    const ph = await page.evaluate((e) => e.placeholder || '', el)
    if (t === 'password') pwd = el
    else if (/用户名|账号|user/i.test(ph)) usr = el
  }
  if (!usr) {
    for (const el of inputs) {
      const t = await page.evaluate((e) => e.type, el)
      if (t !== 'password') { usr = el; break }
    }
  }
  await usr.click(); await page.keyboard.type(user, { delay: 20 })
  await pwd.click(); await page.keyboard.type(pass, { delay: 20 })
  const clicked = await page.evaluate(() => {
    const b = [...document.querySelectorAll('button')].find((x) => /(登\s*录|开始工作)/.test(x.innerText || ''))
    if (b) { b.click(); return true }
    return false
  })
  console.log('login button clicked:', clicked)
  await sleep(3000)
  const info = await page.evaluate(() => ({
    hash: location.hash,
    text: (document.querySelector('#app')?.innerText || '').slice(0, 200),
  }))
  console.log('after-login hash:', info.hash)
  console.log('after-login text:', info.text.replace(/\n/g, ' | '))
  return info.hash
}

// super
let h = await login('admin', 'admin')
console.log('super hash:', h)
if (h.startsWith('#/super')) {
  await sleep(2000)
  await page.screenshot({ path: '/tmp/super-dash2.png', fullPage: true })
  console.log('super screenshot OK')
}
await browser.close()
console.log('done')
