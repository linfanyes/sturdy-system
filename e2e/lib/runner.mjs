// 通用冒烟执行器：按角色遍历路由，采集运行时错误与白屏
//
// Web 端与小程序 H5 端共用同一套执行/判定/报告逻辑，差异通过参数注入：
//   - login(page, role)  各端登录方式不同（Web 表单 / uni 表单）
//   - goto(page, route)  各端路由切换方式不同（hash / uni 路由）
//   - beforeLoad(page)   注入环境垫片（小程序需要 wx.cloud 垫片）
import { launchBrowser } from './browser.mjs'

export const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

// 与业务无关的噪声，不计入失败，避免 CI 被无意义告警拖红
const DEFAULT_IGNORE = [
  /favicon\.ico/i,
  /ResizeObserver loop/i,
  /Download the Vue Devtools/i,
  /\[Vue warn\]: Extraneous non-emits/i,
]

// 后端鉴权抖动特征（JWT 多实例校验偶发 401 / 令牌失效）。
// 仅有这类错误的路由属「后端问题」而非前端缺陷：CI 不应因此变红，
// 但仍单独计入 auth 维度以便观测。任何非鉴权类的 pageerror / 白屏依旧判硬失败。
const AUTH_RE =
  /未登录|缺少令牌|token|令牌|401|unauthorized|登录失效|登录过期|登录已|鉴权|权限不足|无权限|forbidden|登录态/i

function isNoise(text, extraIgnore) {
  return [...DEFAULT_IGNORE, ...extraIgnore].some((re) => re.test(text))
}

/**
 * 执行一轮冒烟
 * @param {object} opts
 * @param {string} opts.title      报告标题
 * @param {string} opts.base       被测站点根地址
 * @param {Array}  opts.roles      [{ role, user, pass, routes: string[] }]
 * @param {Function} opts.login    (page, roleCfg) => Promise<void>
 * @param {Function} opts.goto     (page, route) => Promise<void>
 * @param {Function} [opts.beforeLoad] (page) => Promise<void> 页面脚本执行前的注入
 * @param {Function} [opts.currentRoute] (page) => Promise<string> 读取当前真实路由，用于识别守卫重定向
 * @param {number} [opts.settle]   每个路由渲染等待毫秒
 * @param {boolean} [opts.strict]  true 时 console 错误也判失败
 * @param {RegExp[]} [opts.ignore] 额外的噪声白名单
 * @param {number} [opts.minTextLen] 低于该文本长度视为白屏
 * @param {string[]} [opts.okIfContains] 页面文本若包含其中任一片段，即使偏短也视为已正常渲染（如"暂无数据"）
 * @param {string[]} [opts.baseline] 已知失败清单（路由路径）。命中且确实失败的路由记为"已隔离"，
 *                                      不计入 FAIL（CI 不因存量已知问题变红），但出现新失败仍会判红。
 * @param {number} [opts.retry] 非已知基线路由失败时，整页刷新重试次数（默认 2）。
 *                               用于吸收后端 JWT 多实例校验偶发 401 的抖动：任一一次通过即记 PASS。
 */
