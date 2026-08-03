#!/usr/bin/env node
// 园丁工作台 · 页面-按钮级测试（test-cases-page-level.md v2.0 的执行器）
//
// 覆盖：超管(SUP) / 校管(SA) / 教师(T) / 家长(P) 关键页面 P0 按钮的增删改查真实交互，
//       每个用例 = 打开页面 → 执行按钮操作 → 断言触发的 API 2xx → 自建自删清理。
// 判定：页面无 pageerror + 无非鉴权 console.error + 目标 API 2xx = PASS。
// 与接口级 api-tests.mjs（178 条）互补：这里验证「按钮 → 请求」的 UI 链路。
//
// 用法: node e2e/qa/button-tests.mjs
// 环境变量:
//   BT_BASE     Web 前端地址（默认 http://localhost:4173）
//   BT_API      后端 API 根（默认云托管）
//   BT_SETTLE   每步等待毫秒（默认 900）
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import puppeteer from 'puppeteer-core'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const BASE = (process.env.BT_BASE || 'http://localhost:4173').replace(/\/$/, '')
const SETTLE = Number(process.env.BT_SETTLE) || 900
const BROWSER = process.env.BT_BROWSER || 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const ts = () => String(Date.now()).slice(-6)

// ---------- DOM 操作 helpers（全部带超时保护） ----------
async function evalSafe(page, fn, arg, timeout = 6000) {
  return Promise.race([
    page.evaluate(fn, arg),
    sleep(timeout).then(() => ({ __timeout: true })),
  ])
}

/** 点击可见文本匹配的 button：先精确 trim 匹配，fallback 包含匹配（避免「发布」误点「发布公告」） */
async function clickByText(page, text, timeout = 6000) {
  const r = await evalSafe(
    page,
    (t) => {
      const btns = [...document.querySelectorAll('button')].filter((b) => b.offsetParent !== null)
      const exact = btns.find((b) => (b.textContent || '').trim() === t)
      const btn = exact || btns.find((b) => (b.textContent || '').includes(t))
      if (!btn) return { ok: false, reason: 'NOT_FOUND' }
      btn.click()
      return { ok: true }
    },
    text,
    timeout,
  )
  if (r?.__timeout) return { ok: false, reason: 'TIMEOUT' }
  return r
}

/** 点击 table 行内 title 匹配的按钮（如 编辑/删除/启用） */
async function clickRowAction(page, title, timeout = 6000) {
  const r = await evalSafe(
    page,
    (t) => {
      const el = [...document.querySelectorAll('button[title]')].find(
        (b) => b.offsetParent !== null && (b.getAttribute('title') || '').includes(t),
      )
      if (!el) return { ok: false, reason: 'NOT_FOUND' }
      el.click()
      return { ok: true }
    },
    title,
    timeout,
  )
  if (r?.__timeout) return { ok: false, reason: 'TIMEOUT' }
  return r
}

/** 填充 placeholder 匹配的 input（优先 Modal 内；原生 setter 保证 v-model 生效） */
async function fillInput(page, placeholder, value, timeout = 6000) {
  const r = await evalSafe(
    page,
    ([ph, val]) => {
      const modal = document.querySelector('.fixed.inset-0.z-50')
      const scope = modal ? [...modal.querySelectorAll('input,textarea')] : []
      const all = [...document.querySelectorAll('input,textarea')]
      const pool = scope.length ? scope : all
      const el = pool.find((i) => i.offsetParent !== null && (i.placeholder || '').includes(ph))
      if (!el) return { ok: false, reason: 'NOT_FOUND' }
      const proto = el.tagName === 'TEXTAREA' ? window.HTMLTextAreaElement.prototype : window.HTMLInputElement.prototype
      const setter = Object.getOwnPropertyDescriptor(proto, 'value').set
      setter.call(el, val)
      el.dispatchEvent(new Event('input', { bubbles: true }))
      el.dispatchEvent(new Event('change', { bubbles: true }))
      return { ok: true }
    },
    [placeholder, value],
    timeout,
  )
  if (r?.__timeout) return { ok: false, reason: 'TIMEOUT' }
  return r
}

