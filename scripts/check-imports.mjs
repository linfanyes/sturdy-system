/**
 * check-imports.mjs — 全面扫描项目内模块的「具名导入是否真实存在」
 *
 * 目的：复现 vite dev / 浏览器原生 ESM 的
 *   "The requested module '...' does not provide an export named 'X'"
 * 类运行时错误，一次性找出所有同类问题（之前 games.ts 已连踩 3 个）。
 *
 * 覆盖范围：
 *   - web-app/src（.ts/.tsx/.js/.jsx/.vue）
 *   - mini-program/src（.js/.ts/.vue）
 *   - shared/（全部 .ts）
 * 校验对象：项目内模块（相对路径 / @gardener/shared / @ 别名）的非 type 具名导入。
 *   - import type { X } 与 import { type X } 在 vite transform 时被剥离，不校验。
 *   - node_modules 包不做导出解析（跳过）。
 *
 * 用法：node scripts/check-imports.mjs [--report out.json]
 */
import fs from 'node:fs'
import path from 'node:path'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..')
const require = createRequire(path.join(ROOT, 'web-app/package.json'))
const parser = require('@babel/parser')
const sfc = require('@vue/compiler-sfc')

const ALIASES = {
  '@gardener/shared': path.join(ROOT, 'shared'),
  '@': path.join(ROOT, 'web-app/src'),
}
const SCAN_ROOTS = [path.join(ROOT, 'web-app/src'), path.join(ROOT, 'mini-program/src'), path.join(ROOT, 'shared')]
const EXT_CANDIDATES = ['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs', '.vue']

const parseErrors = []

// ---------- 文件收集 ----------
function collectFiles(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name === 'dist' || entry.name === 'dist-build') continue
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) collectFiles(full, out)
    else if (/\.(ts|tsx|js|jsx|mjs|vue)$/.test(entry.name)) out.push(full)
  }
  return out
}

// ---------- 模块解析 ----------
function resolveModule(fromFile, spec) {
  const clean = spec.split('?')[0]
  if (clean.startsWith('@gardener/shared/')) {
    return resolveAsFile(path.join(ALIASES['@gardener/shared'], clean.slice('@gardener/shared/'.length)))
  }
  if (clean.startsWith('@/')) return resolveAsFile(path.join(ALIASES['@'], clean.slice(2)))
  if (clean.startsWith('.')) return resolveAsFile(path.resolve(path.dirname(fromFile), clean))
  return null // node_modules / 绝对路径 / 其它 → 跳过
}

function resolveAsFile(p) {
  if (fs.existsSync(p) && fs.statSync(p).isFile()) return p
  for (const ext of EXT_CANDIDATES) {
    if (fs.existsSync(p + ext)) return p + ext
  }
  if (fs.existsSync(p) && fs.statSync(p).isDirectory()) {
    for (const ext of EXT_CANDIDATES) {
      if (fs.existsSync(path.join(p, 'index' + ext))) return path.join(p, 'index' + ext)
    }
  }
  return null
}

// ---------- 提取 script（vue 用 compiler-sfc） ----------
const CODE_EXTS = new Set(['ts', 'tsx', 'js', 'jsx', 'mjs', 'cjs', 'vue'])
function extractScripts(file) {
  const ext = path.extname(file).slice(1)
  if (!CODE_EXTS.has(ext)) return [] // css/scss/json 等副作用导入目标，无 JS 导出可解析
  const raw = fs.readFileSync(file, 'utf8')
  if (file.endsWith('.vue')) {
    const { descriptor } = sfc.parse(raw, { filename: file })
    const scripts = []
    if (descriptor.script) scripts.push({ code: descriptor.script.content, lang: descriptor.script.lang || 'js' })
    if (descriptor.scriptSetup) scripts.push({ code: descriptor.scriptSetup.content, lang: descriptor.scriptSetup.lang || 'js' })
    return scripts
  }
  return [{ code: raw, lang: path.extname(file).slice(1) }]
}

