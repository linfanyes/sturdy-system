import fs from 'fs'
import path from 'path'

const root = '/workspace/work-system/server/src'
function walk(dir, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name)
    if (e.isDirectory()) walk(p, out)
    else if (e.name.endsWith('.ts') && !e.name.endsWith('.spec.ts')) out.push(p)
  }
  return out
}

const files = walk(root).sort()
const out = []
for (const f of files) {
  const s = fs.readFileSync(f, 'utf8')
  if (!/@Controller\(/.test(s)) continue
  const rel = path.relative(root, f)
  // 找所有 @Controller('prefix') 及后续 class 名
  const ctrlRe = /@Controller\(\s*(['"]([^'"]*)['"])?\s*\)/g
  let cm
  const ctrlDefs = []
  while ((cm = ctrlRe.exec(s))) {
    // 找装饰器后最近的 class 行
    const after = s.slice(cm.index)
    const clsM = after.match(/(?:export\s+)?class\s+(\w+)/)
    ctrlDefs.push({ prefix: cm[2] || '', className: clsM ? clsM[1] : '?' })
  }
  if (!ctrlDefs.length) continue
  const isCrudAny = /extends\s+CrudController/.test(s)
  // 扫描所有 HTTP 装饰器
  const methods = []
  const mRe = /@(Get|Post|Put|Patch|Delete)\(\s*(?:['"]([^'"]*)['"])?\s*\)/g
  let m
  while ((m = mRe.exec(s))) {
    methods.push({ verb: m[1], sub: m[2] || '' })
  }
  // 去重方法（同一文件可能因多类重复扫描）
  const seenM = new Set()
  const uniqMethods = methods.filter((x) => {
    const k = x.verb + '|' + x.sub
    if (seenM.has(k)) return false
    seenM.add(k)
    return true
  })
  for (const c of ctrlDefs) {
    out.push(`\n### /${c.prefix}  [${c.className}]  <- ${rel}`)
    for (const mm of uniqMethods) {
      const full = mm.sub ? `${c.prefix}/${mm.sub}` : c.prefix
      out.push(`  ${mm.verb.toUpperCase().padEnd(6)} /${full}`)
    }
  }
}
fs.writeFileSync('/tmp/api-full2.txt', out.join('\n'))
console.log('done, lines:', out.join('\n').split('\n').length)