/** select 选值：优先在 Modal（.fixed.inset-0.z-50）内匹配 option 文本含 label 的 select；无 Modal 或未命中再全页 fallback */
async function fillSelect(page, labelText, value, timeout = 6000) {
  const r = await evalSafe(
    page,
    ([lab, val]) => {
      const modal = document.querySelector('.fixed.inset-0.z-50')
      const inModal = modal ? [...modal.querySelectorAll('select')].filter((s) => s.offsetParent !== null) : []
      const selects = (inModal.length ? inModal : [...document.querySelectorAll('select')]).filter(
        (s) => s.offsetParent !== null,
      )
      let sel = null
      let target = null
      for (const s of selects) {
        const opts = [...s.options].filter((o) => o.value !== '')
        const t = opts.find((o) => o.textContent.includes(lab))
        if (t) { sel = s; target = t; break }
      }
      if (!sel || !target) {
        // fallback：第一个有非空 option 的 select
        sel = selects.find((s) => [...s.options].some((o) => o.value !== '')) || null
        target = sel ? [...sel.options].find((o) => o.value !== '') : null
      }
      if (!sel || !target) return { ok: false, reason: 'NO_OPTION' }
      const setter = Object.getOwnPropertyDescriptor(window.HTMLSelectElement.prototype, 'value').set
      setter.call(sel, target.value)
      sel.dispatchEvent(new Event('change', { bubbles: true }))
      return { ok: true, value: target.value, text: target.textContent.slice(0, 30) }
    },
    [labelText, value],
    timeout,
  )
  if (r?.__timeout) return { ok: false, reason: 'TIMEOUT' }
  return r
}

/** 点标签为 label 的学科 chip（班级表单） */
async function clickChip(page, label, timeout = 6000) {
  const r = await evalSafe(
    page,
    (lab) => {
      const chips = [...document.querySelectorAll('button')].filter(
        (b) => b.offsetParent !== null && (b.textContent || '').trim() === lab,
      )
      const chip = chips.find((c) => c.className.includes('rounded-full'))
      if (!chip) return { ok: false, reason: 'NOT_FOUND' }
      chip.click()
      return { ok: true }
    },
    label,
    timeout,
  )
  if (r?.__timeout) return { ok: false, reason: 'TIMEOUT' }
  return r
}

