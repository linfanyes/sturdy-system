#!/usr/bin/env node
/**
 * 校验 server 本地 FEATURE_FLAGS 副本与 shared/constants 单一来源一致（历史债 #9/#15）。
 * 用法: node scripts/check-feature-sync.js （在 server/ 目录执行）
 * CI: .github/workflows/ci.yml 的 backend-check job 调用；不一致即红。
 */
'use strict'
const fs = require('fs')
const path = require('path')

function extractFlags(file) {
  const src = fs.readFileSync(file, 'utf8')
  const m = src.match(/export const FEATURE_FLAGS:\s*string\[\]\s*=\s*\[([\s\S]*?)\]/)
  if (!m) throw new Error('无法解析 FEATURE_FLAGS: ' + file)
  return [...m[1].matchAll(/'([^']+)'/g)].map((x) => x[1])
}

const sharedFile = path.join(__dirname, '..', '..', 'shared', 'constants', 'index.ts')
const serverFile = path.join(__dirname, '..', 'src', 'common', 'feature', 'feature-flags.constants.ts')

const shared = extractFlags(sharedFile)
const server = extractFlags(serverFile)

if (JSON.stringify(shared) !== JSON.stringify(server)) {
  console.error('[check-feature-sync] FEATURE_FLAGS 不一致！')
  console.error('  shared:', JSON.stringify(shared))
  console.error('  server:', JSON.stringify(server))
  console.error('  请同步 server/src/common/feature/feature-flags.constants.ts 后重试。')
  process.exit(1)
}
console.log('[check-feature-sync] FEATURE_FLAGS 一致性校验通过（' + shared.length + ' 项）')
