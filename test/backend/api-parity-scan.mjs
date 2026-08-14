/**
 * API 一致性扫描器 v2（数据驱动）
 * 修正点：
 *   1. 识别所有文件（controller + module）中的 @Controller('path')
 *   2. 对 extends CrudController 的控制器自动生成标准 5 路由
 *      POST / GET / GET :id / PATCH :id / DELETE :id
 *   3. 对自定义控制器提取方法级装饰器（Get/Post/Put/Patch/Delete）
 *   4. 与 Web / Mini 前端调用路径做三方比对
 * 运行：node test/backend/api-parity-scan.mjs
 */
import fs from 'fs'
import path from 'path'

const ROOT = '/workspace/work-system'
const SRC = path.join(ROOT, 'server/src')
const WEB = path.join(ROOT, 'web-app/src')
const MINI = path.join(ROOT, 'mini-program/src')

function walk(dir, exts, out = []) {
  if (!fs.existsSync(dir)) return out
  for (const name of fs.readdirSync(dir)) {
    const p = path.join(dir, name)
    const st = fs.statSync(p)
    if (st.isDirectory()) {
      if (name === 'node_modules' || name === 'dist' || name === '.git') continue
      walk(p, exts, out)
    } else if (exts.some((e) => name.endsWith(e))) {
      out.push(p)
    }
  }
  return out
}

// ---------- 1. 后端路由表 ----------
const allTs = walk(SRC, ['.ts'])
const routeTable = [] // { method, path, file, kind }

function joinPath(base, sub) {
  const parts = [base, sub].filter((s) => s && s !== undefined && s !== '')
  return '/' + parts.join('/').replace(/\/+/g, '/')
}