function parseWithLang(code, lang) {
  const plugins = []
  if (lang === 'ts' || lang === 'tsx') plugins.push('typescript')
  if (lang === 'tsx' || lang === 'jsx') plugins.push('jsx')
  try {
    return parser.parse(code, { sourceType: 'module', plugins, errorRecovery: false })
  } catch (e) {
    // js 解析失败 → 用 typescript 插件重试（避免 lang 缺失误判）
    if (!plugins.includes('typescript')) {
      return parser.parse(code, { sourceType: 'module', plugins: [...plugins, 'typescript'] })
    }
    throw e
  }
}

function collectIds(node, out = []) {
  if (!node) return out
  if (node.type === 'Identifier') out.push(node.name)
  else if (node.type === 'ObjectPattern') for (const p of node.properties) collectIds(p.type === 'RestElement' ? p.argument : p.value, out)
  else if (node.type === 'ArrayPattern') for (const el of node.elements) if (el) collectIds(el, out)
  else if (node.type === 'AssignmentPattern') collectIds(node.left, out)
  else if (node.type === 'RestElement') collectIds(node.argument, out)
  return out
}

// ---------- 解析模块导出集合（含 export * 递归），带缓存 ----------
const exportCache = new Map()
const resolveCache = new Map()

function resolveModuleCached(fromFile, spec) {
  const key = fromFile + '\u0000' + spec
  if (!resolveCache.has(key)) resolveCache.set(key, resolveModule(fromFile, spec))
  return resolveCache.get(key)
}

function getExports(file, seen = new Set()) {
  if (exportCache.has(file)) return exportCache.get(file)
  if (seen.has(file)) return { names: new Set(), types: new Set() } // 循环引用截断
  seen.add(file)
  const names = new Set()
  const types = new Set()
  try {
    for (const { code, lang } of extractScripts(file)) {
      const ast = parseWithLang(code, lang)
      for (const node of ast.program.body) {
        if (node.type === 'ExportNamedDeclaration') {
          const decl = node.declaration
          if (decl) {
            if (decl.type === 'VariableDeclaration') {
              for (const v of decl.declarations) collectIds(v.id).forEach((n) => names.add(n))
            } else if (decl.type === 'FunctionDeclaration' || decl.type === 'ClassDeclaration' || decl.type === 'TSDeclareFunction') {
              if (decl.id) names.add(decl.id.name)
            } else if (decl.type === 'TSInterfaceDeclaration' || decl.type === 'TSTypeAliasDeclaration' || decl.type === 'TSEnumDeclaration' || decl.type === 'TSModuleDeclaration') {
              if (decl.id) types.add(decl.id.name)
            }
          }
          if (node.source) {
            // export { x } from '...' / export { default } from '...'
            const target = resolveModuleCached(file, node.source.value)
            if (target) {
              const sub = getExports(target, seen)
              for (const s of node.specifiers) {
                if (s.type !== 'ExportSpecifier') continue
                const exported = s.exported.name
                if (sub.names.has(exported)) names.add(exported)
                else if (sub.types.has(exported)) types.add(exported)
              }
            }
          } else {
            for (const s of node.specifiers) {
              if (s.type === 'ExportSpecifier') names.add(s.exported.name)
            }
          }
        } else if (node.type === 'ExportAllDeclaration') {
          if (node.source && !node.exported) {
            const target = resolveModuleCached(file, node.source.value)
            if (target) {
              const sub = getExports(target, seen)
              for (const n of sub.names) names.add(n)
              for (const n of sub.types) types.add(n)
            }
          } else if (node.source && node.exported) {
            names.add(node.exported.name) // export * as ns
          }
        }
      }
    }
  } catch (e) {
    parseErrors.push({ file: rel(file), msg: String(e.message || e).split('\n')[0] })
  }
  exportCache.set(file, { names, types })
  return exportCache.get(file)
}

const rel = (f) => path.relative(ROOT, f).replace(/\\/g, '/')