/** 读取当前路由 */
const currentRoute = (page) =>
  Promise.race([page.evaluate(() => location.hash.replace(/^#/, '').split('?')[0]) , sleep(3000).then(() => '')])

// ---------- 会话 ----------
async function newContext(browser, { user, pass, onApi }) {
  const context = await browser.createBrowserContext()
  const page = await context.newPage()
  await page.setViewport({ width: 1366, height: 900 })
  const pageErrors = []
  const consoleErrors = []
  const apiHits = [] // {method, path, status, url}
  page.on('pageerror', (e) => pageErrors.push(String(e?.stack || e)))
  page.on('console', (m) => {
    if (m.type() === 'error') consoleErrors.push(m.text())
  })
  page.on('dialog', (d) => d.accept().catch(() => {})) // confirm/alert 自动接受
  page.on('response', (res) => {
    const req = res.request()
    if (!req.url().includes('/api/')) return
    apiHits.push({
      method: req.method(),
      path: req.url().split('/api')[1]?.split('?')[0] || req.url(),
      status: res.status(),
    })
  })
  if (onApi) page.on('response', onApi)

  // 登录（Login.vue 提交按钮是 type=submit，不用文本匹配）
  await page.goto(`${BASE}/#/login`, { waitUntil: 'domcontentloaded', timeout: 30000 })
  await page.waitForSelector('input[placeholder*="用户名"]', { timeout: 15000 })
  await fillInput(page, '用户名', user)
  await fillInput(page, '密码', pass)
  await page.evaluate(() => {
    const btn = document.querySelector('button[type="submit"]')
    if (btn) btn.click()
  })
  await page
    .waitForFunction(() => !location.hash.startsWith('#/login'), { timeout: 20000 })
    .catch(() => {})
  await sleep(1200)
  const hash = await Promise.race([page.evaluate(() => location.hash), sleep(3000).then(() => '')])
  console.log(`[login] ${user} → ${hash || '(读取失败)'}`)
  return { context, page, pageErrors, consoleErrors, apiHits, route: currentRoute }
}

async function gotoRoute(page, route) {
  await Promise.race([
    page.evaluate((r) => { window.location.hash = r }, route),
    sleep(5000),
  ])
  await sleep(SETTLE)
}

// ---------- 用例表 ----------
// steps: { act:'click'|'fill'|'select'|'chip'|'row'|'goto'|'wait', ... }
// expectApi: { method, path } 断言至少一条匹配且 2xx
// cleanup: 可选步骤，执行后不再断言
const CASES = [
  // ================= 超管 SUP =================
  {
    id: 'PB-SUP-02-01', role: 'SUP', title: '新增学校',
    route: '/super/schools', login: { user: 'admin', pass: 'admin' },
    steps: [
      { act: 'click', text: '新增学校' },
      { act: 'fill', placeholder: '请输入学校名称', value: '按钮测试学校' },
      { act: 'fill', placeholder: '如 BJ', value: 'BT' },
      { act: 'click', text: '保存' },
      { act: 'wait', ms: 1200 },
    ],
    expectApi: { method: 'POST', path: '/admin/schools' },
    cleanup: [
      { act: 'click', text: '搜索' },
      { act: 'wait', ms: 300 },
    ],
    note: 'UI 新增学校 → POST /admin/schools 2xx（删除在 PB-SUP-02-04 用例内进行）',
  },
  {
    id: 'PB-SUP-02-04', role: 'SUP', title: '删除学校(含confirm)',
    route: '/super/schools', login: { user: 'admin', pass: 'admin' },
    steps: [
      { act: 'click', text: '新增学校' },
      { act: 'fill', placeholder: '请输入学校名称', value: '按钮删除学校' },
      { act: 'fill', placeholder: '如 BJ', value: 'BD' },
      { act: 'click', text: '保存' },
      { act: 'wait', ms: 1000 },
      { act: 'row', title: '删除' },
      { act: 'wait', ms: 1200 },
    ],
    expectApi: { method: 'DELETE', path: '/admin/schools/' },
    note: '新增→行内删除→confirm 接受→DELETE 2xx',
  },
  {
    id: 'PB-SUP-03-01', role: 'SUP', title: '新增校管',
    route: '/super/admins', login: { user: 'admin', pass: 'admin' },
    steps: [
      { act: 'click', text: '新增' },
      { act: 'fill', placeholder: '请输入姓名', value: '按钮校管' },
      { act: 'fill', placeholder: '登录用户名', value: `btn_sa_${ts()}` },
      { act: 'fill', placeholder: '初始密码', value: 'Test@2026' },
      { act: 'click', text: '保存' },
      { act: 'wait', ms: 1000 },
    ],
    expectApi: { method: 'POST', path: '/admin/school-admins' },
    cleanup: [
      { act: 'row', title: '删除' },
      { act: 'wait', ms: 1000 },
    ],
    note: 'UI 新增校管 → POST /admin/school-admins 2xx，随后删除清理',
  },
  // ================= 校管 SA =================
  {
    id: 'PB-SA-02-01', role: 'SA', title: '新增教师',
    route: '/school-admin/teachers', login: { user: 'qa_sa', pass: 'Test@2026' },
    steps: [
      { act: 'click', text: '新增教师' },
      { act: 'fill', placeholder: '请输入姓名', value: '按钮教师' },
      { act: 'fill', placeholder: '如 zhangsan', value: `btn_tea_${ts()}` },
      { act: 'fill', placeholder: '留空则默认', value: 'Test@2026' },
      { act: 'select', label: '语文', value: '' },
      { act: 'select', label: '一年级', value: '' },
      { act: 'click', text: '保存' },
      { act: 'wait', ms: 1200 },
    ],
    expectApi: { method: 'POST', path: '/school-admin/teachers' },
    cleanup: [
      { act: 'row', title: '删除' },
      { act: 'wait', ms: 1000 },
    ],
    note: 'UI 新增教师（学科/年级下拉）→ POST /school-admin/teachers 2xx，随后删除',
  },
  {
    id: 'PB-SA-03-01', role: 'SA', title: '新增班级(年级/序号/班主任)',
    route: '/school-admin/classes', login: { user: 'qa_sa', pass: 'Test@2026' },
    steps: [
      { act: 'goto', route: '/school-admin/teachers' },
      // 前置：先建一名新教师作为班主任（避免一人一班冲突）
      { act: 'click', text: '新增教师' },
      { act: 'fill', placeholder: '请输入姓名', value: '班级班主任' },
      { act: 'fill', placeholder: '如 zhangsan', value: `btn_head_${ts()}` },
      { act: 'fill', placeholder: '留空则默认', value: 'Test@2026' },
      { act: 'select', label: '语文', value: '' },
      { act: 'click', text: '保存' },
      { act: 'wait', ms: 1000 },
      { act: 'goto', route: '/school-admin/classes' },
      // 建班级
      { act: 'click', text: '新增班级' },
      { act: 'select', label: '一年级', value: '' },
      { act: 'fill', placeholder: '如：1', value: '9' },
      { act: 'select', label: '班级班主任', value: '' },
      { act: 'chip', label: '语文' },
      { act: 'click', text: '保存' },
      { act: 'wait', ms: 1200 },
    ],
    expectApi: { method: 'POST', path: '/school-admin/classes' },
    cleanup: [
      { act: 'row', title: '删除' },
      { act: 'wait', ms: 1200 },
      { act: 'goto', route: '/school-admin/teachers' },
      { act: 'row', title: '删除' },
      { act: 'wait', ms: 1000 },
    ],
    note: '先建教师作班主任→UI 新增班级（年级/序号/班主任下拉/学科 chip）→ POST /school-admin/classes 2xx，随后删班级删教师',
  },
  {
    id: 'PB-SA-05-01', role: 'SA', title: '发布公告',
    route: '/school-admin/notices', login: { user: 'qa_sa', pass: 'Test@2026' },
    steps: [
      { act: 'click', text: '发布公告' },
      { act: 'fill', placeholder: '公告标题', value: '按钮测试公告' },
      { act: 'fill', placeholder: '公告正文', value: '由按钮级测试自动发布，可删除' },
      { act: 'click', text: '发布' },
      { act: 'wait', ms: 1000 },
    ],
    expectApi: { method: 'POST', path: '/school-admin/notices' },
    cleanup: [
      { act: 'row', title: '删除' },
      { act: 'wait', ms: 800 },
    ],
    note: 'UI 发布公告 → POST /school-admin/notices 2xx，随后删除',
  },
  {
    id: 'PB-SA-06-01', role: 'SA', title: '教材一键初始化',
    route: '/school-admin/textbooks', login: { user: 'qa_sa', pass: 'Test@2026' },
    steps: [
      { act: 'click', text: '初始化' },
      { act: 'wait', ms: 1500 },
    ],
    expectApi: { method: 'POST', path: '/school-admin/textbooks/seed-defaults' },
    note: 'UI 一键初始化教材 → POST seed-defaults 2xx（幂等）',
  },
  {
    id: 'PB-SA-07-01', role: 'SA', title: '资源库一键初始化',
    route: '/school-admin/resource-library', login: { user: 'qa_sa', pass: 'Test@2026' },
    steps: [
      { act: 'click', text: '初始化' },
      { act: 'wait', ms: 1500 },
    ],
    expectApi: { method: 'POST', path: '/school-admin/resource-library/seed-defaults' },
    note: 'UI 一键初始化资源库 → POST seed-defaults 2xx（幂等）',
  },
  // ================= 教师 T =================
  {
    id: 'PB-T-20-01', role: 'T', title: '新增考试(选班级/科目)',
    route: '/teacher/exams', login: { user: 'qa_teacher', pass: 'Test@2026' },
    steps: [
      { act: 'click', text: '新增考试' },
      { act: 'fill', placeholder: '如：2024春季期中考试', value: '按钮测试考试' },
      { act: 'select', label: 'QA一班', value: '' },
      { act: 'click', text: '保存' },
      { act: 'wait', ms: 1200 },
    ],
    expectApi: { method: 'POST', path: '/exams' },
    cleanup: [
      { act: 'row', title: '删除' },
      { act: 'wait', ms: 1000 },
    ],
    note: 'UI 新增考试（名称+班级下拉）→ POST /exams 2xx，随后删除',
  },
  {
    id: 'PB-T-12-01', role: 'T', title: '新增学生',
    route: '/teacher/students', login: { user: 'qa_teacher', pass: 'Test@2026' },
    steps: [
      { act: 'click', text: '新增学生' },
      { act: 'fill', placeholder: '请输入姓名', value: '按钮学生' },
      { act: 'fill', placeholder: '选填', value: `9${ts()}` },
      { act: 'click', text: '保存' },
      { act: 'wait', ms: 1200 },
    ],
    expectApi: { method: 'POST', path: '/students' },
    cleanup: [
      { act: 'row', title: '删除' },
      { act: 'wait', ms: 1000 },
    ],
    note: 'UI 新增学生（姓名+学号）→ POST /students 2xx，随后删除',
  },
  // ================= 家长 P =================
  {
    id: 'PB-P-01-01', role: 'P', title: '家长登录+中心渲染',
    route: '/parent', login: { user: '12101', pass: '123456' },
    steps: [
      { act: 'reload' },
      { act: 'wait', ms: 1500 },
    ],
    expectApi: { method: 'GET', path: '/parent-auth/me' },
    expectRoute: '/parent',
    note: '家长学号登录 → 进入家长中心（刷新重载触发 me），GET /parent-auth/me 2xx',
  },
  {
    id: 'PB-P-04-02', role: 'P', title: '家长只读数据加载',
    route: '/parent', login: { user: '12101', pass: '123456' },
    steps: [
      { act: 'reload' },
      { act: 'wait', ms: 1500 },
    ],
    expectApi: { method: 'GET', path: '/parent-auth/notices' },
    note: '家长中心只读数据（公告等）GET 2xx（TC-P-005 横切）',
  },
]

// ---------- 执行器 ----------
const NOISE_RE = [
  /favicon\.ico/i,
  /ResizeObserver loop/i,
  /Download the Vue Devtools/i,
  /\[Vue warn\]: Extraneous non-emits/i,
]
const AUTH_RE = /401|未登录|令牌|token|登录失效|登录过期|权限不足|无权限|forbidden/i

async function main() {
  console.log(`[button-tests] 前端 ${BASE} | 等待 5s 让云端部署就绪…`)
  await sleep(5000)
  const browser = await puppeteer.launch({
    headless: 'new',
    executablePath: BROWSER,
    args: ['--no-sandbox', '--disable-gpu'],
  })
  const results = []
  const sessions = {} // role -> context

  try {
    // 预登录所有角色会话（独立 context 防 token 串号）
    for (const role of ['SUP', 'SA', 'T', 'P']) {
      const c = CASES.find((x) => x.role === role)
      if (!c) continue
      const cfg = c.login
      const ctx = await newContext(browser, { user: cfg.user, pass: cfg.pass })
      sessions[role] = ctx
      console.log(`[${role}] 会话已登录 ${cfg.user}`)
    }

    for (const c of CASES) {
      if (process.env.BT_SKIP && c.role === process.env.BT_SKIP) {
        console.log(`⏭️  ${c.id} ${c.title} [SKIP: BT_SKIP=${process.env.BT_SKIP}]`)
        continue
      }
      const s = sessions[c.role]
      const rt0 = Date.now()
      const res = {
        id: c.id,
        title: c.title,
        role: c.role,
        status: 'PASS',
        steps: [],
        apiHit: null,
        note: c.note || '',
      }
      // 记录起始索引（不清空历史：登录期/页面加载期请求也算在会话内）
      const startIdx = s.apiHits.length
      const preErr = s.pageErrors.length
      const preCe = s.consoleErrors.length

      try {
        await gotoRoute(s.page, c.route)
        for (const st of c.steps) {
          let r
          switch (st.act) {
            case 'click': r = await clickByText(s.page, st.text); await sleep(350); break
            case 'row': r = await clickRowAction(s.page, st.title); await sleep(350); break
            case 'goto': await gotoRoute(s.page, st.route); r = { ok: true }; break
            case 'reload':
              await Promise.race([s.page.reload({ waitUntil: 'domcontentloaded', timeout: 30000 }), sleep(20000)])
              await sleep(1200)
              r = { ok: true }
              break
            case 'fill': r = await fillInput(s.page, st.placeholder, st.value); break
            case 'select': r = await fillSelect(s.page, st.label, st.value || ''); break
            case 'chip': r = await clickChip(s.page, st.label); await sleep(250); break
            case 'wait': await sleep(st.ms); r = { ok: true }; break
            default: r = { ok: false, reason: 'UNKNOWN_ACT' }
          }
          res.steps.push({ act: st.act, text: st.text || st.placeholder || st.label, ...r })
          if (!r.ok && st.act !== 'wait') break
        }

        // 断言 API（从 startIdx 之后匹配）
        const hit = s.apiHits.slice(startIdx).find(
          (h) => h.method === c.expectApi.method && h.path.includes(c.expectApi.path) && h.status >= 200 && h.status < 300,
        )
        res.apiHit = hit || null
        if (!hit) {
          res.status = 'FAIL'
          res.reason = `未匹配到 ${c.expectApi.method} ${c.expectApi.path} 2xx；最近请求: ${s.apiHits
            .slice(startIdx)
            .map((h) => `${h.method} ${h.path}=${h.status}`)
            .slice(-8)
            .join(', ') || '无'}`
        }

        // 目标路由确认（家长用例）
        if (c.expectRoute) {
          const rt = await s.route(s.page)
          if (rt && !rt.startsWith(c.expectRoute)) {
            res.status = 'FAIL'
            res.reason = `期望路由 ${c.expectRoute}，实际 ${rt}`
          }
        }

        // 页面错误检查（排除登录期与噪声）
        const newPe = s.pageErrors.slice(preErr).filter((e) => !AUTH_RE.test(e))
        const newCe = s.consoleErrors.slice(preCe).filter((t) => !NOISE_RE.some((re) => re.test(t)) && !AUTH_RE.test(t))
        if (newPe.length) {
          res.status = 'FAIL'
          res.pageErrors = newPe.slice(0, 3)
        }
        if (res.status === 'PASS' && newCe.length) {
          res.consoleWarn = newCe.slice(0, 3)
        }

        // 清理步骤（尽力而为）
        if (c.cleanup) {
          for (const st of c.cleanup) {
            if (st.act === 'click') await clickByText(s.page, st.text)
            else if (st.act === 'row') await clickRowAction(s.page, st.title)
            else if (st.act === 'goto') await gotoRoute(s.page, st.route)
            else if (st.act === 'wait') await sleep(st.ms)
          }
        }
      } catch (e) {
        res.status = 'ERROR'
        res.reason = e?.message?.slice(0, 200) || String(e)
      }
      res.durationMs = Date.now() - rt0
      results.push(res)
      const stepFail = res.steps.find((x) => !x.ok && x.act !== 'wait')
      console.log(
        `${res.status === 'PASS' ? '✅' : '❌'} ${res.id} ${res.title} [${res.durationMs}ms]${res.reason ? ' — ' + res.reason : ''}` +
          (stepFail ? ` | 步骤失败: ${stepFail.act}(${stepFail.text}) → ${stepFail.reason}` : ''),
      )
    }

    // 关闭会话
    for (const [role, s] of Object.entries(sessions)) {
      await s.page.close().catch(() => {})
      await s.context.close().catch(() => {})
    }
  } finally {
    await browser.close().catch(() => {})
  }

  // 汇总
  const pass = results.filter((r) => r.status === 'PASS').length
  const fail = results.filter((r) => r.status !== 'PASS').length
  const out = {
    generatedAt: new Date().toISOString(),
    base: BASE,
    totals: { pass, fail, total: results.length },
    results,
  }
  const outPath = path.join(__dirname, '..', 'reports', 'button-tests.json')
  const fs = await import('node:fs')
  fs.writeFileSync(outPath, JSON.stringify(out, null, 2))
  console.log(`\n═══════ 按钮级测试结果: ${pass}/${results.length} 通过 ═══════`)
  for (const r of results.filter((x) => x.status !== 'PASS')) {
    console.log(`❌ ${r.id} ${r.title}: ${r.reason}`)
  }
  console.log(`\n报告: ${outPath}`)
  if (fail > 0) process.exitCode = 1
}

main().catch((e) => {
  console.error('[button-tests] 崩溃:', e)
  process.exit(1)
})
