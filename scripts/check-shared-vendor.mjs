// 校验 server/vendor/gardener-shared/dist 是否与 shared/dist 一致（防改 shared/ 后漏同步导致云构建失败）。
//
// 用法：
//   node scripts/check-shared-vendor.mjs            # 校验（不一致 exit 1）
//   node scripts/check-shared-vendor.mjs --update   # 校验并自动同步（供本机开发使用）
//
// 判定策略：以 shared/dist 为基准，逐文件比较相对路径 + 内容哈希。
// shared/dist 缺失时：无法判定 → 直接放行（CI 里 shared 阶段会先 build）。
import { readFileSync, existsSync, statSync, readdirSync } from 'node:fs'
import { dirname, join, resolve, relative } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createHash } from 'node:crypto'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = resolve(__dirname, '..')
const src = resolve(root, 'shared/dist')
const dest = resolve(root, 'server/vendor/gardener-shared/dist')
const isUpdate = process.argv.includes('--update')

function hashFile(p) {
  return createHash('sha256').update(readFileSync(p)).digest('hex')
}

function walk(dir, base, out) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name)
    if (statSync(p).isDirectory()) walk(p, base, out)
    else out.push(relative(base, p).replace(/\\/g, '/'))
  }
  return out
}

if (!existsSync(src)) {
  console.log('[check-shared-vendor] SKIP: shared/dist 不存在（CI 中 shared 阶段会先构建；本机请先 cd shared && npm run build）')
  process.exit(0)
}

const srcFiles = walk(src, src, [])
const destFiles = existsSync(dest) ? walk(dest, dest, []) : []

const missing = srcFiles.filter(f => !destFiles.includes(f))
const extra = destFiles.filter(f => !srcFiles.includes(f))
const changed = srcFiles.filter(f => destFiles.includes(f) && hashFile(join(src, f)) !== hashFile(join(dest, f)))

const problems = [...missing.map(f => `缺失: ${f}`), ...changed.map(f => `不一致: ${f}`), ...extra.map(f => `多余: ${f}`)]
if (problems.length === 0) {
  console.log(`[check-shared-vendor] OK: ${srcFiles.length} 个文件全部一致`)
  process.exit(0)
}

console.log(`[check-shared-vendor] FAIL: 发现 ${problems.length} 处差异（shared/dist 与 vendor/gardener-shared/dist 不同步）`)
for (const p of problems.slice(0, 30)) console.log(`  - ${p}`)
if (problems.length > 30) console.log(`  ... 其余 ${problems.length - 30} 处省略`)

if (isUpdate) {
  const { rmSync, mkdirSync, cpSync } = await import('node:fs')
  rmSync(dest, { recursive: true, force: true })
  mkdirSync(dirname(dest), { recursive: true })
  cpSync(src, dest, { recursive: true })
  console.log('[check-shared-vendor] 已自动同步（--update）。请将 server/vendor/gardener-shared/dist 一起提交。')
  process.exit(0)
}

console.log('[check-shared-vendor] 修复方式: npm run vendor:shared（在 server/ 下）或 node scripts/check-shared-vendor.mjs --update')
process.exit(1)
