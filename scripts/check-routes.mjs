#!/usr/bin/env node
/**
 * Web 路由断链检查：校验 router/index.ts 中所有懒加载组件的文件真实存在。
 * 用法：node scripts/check-routes.mjs
 * 输出：断链清单（无则全绿）。
 */
import fs from 'node:fs'
import path from 'node:path'

const ROOT = path.resolve(import.meta.dirname, '..')
const WEB_SRC = path.join(ROOT, 'web-app', 'src')
const ROUTER = path.join(WEB_SRC, 'router', 'index.ts')

const code = fs.readFileSync(ROUTER, 'utf8')
const re = /component:\s*\(\)\s*=>\s*import\(['"]([^'"]+)['"]\)/g
let m
const missing = []
const found = []
let total = 0
while ((m = re.exec(code))) {
  total++
  const spec = m[1]
  // 解析相对路径：以 @/ 或 ./ 开头
  let abs
  if (spec.startsWith('@/')) {
    abs = path.join(WEB_SRC, spec.slice(2))
  } else if (spec.startsWith('./')) {
    abs = path.resolve(path.dirname(ROUTER), spec)
  } else {
    // 裸包名（如 lucide 等）：跳过
    continue
  }
  if (!/\.(vue|ts|tsx|js|mjs)$/.test(abs)) abs += '.vue'
  if (fs.existsSync(abs)) found.push(spec)
  else missing.push({ spec, abs })
}

console.log(`路由懒加载组件共 ${total} 处，文件存在 ${found.length} 处`)
if (missing.length) {
  console.log(`\n❌ 发现 ${missing.length} 处断链：`)
  for (const { spec, abs } of missing) console.log(`  ${spec}  →  期望路径 ${abs} 不存在`)
  process.exit(1)
} else {
  console.log('✅ 全部路由组件文件存在，无断链')
}