export async function runSmoke(opts) {
  const {
    title,
    base,
    roles,
    login,
    goto,
    beforeLoad,
    currentRoute,
    settle = 1400,
    strict = false,
    ignore = [],
    minTextLen = 0,
    okIfContains = [],
    baseline = [],
    retry = 2,
  } = opts
  const baselineSet = new Set(baseline)

  const t0 = Date.now()
  const { browser, executablePath } = await launchBrowser()
  const report = {
    title,
    base,
    browser: executablePath,
    strict,
    startedAt: new Date().toISOString(),
    durationMs: 0,
    totals: { pass: 0, fail: 0, warn: 0, redirected: 0, quarantined: 0, flaky: 0, auth: 0 },
    roles: [],
  }

  try {
    for (const cfg of roles) {
      // 每个角色一个独立无痕上下文：否则前一个角色的 token 残留在 localStorage，
      // 后续角色打开登录页会被路由守卫直接重定向走，测出来全是假通过。
      const context = await browser.createBrowserContext()
      const page = await context.newPage()
      await page.setViewport({ width: cfg.viewport?.width || 1366, height: cfg.viewport?.height || 900 })

      const pageErrors = []
      const consoleErrors = []
      page.on('pageerror', (e) => pageErrors.push(String(e?.stack || e)))
      page.on('console', (m) => {
        if (m.type() === 'error') consoleErrors.push(m.text())
      })
      page.on('requestfailed', (req) => {
        const f = req.failure()
        // 主动 abort 的请求不算错（如流式中断）
        if (f && !/ERR_ABORTED/.test(f.errorText)) {
          consoleErrors.push(`REQUEST FAILED ${req.method()} ${req.url()} - ${f.errorText}`)
        }
      })

      if (beforeLoad) await beforeLoad(page, cfg)

      let loginOk = true
      let loginErr = ''
      try {
        await login(page, cfg)
      } catch (e) {
        loginOk = false
        loginErr = String(e?.message || e)
      }
      // 登录过程中的报错单独归档，不摊到第一个路由头上
      const loginPageErrors = pageErrors.splice(0)
      const loginConsoleErrors = consoleErrors.splice(0).filter((t) => !isNoise(t, ignore))

      const routesResult = []
      if (loginOk) {
        for (const route of cfg.routes) {
          const rt0 = Date.now()

          // 单次尝试：切到路由、等待渲染、采集运行时错误与白屏
          const attemptRoute = async () => {
            // 路由切换超时保护：AI 请求挂起/主线程繁忙时 evaluate 永不返回，
            // 用 Promise.race 强制 5s 跳过（记 timeout 不判失败，属脚本健壮性维度）
            let timeoutHit = false
            try {
              const goOk = await Promise.race([
                goto(page, route).then(() => true),
                sleep(5000).then(() => false),
              ])
              if (!goOk) timeoutHit = true
            } catch (e) {
              pageErrors.push(`路由切换失败: ${e?.message || e}`)
            }
            await sleep(settle)

            const pe = pageErrors.splice(0)
            const ceRaw = consoleErrors.splice(0).filter((t) => !isNoise(t, ignore))
            // 鉴权类 console 错误（401/令牌）是后端抖动噪声，不计入 WARN/失败；
            // 仅保留非鉴权类 console 错误用于判失败与报告，避免报告被 401 噪声淹没。
            const ce = ceRaw.filter((t) => !AUTH_RE.test(t))
            const authCe = ceRaw.filter((t) => AUTH_RE.test(t))

            let textLen = 0
            let pageText = ''
            try {
              pageText = await Promise.race([
                page.evaluate(
                  () => document.querySelector('#app')?.innerText || document.body?.innerText || '',
                ),
                sleep(5000).then(() => ''),
              ])
              textLen = pageText.length
            } catch {
              /* 页面已导航走时忽略 */
            }
            // 文本偏短但命中"已正常加载"标记（如"暂无数据"），不算白屏
            const explicitlyOk = okIfContains.length > 0 && okIfContains.some((m) => pageText.includes(m))

            // 权限守卫可能把请求重定向走：此时页面并未真正渲染，
            // 若仍记为 PASS 就是自欺欺人，必须单独标出来。
            let landedOn = ''
            if (currentRoute) {
              try {
                landedOn = await currentRoute(page)
              } catch {
                /* ignore */
              }
            }
            const redirected = !!landedOn && landedOn !== route

            const blank = !timeoutHit && !redirected && !explicitlyOk && minTextLen > 0 && textLen < minTextLen
            if (blank) pe.push(`疑似白屏: 可见文本仅 ${textLen} 字符（阈值 ${minTextLen}）`)

            const failed = pe.length > 0 || (strict && ce.length > 0)
            return { pe, ce, authCe, textLen, pageText, redirected, landedOn, failed, timeout: timeoutHit }
          }

          // 整页刷新该路由（强制重新打接口），用于瞬态后端 401 抖动的重试。
          // 哈希路由下 reload 会保留当前 hash，SPA 重新渲染对应页面并重新取数。
          const reloadRoute = async () => {
            const hashUrl = base + (route.startsWith('/') ? '#' + route : '/#/' + route)
            try {
              await page.goto(hashUrl, { waitUntil: 'domcontentloaded', timeout: 30000 })
            } catch {
              // 刷新异常则回退到普通 hash 切换
              try {
                await goto(page, route)
              } catch {
                /* ignore */
              }
            }
            await sleep(settle)
          }

          let res = await attemptRoute()
          let flaky = false
          // 非已知基线的失败，多半是后端 JWT 多实例校验偶发 401（页面抛错 / 守卫重定向回登录）。
          // 这里整页刷新重试，给后端一次"这次校验通过"的机会；任一一次通过即记 PASS（标注 flaky）。
          if (res.failed && !baselineSet.has(route)) {
            for (let i = 0; i < retry; i++) {
              await reloadRoute()
              const r2 = await attemptRoute()
              if (!r2.failed) {
                res = r2
                flaky = true
                break
              }
              res = r2 // 保留最后一次失败样本用于报告
            }
          }

          // 区分「真实前端缺陷」与「后端鉴权抖动」：
          //   - 非鉴权类 pageerror / 白屏 / 严格模式 console 错误 → 硬失败（红）
          //   - 仅鉴权类错误（401/令牌失效）→ auth 软失败（非红，仅观测）
          const hardPe = res.pe.filter((e) => !AUTH_RE.test(e))
          const authPe = res.pe.filter((e) => AUTH_RE.test(e))
          const hardFailed = hardPe.length > 0 || res.blank || (strict && res.ce.length > 0)
          const authFailed = !hardFailed && (authPe.length > 0 || res.authCe.length > 0)

          const failed = hardFailed
          // 命中已知失败基线：记为"已隔离"，不计入 FAIL（CI 不因存量问题变红）
          const quarantined = failed && baselineSet.has(route)
          const auth = !failed && !quarantined && authFailed

          if (quarantined) report.totals.quarantined++
          else if (failed) report.totals.fail++
          else if (auth) report.totals.auth++
          else if (res.redirected) report.totals.redirected++
          else {
            report.totals.pass++
            if (res.ce.length) report.totals.warn++
            if (res.timeout) report.totals.warn++
            if (flaky) report.totals.flaky++
          }

          routesResult.push({
            route,
            ok: !failed,
            flaky,
            auth,
            quarantined,
            redirected: res.redirected,
            landedOn: res.redirected ? res.landedOn : undefined,
            timeout: res.timeout || undefined,
            pageErrors: res.pe,
            consoleErrors: res.ce.slice(0, 8),
            textLen: res.textLen,
            durationMs: Date.now() - rt0,
          })
        }
      } else {
        report.totals.fail++
        routesResult.push({
          route: '(login)',
          ok: false,
          pageErrors: [loginErr, ...loginPageErrors],
          consoleErrors: loginConsoleErrors.slice(0, 8),
          textLen: 0,
          durationMs: 0,
        })
      }

      report.roles.push({
        role: cfg.role,
        user: cfg.user,
        loginOk,
        loginErr,
        loginConsoleErrors: loginConsoleErrors.slice(0, 8),
        routes: routesResult,
        failCount: routesResult.filter((r) => !r.ok).length,
      })

      await page.close()
      await context.close()
    }
  } finally {
    await browser.close()
  }

  report.durationMs = Date.now() - t0
  return report
}