// ---------- 主扫描 ----------
const files = SCAN_ROOTS.flatMap((r) => collectFiles(r))
const problems = []
const typeAsValue = []
let importCount = 0
let fileCount = 0

for (const file of files) {
  let hasImport = false
  try {
    for (const { code, lang } of extractScripts(file)) {
      const ast = parseWithLang(code, lang)
      for (const node of ast.program.body) {
        if (node.type !== 'ImportDeclaration') continue
        if (node.importKind === 'type') continue
        const target = resolveModuleCached(file, node.source.value)
        if (!target) continue
        const exp = getExports(target)
        for (const spec of node.specifiers) {
          if (spec.type !== 'ImportSpecifier') continue
          if (spec.importKind === 'type') continue
          const imported = spec.imported.name
          if (imported === 'default') continue
          importCount++
          if (exp.names.has(imported)) continue
          if (exp.types.has(imported)) {
            // 目标只有 type 导出、此处却用 value 导入 —— vite dev 下浏览器同样会报 does not provide
            typeAsValue.push({ file: rel(file), line: node.loc.start.line, imported, from: node.source.value, target: rel(target) })
            continue
          }
          problems.push({ file: rel(file), line: node.loc.start.line, imported, from: node.source.value, target: rel(target) })
        }
        hasImport = true
      }
    }
  } catch (e) {
    parseErrors.push({ file: rel(file), msg: String(e.message || e).split('\n')[0] })
  }
  if (hasImport) fileCount++
}

// ---------- 辅助：缺失符号是否存在于 shared 其它文件（提示正确来源） ----------
function findInShared(name) {
  const hits = []
  for (const [f, exp] of exportCache) {
    if (f.startsWith(ALIASES['@gardener/shared']) && (exp.names.has(name) || exp.types.has(name))) hits.push(rel(f))
  }
  return hits
}

// ---------- 输出 ----------
const lines = []
lines.push(`=== 导入完整性扫描报告 ===`)
lines.push(`扫描文件: ${files.length}  含导入文件: ${fileCount}  具名导入校验数: ${importCount}`)
lines.push(``)
if (problems.length === 0) {
  lines.push(`✅ 未发现「导入不存在的具名导出」问题`)
} else {
  lines.push(`❌ 发现 ${problems.length} 处问题:`)
  lines.push(``)
  for (const p of problems) {
    const hint = findInShared(p.imported)
    lines.push(`  ${p.file}:${p.line}  import { ${p.imported} } from '${p.from}'`)
    lines.push(`      → 目标 ${p.target} 无此导出`)
    if (hint.length) lines.push(`      → 提示: 该符号存在于 ${hint.join(', ')}（可能导错来源）`)
    lines.push(``)
  }
}
if (typeAsValue.length) {
  lines.push(`⚠️  type-only 符号被 value 导入（建议加 type 关键字，浏览器端可能报 does not provide）: ${typeAsValue.length}`)
  lines.push(``)
  for (const p of typeAsValue.slice(0, 40)) {
    lines.push(`  ${p.file}:${p.line}  import { ${p.imported} } from '${p.from}'  → 目标仅导出该 type`)
  }
  if (typeAsValue.length > 40) lines.push(`  ... 还有 ${typeAsValue.length - 40} 处`)
  lines.push(``)
}
if (parseErrors.length) {
  lines.push(`⚠️  解析失败（已跳过，需人工确认）: ${parseErrors.length}`)
  for (const e of parseErrors.slice(0, 30)) lines.push(`  ${e.file}: ${e.msg}`)
}
const out = lines.join('\n')
console.log(out)

const reportIdx = process.argv.indexOf('--report')
if (reportIdx !== -1 && process.argv[reportIdx + 1]) {
  fs.writeFileSync(
    process.argv[reportIdx + 1],
    JSON.stringify({ scanned: files.length, importCount, problems, parseErrors: parseErrors.slice(0, 50) }, null, 2),
  )
  console.log(`\n报告已写入: ${process.argv[reportIdx + 1]}`)
}
process.exit(problems.length ? 1 : 0)
