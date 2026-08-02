// 冒烟报告输出：控制台文本 + JSON + JUnit XML（供 CI 测试报告面板解析）
import fs from 'node:fs'
import path from 'node:path'

/** XML 文本转义 */
function esc(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    // 去掉 XML 1.0 非法控制字符，否则 CI 解析器会直接报错
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '')
}

/** 生成人类可读的文本报告 */
export function renderText(report) {
  const L = []
  L.push(`===== ${report.title} =====`)
  L.push(`目标: ${report.base}`)
  L.push(`浏览器: ${report.browser}`)
  L.push(`开始: ${report.startedAt}   耗时: ${report.durationMs}ms`)
  L.push(
    `总计: PASS=${report.totals.pass}  FAIL=${report.totals.fail}  ` +
      `WARN=${report.totals.warn}  REDIRECT=${report.totals.redirected || 0}  ` +
      `QUARANTINED=${report.totals.quarantined || 0}  FLAKY=${report.totals.flaky || 0}  ` +
      `AUTH=${report.totals.auth || 0}`,
  )
  for (const rl of report.roles) {
    L.push('')
    L.push(
      `--- 角色 ${rl.role} (${rl.user}) 登录${rl.loginOk ? '成功' : '失败: ' + rl.loginErr} | ` +
        `失败 ${rl.failCount} / 共 ${rl.routes.length} ---`,
    )
    for (const r of rl.routes) {
      const tag = !r.ok
        ? r.quarantined
          ? 'KNOWN'
          : 'FAIL'
        : r.auth
          ? 'AUTH'
          : r.flaky
            ? 'FLKY'
            : r.redirected
              ? 'REDIR'
              : r.consoleErrors.length
                ? 'WARN'
                : 'PASS'
      const extra = r.redirected
        ? ` → 被守卫重定向至 ${r.landedOn}`
        : r.quarantined
          ? ' (已知问题，已隔离)'
          : r.auth
            ? ' (后端鉴权抖动，非前端缺陷)'
            : r.flaky
              ? ' (后端重试后通过，疑似令牌校验抖动)'
              : ''
      L.push(`[${tag}] ${r.route}  (textLen=${r.textLen}, ${r.durationMs}ms)${extra}`)
      for (const e of r.pageErrors) L.push(`      PAGEERROR: ${String(e).split('\n')[0]}`)
      for (const e of r.consoleErrors) L.push(`      CONSOLE: ${String(e).slice(0, 300)}`)
    }
  }
  // 汇总所有 console 错误，便于一眼看出共性问题（如统一的请求前缀写错）
  const allConsole = report.roles.flatMap((rl) =>
    rl.routes.flatMap((r) => r.consoleErrors.map((c) => `${rl.role} ${r.route} :: ${c}`)),
  )
  if (allConsole.length) {
    L.push('')
    L.push(`===== Console 错误汇总 (${allConsole.length}) =====`)
    for (const c of allConsole) L.push(`  - ${c.slice(0, 300)}`)
  }
  return L.join('\n')
}

/** 生成 JUnit XML，让 CI 的测试报告面板能按用例展示 */
export function renderJUnit(report) {
  const X = ['<?xml version="1.0" encoding="UTF-8"?>']
  const totalTests = report.roles.reduce((n, r) => n + r.routes.length, 0)
  X.push(
    `<testsuites name="${esc(report.title)}" tests="${totalTests}" ` +
      `failures="${report.totals.fail}" time="${(report.durationMs / 1000).toFixed(2)}">`,
  )
  for (const rl of report.roles) {
    const roleFails = rl.routes.filter((r) => !r.ok && !r.quarantined).length
    X.push(
      `  <testsuite name="${esc(rl.role)}" tests="${rl.routes.length}" failures="${roleFails}">`,
    )
    for (const r of rl.routes) {
      X.push(
        `    <testcase classname="${esc(rl.role)}" name="${esc(r.route)}" ` +
          `time="${((r.durationMs || 0) / 1000).toFixed(2)}">`,
      )
      if (!r.ok && !r.quarantined) {
        const detail = [...r.pageErrors, ...r.consoleErrors].join('\n')
        X.push(`      <failure message="${esc(String(r.pageErrors[0] || '页面异常').slice(0, 200))}">`)
        X.push(esc(detail.slice(0, 4000)))
        X.push('      </failure>')
      } else if (r.quarantined) {
        X.push(
          `      <system-out>已知问题（已隔离，不计入失败）: ${esc(
            [...r.pageErrors, ...r.consoleErrors].join(' | ').slice(0, 500),
          )}</system-out>`,
        )
      } else if (r.auth) {
        X.push(
          `      <system-out>后端鉴权抖动（401/令牌失效，非前端缺陷，不计入失败）: ${esc(
            [...r.pageErrors, ...r.consoleErrors].join(' | ').slice(0, 500),
          )}</system-out>`,
        )
      } else if (r.flaky) {
        X.push(
          `      <system-out>后端令牌校验抖动，整页刷新重试后通过（非前端缺陷）: ${esc(
            [...r.pageErrors, ...r.consoleErrors].join(' | ').slice(0, 500),
          )}</system-out>`,
        )
      } else if (r.consoleErrors.length) {
        X.push(`      <system-err>${esc(r.consoleErrors.join('\n').slice(0, 2000))}</system-err>`)
      }
      X.push('    </testcase>')
    }
    X.push('  </testsuite>')
  }
  X.push('</testsuites>')
  return X.join('\n')
}

/** 三种格式一起落盘，返回写出的文件路径 */
export function writeReports(report, outDir, name) {
  fs.mkdirSync(outDir, { recursive: true })
  const files = {
    json: path.join(outDir, `${name}.json`),
    txt: path.join(outDir, `${name}.txt`),
    xml: path.join(outDir, `${name}.junit.xml`),
  }
  fs.writeFileSync(files.json, JSON.stringify(report, null, 2), 'utf8')
  fs.writeFileSync(files.txt, renderText(report), 'utf8')
  fs.writeFileSync(files.xml, renderJUnit(report), 'utf8')
  return files
}
