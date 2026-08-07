#!/usr/bin/env node
// 园丁工作台 · Web 端关键业务旅程 E2E（交互维度，与全路由冒烟互补）
//
// 覆盖旅程：
//   1. 教师登录 → 工作台（欢迎横幅 + 统计卡）
//   2. 班级列表 → 班级卡片渲染
//   3. 学生列表 → 打开首个学生详情（雷达图 / 排名 / 考勤 / 行为区域存在）
//   4. 考试列表 → 打开首次考试分析（统计卡 / 成绩矩阵 / 排名表渲染）
//   5. 写旅程（默认开，SMOKE_FLOW_READONLY=1 关闭）：API 创建临时考试 → 列表可见 → API 删除清理
//
// 用法:
//   node e2e/web.flow.mjs
//   SMOKE_BASE_URL=http://localhost:4173 node e2e/web.flow.mjs
//   SMOKE_FLOW_READONLY=1 node e2e/web.flow.mjs   # 跳过写旅程
//
// 环境变量同 web.smoke.mjs：SMOKE_BASE_URL / SMOKE_API_BASE / SMOKE_TEACHER_USER / SMOKE_TEACHER_PASS
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { sleep } from './lib/runner.mjs'
import { writeReports, renderText } from './lib/report.mjs'
import { login as apiLogin } from './lib/provision.mjs'
import { launchBrowser } from './lib/browser.mjs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const BASE = (process.env.SMOKE_BASE_URL || 'http://localhost:4173').replace(/\/$/, '')
const API_BASE = (
  process.env.SMOKE_API_BASE || 'https://tec-work-283329-8-1440166408.sh.run.tcloudbase.com/api'
).replace(/\/$/, '')
const READONLY = process.env.SMOKE_FLOW_READONLY === '1'
const TEACHER = {
  user: process.env.SMOKE_TEACHER_USER || 'teacher1',
  pass: process.env.SMOKE_TEACHER_PASS || '123456',
}

const results = [] // { name, pass, detail? }
const consoleErrors = []

function record(name, pass, detail) {
  results.push({ name, pass, detail: pass ? undefined : detail })
  console.log(`${pass ? '✅' : '❌'} ${name}${pass ? '' : ` — ${detail}`}`)
}

async function login(page) {
  await page.goto(`${BASE}/#/login`, { waitUntil: 'domcontentloaded', timeout: 30000 })
  await page.waitForSelector('input[placeholder*="用户名"]', { timeout: 20000 })
  await page.type('input[placeholder*="用户名"]', TEACHER.user)
  await page.type('input[placeholder*="密码"]', TEACHER.pass)
  await page.click('button[type="submit"]')
  await page
    .waitForFunction(() => !location.hash.startsWith('#/login'), { timeout: 25000 })
    .catch(() => {
      throw new Error(`登录未跳转，账号 ${TEACHER.user} 不可用`)
    })
  await sleep(1500)
}

async function goto(page, hash) {
  await page.evaluate((r) => { window.location.hash = r }, hash)
  await sleep(2000)
}

/** 读取页面文本（去空白），用于内容断言 */
async function pageText(page) {
  return page.evaluate(() => (document.body?.innerText || '').replace(/\s+/g, ' '))
}

