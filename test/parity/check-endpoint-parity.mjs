/**
 * 两端 API 端点一致性检查（Web ⇄ 小程序）
 *
 * 目标：验证终极目标「两端调用是否都是相同后端 api」。
 * 方法：扫描 web-app/src/api/*.ts 与 mini-program/src/api/*.js、mini-program/src/common/*.js
 *       中所有形如 '/xxx' 的路径字面量（含模板字符串与 '/x/' + id 拼接），
 *       归一化后对比两端端点集合，输出「一致 / 仅一端」清单。
 *
 * 用法：node test/parity/check-endpoint-parity.mjs
 */
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '../..')

const WEB_API_DIR = path.join(ROOT, 'web-app/src/api')
const MINI_API_DIR = path.join(ROOT, 'mini-program/src/api')
const MINI_COMMON_DIR = path.join(ROOT, 'mini-program/src/common')
// 小程序页面层也会直接发起请求（如 admin 面板的 apiCall('GET','/admin/schools')），
// 一并扫描，避免把「页面直呼」误判为两端不一致。
const MINI_PAGES_DIR = path.join(ROOT, 'mini-program/src/pages')

/** 收集一个目录下所有源码文件 */
function listSourceFiles(dir, exts = ['.ts', '.js', '.tsx', '.vue', '.jsx']) {
  if (!fs.existsSync(dir)) return []
  const out = []
  for (const name of fs.readdirSync(dir)) {
    const full = path.join(dir, name)
    const st = fs.statSync(full)
    if (st.isDirectory()) out.push(...listSourceFiles(full, exts))
    else if (exts.includes(path.extname(name))) out.push(full)
  }
  return out
}

/**
 * 从源码中提取 API 路径字面量。
 * 规则：
 *  - 双引号/单引号字符串：' 开头且内容形如 /xxx
 *  - 模板字符串：`/xxx/${id}` 归一化为 /xxx/:id；`/x/${a}/${b}` → /x/:a/:b → 归一化 /x/:p/:p
 *  - 路径拼接：'/x/' + id → /x/:id；'/x/' + p + '/detail' → /x/:p/detail
 * 归一化：去掉查询串(?…)、去掉尾部 /、把数字/变量段替换为 :p。
 */