for (const f of allTs) {
  const code = fs.readFileSync(f, 'utf8')
  const file = path.relative(SRC, f)
  // 按 @Controller 切块（一个文件可有多个控制器）
  const parts = code.split(/@Controller\s*\(/)
  for (let i = 1; i < parts.length; i++) {
    const chunk = '@Controller(' + parts[i]
    // 控制器前缀
    const pm = chunk.match(/^@Controller\(\s*['"`]([^'"`]*)['"`]/)
    if (!pm) continue
    const base = pm[1]
    // 该控制器类体：从 @Controller 到下一个 @Controller 或文件末尾
    const body = chunk.split(/@Controller\s*\(/).slice(1).join('@Controller(')
    // 角色
    const rm = chunk.match(/@Roles\(\s*([^)]*)\)/)
    const role = rm ? rm[1].trim() : ''
    const isCrud = /extends\s+CrudController/.test(chunk)
    const kind = isCrud ? 'crud' : 'custom'
    // 标准 CRUD 路由
    if (isCrud) {
      for (const [m, sub] of [['POST', ''], ['GET', ''], ['GET', ':id'], ['PATCH', ':id'], ['DELETE', ':id']]) {
        routeTable.push({ http: m, path: joinPath(base, sub), file, kind, role })
      }
    }
    // 方法级路由（自定义 + crud 扩展的额外方法）
    // 兼容 @Get()/@Post() 空括号（path 为空）与 @Get('path') 两种写法
    const methodRegex = /@(Get|Post|Put|Patch|Delete)\(\s*(?:['"`]([^'"`]*)['"`])?\s*\)/g
    let m
    while ((m = methodRegex.exec(body))) {
      const http = m[1].toUpperCase()
      const sub = m[2] || ''
      // 跳过 CRUD 控制器里与标准路由重复的部分（标准路由已按基类生成），只保留子类自定义装饰器
      // 方法级装饰器在基类 CrudController 中也有定义，但我们只在子类块里解析到它们——
      // 为去重，当 isCrud 时跳过这 5 个基础方法装饰器
      if (isCrud && ((http === 'POST' && sub === '') || (http === 'GET' && sub === '') || (http === 'GET' && sub === ':id') || (http === 'PATCH' && sub === ':id') || (http === 'DELETE' && sub === ':id'))) continue
      routeTable.push({ http, path: joinPath(base, sub), file, kind, role })
    }
  }
}

// ---------- 2. 提取前端 API 路径 ----------
function extractApiPaths(files, urlRegex) {
  const set = new Set()
  for (const f of files) {
    const code = fs.readFileSync(f, 'utf8')
    let m
    urlRegex.lastIndex = 0
    while ((m = urlRegex.exec(code))) {
      const u = m[1]
      if (u.startsWith('/') && !u.startsWith('//')) {
        const norm = u.replace(/\$\{[^}]*\}/g, ':id').replace(/:[a-zA-Z0-9_]+/g, ':id')
        set.add(norm)
      }
    }
  }
  return set
}

const webUrlRegex = /(?:request|get|post|put|del|patch|cachedGet|api\.(?:get|post|put|del|patch))\(\s*['"`]([^'"`]+)['"`]/g
const webFiles = [...walk(WEB, ['.ts']), ...walk(WEB, ['.vue'])]
const webPaths = extractApiPaths(webFiles, webUrlRegex)

const miniUrlRegex = /(?:api\.(?:get|post|put|del|patch)|parentApi\.(?:get|post|put|del)|request|getRaw|deleteRaw|patchRaw|postRaw|streamChat)\(\s*['"`]([^'"`]+)['"`]/g
const miniFiles = [...walk(MINI, ['.js']), ...walk(MINI, ['.vue'])]
const miniPaths = extractApiPaths(miniFiles, miniUrlRegex)

function clean(set) {
  const out = new Set()
  for (const u of set) {
    if (!u.startsWith('/')) continue
    if (u.startsWith('/static') || u.startsWith('/assets')) continue
    out.add(u)
  }
  return out
}
const webPathsClean = clean(webPaths)
const miniPathsClean = clean(miniPaths)

// ---------- 3. 比对 ----------
const serverPaths = new Set(routeTable.map((r) => r.path))
function routeExists(apiPath) {
  if (serverPaths.has(apiPath)) return true
  const segs = apiPath.split('/').filter(Boolean)
  for (const sp of serverPaths) {
    const ss = sp.split('/').filter(Boolean)
    if (ss.length !== segs.length) continue
    let ok = true
    for (let i = 0; i < ss.length; i++) {
      const s = ss[i]
      const a = segs[i]
      if (s.startsWith(':') || a.startsWith(':')) continue
      if (s !== a) { ok = false; break }
    }
    if (ok) return true
  }
  return false
}

const webOnly = [...webPathsClean].filter((p) => !routeExists(p)).sort()
const miniOnly = [...miniPathsClean].filter((p) => !routeExists(p)).sort()
const unusedByBoth = routeTable
  .filter((r) => ![...webPathsClean, ...miniPathsClean].some((p) => {
    if (p === r.path) return true
    const pSeg = p.split('/').filter(Boolean)
    const rSeg = r.path.split('/').filter(Boolean)
    if (pSeg.length !== rSeg.length) return false
    return pSeg.every((s, i) => s === rSeg[i] || s === ':id' || rSeg[i].startsWith(':'))
  }))
  .map((r) => `${r.http} ${r.path}`)

console.log('==== 后端路由总数:', routeTable.length, '(crud:', routeTable.filter((r) => r.kind === 'crud').length, 'custom:', routeTable.filter((r) => r.kind === 'custom').length, ')')
console.log('==== Web 调用路径数:', webPathsClean.size)
console.log('==== Mini 调用路径数:', miniPathsClean.size)
console.log('\n==== [差异1] Web 用了但后端没有匹配路由 ====')
console.log(webOnly.length ? webOnly.join('\n') : '(无)')
console.log('\n==== [差异2] Mini 用了但后端没有匹配路由 ====')
console.log(miniOnly.length ? miniOnly.join('\n') : '(无)')
console.log('\n==== [差异3] 后端存在但 Web/Mini 都未调用的路由 ====')
console.log(unusedByBoth.length ? unusedByBoth.join('\n') : '(无)')

const report = {
  generatedAt: new Date().toISOString(),
  serverRoutes: routeTable,
  webPaths: [...webPathsClean].sort(),
  miniPaths: [...miniPathsClean].sort(),
  webOnly,
  miniOnly,
  unusedByBoth,
}
fs.writeFileSync(path.join(ROOT, 'test/backend/api-parity-result.json'), JSON.stringify(report, null, 2))
console.log('\n[已保存] test/backend/api-parity-result.json')