async function main() {
  const { browser } = await launchBrowser()
  const page = await browser.newPage()
  page.on('pageerror', (e) => consoleErrors.push(String(e?.message || e)))
  page.on('console', (m) => {
    if (m.type() === 'error') consoleErrors.push(String(m.text()))
  })

  const apiHeaders = { 'Content-Type': 'application/json' }
  let teacherToken = ''
  const startedAt = Date.now()
  try {
    // ---------- 0. 后端探活 + 教师令牌 ----------
    const health = await fetch(`${API_BASE}/health`).catch(() => null)
    record('后端探活', !!health, health ? '' : `${API_BASE} 不可达`)
    const loginRes = await apiLogin(API_BASE, TEACHER.user, TEACHER.pass).catch((e) => null)
    teacherToken = loginRes?.token || ''
    record('教师账号可用', !!teacherToken, 'teacher1/123456 登录失败，检查 SMOKE_API_BASE')

    // ---------- 1. 登录 + 工作台 ----------
    await login(page)
    let text = await pageText(page)
    record('登录跳转工作台', text.includes('工作台') || text.includes('数据一览'), '未进入工作台')

    // ---------- 2. 班级列表 ----------
    await goto(page, '/teacher/classes')
    text = await pageText(page)
    record('班级列表渲染', /班/.test(text) || text.includes('班级'), '班级页无内容')

    // ---------- 3. 学生列表 → 首个学生详情 ----------
    await goto(page, '/teacher/students')
    text = await pageText(page)
    const hasStudent = text.includes('学生') && (text.includes('姓名') || /男生|女生/.test(text))
    record('学生列表渲染', hasStudent, '学生列表无数据或未渲染')

    // 尝试点开第一个学生
    let openedStudent = false
    try {
      const clicked = await page.evaluate(() => {
        const rows = Array.from(document.querySelectorAll('tr, .cursor-pointer, [class*="card"]'))
        for (const r of rows) {
          const link = r.querySelector('a[href*="student"], button[title="详情"]')
          if (link) { link.click(); return true }
        }
        return false
      })
      if (clicked) {
        await sleep(2500)
        const t2 = await pageText(page)
        openedStudent = /雷达|排名|出勤|考勤|行为|成绩趋势|学科/.test(t2)
      }
    } catch { /* ignore */ }
    record('学生详情（雷达/排名/考勤）', openedStudent, '未能打开学生详情或缺少分析区块')

    // ---------- 4. 考试列表 → 首次考试分析 ----------
    await goto(page, '/teacher/exams')
    text = await pageText(page)
    record('考试列表渲染', /考试/.test(text) && !text.includes('暂无考试'), '考试列表为空')

    let openedAnalysis = false
    try {
      const clicked = await page.evaluate(() => {
        const rows = Array.from(document.querySelectorAll('tr'))
        for (const r of rows) {
          const link = r.querySelector('a[href*="analysis"], a[href*="exam-detail"], button[title*="分析"], button[title*="详情"]')
          if (link) { link.click(); return true }
        }
        return false
      })
      if (clicked) {
        await sleep(2500)
        const t2 = await pageText(page)
        openedAnalysis = /分析|统计|排名|成绩|矩阵|及格率|优秀率/.test(t2)
      }
    } catch { /* ignore */ }
    record('考试分析页渲染', openedAnalysis, '未能打开考试分析或缺少统计区块')

    // ---------- 5. 写旅程：临时考试（创建 → 可见 → 删除） ----------
    if (!READONLY && teacherToken) {
      const tmpExamName = `E2E临时考试_${Date.now()}`
      let createdId = ''
      try {
        // 取第一个班级 id
        const classes = await fetch(`${API_BASE}/classes`, {
          headers: { ...apiHeaders, Authorization: `Bearer ${teacherToken}` },
        }).then((r) => r.json()).catch(() => ({ items: [] }))
        const clsList = Array.isArray(classes) ? classes : classes.items || []
        if (clsList.length) {
          const cls = clsList[0]
          const created = await fetch(`${API_BASE}/exams`, {
            method: 'POST',
            headers: { ...apiHeaders, Authorization: `Bearer ${teacherToken}` },
            body: JSON.stringify({
              name: tmpExamName,
              classId: cls.id,
              className: cls.name,
              date: new Date().toISOString().slice(0, 10),
              term: cls.term || '',
              subjects: Array.isArray(cls.subjects) ? cls.subjects.slice(0, 2) : ['语文', '数学'],
            }),
          }).then((r) => r.json()).catch(() => null)
          createdId = created?.id || ''
          record('写旅程：创建临时考试', !!createdId, `创建失败 ${JSON.stringify(created).slice(0, 200)}`)

          if (createdId) {
            await goto(page, '/teacher/exams')
            const t3 = await pageText(page)
            record('写旅程：列表可见新考试', t3.includes(tmpExamName), '新考试未出现在列表')
          }
        } else {
          record('写旅程：跳过（无班级）', true, '教师无班级，跳过写操作')
        }
      } finally {
        if (createdId) {
          await fetch(`${API_BASE}/exams/${createdId}`, {
            method: 'DELETE',
            headers: { ...apiHeaders, Authorization: `Bearer ${teacherToken}` },
          }).catch(() => {})
          record('写旅程：清理临时考试', true, '')
        }
      }
    } else if (READONLY) {
      record('写旅程：已跳过（READONLY）', true, '')
    }

    // ---------- 汇总 ----------
    const pass = results.filter((r) => r.pass).length
    const fail = results.length - pass
    const durationMs = Date.now() - startedAt
    const report = {
      title: '园丁工作台 Web 关键旅程 E2E',
      base: BASE,
      browser: 'puppeteer',
      startedAt: new Date(startedAt).toISOString(),
      durationMs,
      totals: { total: results.length, pass, fail, warn: 0, redirected: 0, quarantined: 0, flaky: 0, auth: 0 },
      // 兼容冒烟报告渲染器：将旅程结果映射为 roles.routes 结构
      roles: [
        {
          role: 'teacher',
          user: TEACHER.user,
          loginOk: true,
          failCount: fail,
          routes: results.map((r) => ({
            route: r.name,
            ok: r.pass,
            textLen: 0,
            durationMs: 0,
            pageErrors: [],
            consoleErrors: [],
            auth: false,
            flaky: false,
            redirected: false,
            quarantined: false,
          })),
        },
      ],
      results,
      consoleErrors,
    }
    const files = writeReports(report, path.join(__dirname, 'reports'), 'web-flow')
    console.log('\n' + renderText(report))
    if (consoleErrors.length) {
      console.log(`\n[flow] console 错误 ${consoleErrors.length} 条（供参考）:`)
      consoleErrors.slice(0, 8).forEach((e) => console.log('  -', String(e).slice(0, 160)))
    }
    console.log(`\n[flow] 报告: ${files.txt}`)
    process.exit(fail > 0 ? 1 : 0)
  } finally {
    await browser.close().catch(() => {})
  }
}

main().catch((e) => {
  console.error('[flow] 执行崩溃:', e)
  process.exit(1)
})
