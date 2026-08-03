import { execSync } from 'node:child_process'
import { existsSync, readFileSync, mkdirSync, cpSync, readdirSync, statSync } from 'node:fs'
import { join, dirname } from 'node:path'

const E2E = 'D:/workspace/my-prj/tercher-work/work-system/e2e'
const TMP = 'D:/workspace/my-prj/tercher-work/work-system/.repair-tmp2'
mkdirSync(TMP, { recursive: true })

// 收集所有 package.json
const pkgs = []
function walk(dir) {
  let ents
  try { ents = readdirSync(dir) } catch { return }
  for (const e of ents) {
    if (e === 'node_modules' && dir !== E2E) { /* 仍递归嵌套 node_modules */ }
    const p = join(dir, e)
    let st
    try { st = statSync(p) } catch { continue }
    if (e === 'node_modules') { walk(p); continue }
    if (st.isDirectory()) {
      if (e === 'package.json') continue
      const pj = join(p, 'package.json')
      if (existsSync(pj)) pkgs.push(p)
      else walk(p)
    }
  }
}
walk(E2E)

function hasEntry(pkgDir) {
  const pj = join(pkgDir, 'package.json')
  let main = 'index.js'
  try { const j = JSON.parse(readFileSync(pj, 'utf8')); main = (j.main) || (j.exports && (typeof j.exports === 'string' ? j.exports : (j.exports['.'] && (j.exports['.'].require || j.exports['.'].default)))) || 'index.js' } catch {}
  if (typeof main !== 'string') main = 'index.js'
  const candidates = [main, 'index.js', 'dist/index.js', 'lib/index.js', 'src/index.js', 'build/index.js']
  return candidates.some((c) => existsSync(join(pkgDir, c)))
}

const broken = pkgs.filter((d) => !hasEntry(d)).filter((d) => {
  try { const j = JSON.parse(readFileSync(join(d, 'package.json'), 'utf8')); return !j.name.startsWith('@types/') } catch { return true }
})
console.log('扫描包数:', pkgs.length, ' 入口缺失(疑似损坏, 排除@types):', broken.length)
let repaired = 0, failed = 0
for (const d of broken) {
  let name, ver
  try { const j = JSON.parse(readFileSync(join(d, 'package.json'), 'utf8')); name = j.name; ver = j.version } catch { continue }
  if (!name || !ver) continue
  try {
    const tgz = `${name.replace('/', '-')}-${ver}.tgz`
    execSync(`npm pack ${name}@${ver}`, { cwd: TMP, stdio: 'ignore' })
    const exDir = join(TMP, '_x')
    mkdirSync(exDir, { recursive: true })
    execSync(`tar -xzf ${tgz} -C ${exDir}`, { cwd: TMP, stdio: 'ignore' })
    cpSync(join(exDir, 'package'), d, { recursive: true, force: true, verbatimSymlinks: true })
    repaired++
    console.log(`  ✅ 修复 ${name}@${ver}`)
  } catch (e) {
    failed++
    console.log(`  ❌ 失败 ${name}@${ver}: ${String(e.message).slice(0, 80)}`)
  }
}
console.log(`\n修复完成: 成功 ${repaired} / 失败 ${failed}`)
