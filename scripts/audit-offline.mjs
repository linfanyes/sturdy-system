#!/usr/bin/env node
/**
 * 依赖漏洞审计（直连 npm bulk advisories API，绕开本机沙箱中会挂起的 npm audit CLI）。
 * 用法: node scripts/audit-offline.mjs <子项目目录>
 */
import { readFileSync, existsSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const target = process.argv[2]
if (!target) { console.error('usage: node audit-offline.mjs <project-dir>'); process.exit(2) }
const proj = join(here, '..', target)
const lockPath = join(proj, 'package-lock.json')
if (!existsSync(lockPath)) { console.error(`no lockfile: ${lockPath}`); process.exit(2) }

const lock = JSON.parse(readFileSync(lockPath, 'utf8'))
const pkgs = lock.packages || {}
const rootDeps = lock.packages?.['']?.dependencies || {}

// 重建 npm audit 请求的 dependencies 树（packages -> nested tree）
function buildTree(packages) {
  const tree = {}
  const paths = Object.keys(packages).filter(p => p !== '')
  // 按路径深度排序，保证父先于子
  paths.sort((a, b) => a.split('node_modules').length - b.split('node_modules').length)
  for (const p of paths) {
    const meta = packages[p]
    if (!meta?.version) continue
    const segs = p.split('/node_modules/')
    const name = segs[segs.length - 1]
    if (!name) continue
    let node = tree
    // 定位父节点（嵌套场景 node_modules/@scope/pkg/node_modules/dep）
    for (let i = 0; i < segs.length - 1; i++) {
      const parentName = segs[i]
      if (!node[parentName]) node[parentName] = { version: packages[p.slice(0, p.lastIndexOf('/' + parentName))]?.version || '*', requires: {}, dependencies: {} }
      node = node[parentName].dependencies
    }
    node[name] = {
      version: meta.version,
      integrity: meta.integrity || undefined,
      requires: meta.dependencies ? Object.fromEntries(Object.entries(meta.dependencies).map(([n, v]) => [n, typeof v === 'string' ? v : v?.version || '*'])) : {},
      dependencies: {},
    }
  }
  return tree
}

const tree = buildTree(pkgs)
const reqBody = {
  name: lock.name || 'project',
  version: lock.version || '1.0.0',
  requires: Object.fromEntries(Object.entries(rootDeps || {}).map(([n, v]) => [n, typeof v === 'string' ? v : v?.version || '*'])),
  dependencies: tree,
}

const res = await fetch('https://registry.npmjs.org/-/npm/v1/security/advisories/bulk', {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify(reqBody),
})
if (!res.ok) { console.error(`API ${res.status}: ${await res.text().catch(() => '')}`); process.exit(1) }
const data = await res.json()

const sevCount = { critical: 0, high: 0, moderate: 0, low: 0 }
const rows = []
for (const [key, advisories] of Object.entries(data)) {
  for (const adv of advisories || []) {
    const sev = adv.severity || 'unknown'
    sevCount[sev] = (sevCount[sev] || 0) + 1
    rows.push({
      pkg: key,
      sev,
      title: (adv.title || adv.cve || '').slice(0, 90),
      range: adv.vulnerable_versions || '',
      fix: adv.patched_versions || '',
    })
  }
}

console.log(`\n=== ${target} 依赖漏洞审计 (npm bulk API) ===`)
console.log(`scanned: ${Object.keys(pkgs).length} lock entries | total vulns: ${rows.length} | critical: ${sevCount.critical} | high: ${sevCount.high} | moderate: ${sevCount.moderate} | low: ${sevCount.low}`)
const order = { critical: 0, high: 1, moderate: 2, low: 3 }
rows.sort((a, b) => (order[a.sev] ?? 9) - (order[b.sev] ?? 9))
for (const r of rows.slice(0, 50)) {
  console.log(` [${r.sev}] ${r.pkg}  fix<=${r.fix || 'N/A'}  ${r.title}`)
}