function extractPaths(src) {
  const paths = new Set()

  // 1) 普通字符串字面量：'/' ... 或 "/" ...（排除 http、文件名）
  const strRe = /['"`](\/[^'"`]*?)['"`]/g
  let m
  while ((m = strRe.exec(src)) !== null) {
    const raw = m[1]
    // 过滤非 API 路径：带 http、含空格、含 '.' 扩展名、含 '\n'
    if (/^(https?:)?\/\//.test(raw)) continue
    if (/[\\\n ]/.test(raw)) continue
    if (/\.(html|css|js|png|jpg|svg|ico|json)$/.test(raw)) continue
    if (!raw.startsWith('/')) continue
    paths.add(normalize(raw))
  }

  // 2) 模板字符串内嵌：`/x/${id}`、`/x/${p}/detail` 等
  const tplRe = /`([^`]*?\/[^`]*)`/g
  while ((m = tplRe.exec(src)) !== null) {
    const tpl = m[1]
    if (/https?:/.test(tpl)) continue
    const normalized = tpl
      .replace(/\$\{[^}]*\}/g, ':p')   // ${id} → :p
      .replace(/[\\\n ]/g, '')
    if (normalized.startsWith('/')) paths.add(normalize(normalized))
  }

  // 3) 字符串拼接链：'/x/' + id 或 '/x/' + p + '/detail'（跨行亦可）
  const concatRe = /(['"`][^'"`]*?['"`])(\s*\+\s*['"`][^'"`]*?['"`])+/g
  while ((m = concatRe.exec(src)) !== null) {
    const chain = m[0]
    let normalized = chain
      .split(/\s*\+\s*/)
      .map((seg) => seg.trim().replace(/^['"`]|['"`]$/g, ''))
      .map((seg) => (/^['"`]/.test(seg) || seg.startsWith('${') ? seg : ':p')) // 非字面量段 → :p
      .join('')
    if (/https?:/.test(normalized)) continue
    normalized = normalized.replace(/\$\{[^}]*\}/g, ':p').replace(/[\\\n ]/g, '')
    if (normalized.startsWith('/')) paths.add(normalize(normalized))
  }

  return paths
}

/** 归一化路径：去查询串、去尾部 /、变量段统一为 :p */
function normalize(p) {
  let s = p.split('?')[0].replace(/\/+$/, '')
  // 把 ':' 参数段统一：:id / :gameKey 等 → :p
  s = s.replace(/\/:[^/]+/g, '/:p')
  return s
}

/**
 * 判断是否为「真正的后端 API 路径」。
 * 排除：
 *  - uni-app 内部页面路由（/pages/...、/subpkg/...、/tabbar/...）
 *  - 拼接残留的短片段（<2 段，如 /path、/members、/detail 等，属 '/x/' + id 拆解产物）
 *  - 静态资源
 */
function isApiPath(p) {
  if (/^\/pages\//.test(p) || /^\/subpkg\//.test(p) || /^\/tabbar\//.test(p)) return false
  const segs = p.split('/').filter(Boolean)
  if (segs.length < 2) return false
  return true
}

/** 扫描并返回 { file → Set(paths) } */
function scanDir(dir) {
  const result = {}
  for (const file of listSourceFiles(dir)) {
    const src = fs.readFileSync(file, 'utf8')
    const paths = extractPaths(src)
    if (paths.size) {
      const filtered = [...paths].filter(isApiPath).sort()
      if (filtered.length) result[path.relative(ROOT, file)] = filtered
    }
  }
  return result
}

/** 汇总某端的全部路径（含文件名来源，便于定位） */
function collect(scan) {
  const map = new Map() // path → Set(file)
  for (const [file, paths] of Object.entries(scan)) {
    for (const p of paths) {
      if (!map.has(p)) map.set(p, new Set())
      map.get(p).add(file)
    }
  }
  return map
}

// ========== 主流程 ==========
const webScan = scanDir(WEB_API_DIR)
const miniScan = { ...scanDir(MINI_API_DIR), ...scanDir(MINI_COMMON_DIR), ...scanDir(MINI_PAGES_DIR) }

const webMap = collect(webScan)
const miniMap = collect(miniScan)

const webOnly = []
const miniOnly = []
const both = []
for (const p of new Set([...webMap.keys(), ...miniMap.keys()])) {
  const w = webMap.has(p)
  const mn = miniMap.has(p)
  if (w && mn) both.push(p)
  else if (w) webOnly.push({ p, files: [...webMap.get(p)] })
  else miniOnly.push({ p, files: [...miniMap.get(p)] })
}
both.sort()
webOnly.sort((a, b) => a.p.localeCompare(b.p))
miniOnly.sort((a, b) => a.p.localeCompare(b.p))

console.log('==== 两端 API 端点一致性检查 ====\n')
console.log(`扫描文件：Web ${Object.keys(webScan).length} 个 / 小程序 ${Object.keys(miniScan).length} 个`)
console.log(`端点总数：Web ${webMap.size} / 小程序 ${miniMap.size}`)
console.log(`两端一致端点：${both.length} / 仅 Web：${webOnly.length} / 仅小程序：${miniOnly.length}\n`)

console.log('— 两端一致端点（共同调用同一后端 API）—')
console.log(both.join('\n'))

if (webOnly.length) {
  console.log('\n— 仅 Web 端调用 —')
  for (const { p, files } of webOnly) console.log(`  ${p}\n     <- ${files.join(', ')}`)
}
if (miniOnly.length) {
  console.log('\n— 仅小程序端调用 —')
  for (const { p, files } of miniOnly) console.log(`  ${p}\n     <- ${files.join(', ')}`)
}

console.log('\n==== 结论 ====')
if (webOnly.length === 0 && miniOnly.length === 0) {
  console.log('✅ 两端调用的后端端点完全一致（同一套 /api/v1 后端）。')
} else {
  console.log(`⚠️ 存在差异端点（仅 Web ${webOnly.length} / 仅小程序 ${miniOnly.length}）。
   注意：仅一端调用不一定是缺陷——某些功能按设计只出现在一端（如超管/校管专属页），
   但需人工确认是否属于「功能差异需要补齐」范畴。`)
}
