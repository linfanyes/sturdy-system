#!/usr/bin/env node
/**
 * 校验 server 本地 FEATURE_FLAGS 相关副本与 shared/constants 单一来源一致。
 * 用法: node scripts/check-feature-sync.js （在 server/ 目录执行）
 * CI: .github/workflows/ci.yml 的 backend-check job 调用；不一致即红。
 *
 * P2-17 强化：除 FEATURE_FLAGS 外，同步校验 OPT_IN_FEATURES / PARENT_FEATURE_KEYS / FEATURE_LABELS。
 */
'use strict'
const fs = require('fs')
const path = require('path')

/**
 * 从源文件中提取数组常量内容。
 * 匹配 export const VAR_NAME: ... = [ ... ];
 */
function extractArray(file, varName) {
  const src = fs.readFileSync(file, 'utf8')
  // 匹配声明到 = 号：export const VAR_NAME (任意类型注解) =
  const declRe = new RegExp('export\\s+const\\s+' + varName + '\\s*[:{]')
  const declMatch = declRe.exec(src)
  if (!declMatch) throw new Error('无法找到 ' + varName + ' 声明: ' + file)
  // 从声明末尾往后找 = 号
  const eqIdx = src.indexOf('=', declMatch.index + declMatch[0].length - 1)
  if (eqIdx === -1) throw new Error('未找到 = : ' + varName)
  // 从 = 号后找 [
  const bracketStart = src.indexOf('[', eqIdx)
  if (bracketStart === -1) throw new Error('未找到 [: ' + varName)
  // 平衡括号匹配到对应的 ]
  let depth = 0, endIdx = -1
  for (let i = bracketStart; i < src.length; i++) {
    if (src[i] === '[') depth++
    else if (src[i] === ']') { depth--; if (depth === 0) { endIdx = i; break } }
  }
  if (endIdx === -1) throw new Error('未匹配到 ]: ' + varName)
  const content = src.slice(bracketStart + 1, endIdx)
  return [...content.matchAll(/'([^']+)'/g)].map(x => x[1])
}

/**
 * 从源文件中提取 Record 常量内容。
 * 匹配 export const VAR_NAME: Record<...> = { ... };
 */
function extractLabels(file, varName) {
  const src = fs.readFileSync(file, 'utf8')
  const declRe = new RegExp('export\\s+const\\s+' + varName + '\\s*[:{]')
  const declMatch = declRe.exec(src)
  if (!declMatch) throw new Error('无法找到 ' + varName + ' 声明: ' + file)
  const eqIdx = src.indexOf('=', declMatch.index + declMatch[0].length - 1)
  if (eqIdx === -1) throw new Error('未找到 = : ' + varName)
  const braceStart = src.indexOf('{', eqIdx)
  if (braceStart === -1) throw new Error('未找到 {: ' + varName)
  let depth = 0, endIdx = -1
  for (let i = braceStart; i < src.length; i++) {
    if (src[i] === '{') depth++
    else if (src[i] === '}') { depth--; if (depth === 0) { endIdx = i; break } }
  }
  if (endIdx === -1) throw new Error('未匹配到 }: ' + varName)
  const block = src.slice(braceStart, endIdx + 1)
  const labels = {}
  const labelRe = /(\w[\w-]*)\s*:\s*'([^']*)'/g
  let lm
  while ((lm = labelRe.exec(block)) !== null) {
    labels[lm[1]] = lm[2]
  }
  return labels
}

const root = path.join(__dirname, '..', '..')
const sharedFile = path.join(root, 'shared', 'constants', 'index.ts')
const serverFile = path.join(__dirname, '..', 'src', 'common', 'feature', 'feature-flags.constants.ts')

let ok = true

try {
  // 1) FEATURE_FLAGS
  const sharedFlags = extractArray(sharedFile, 'FEATURE_FLAGS')
  const serverFlags = extractArray(serverFile, 'FEATURE_FLAGS')
  if (JSON.stringify(sharedFlags) !== JSON.stringify(serverFlags)) {
    ok = false
    console.error('[check-feature-sync] FEATURE_FLAGS 不一致！')
    console.error('  shared:', JSON.stringify(sharedFlags))
    console.error('  server:', JSON.stringify(serverFlags))
  } else {
    console.log('[check-feature-sync] FEATURE_FLAGS ✓ (' + sharedFlags.length + ' 项)')
  }

  // 2) OPT_IN_FEATURES
  const sharedOptIn = extractArray(sharedFile, 'OPT_IN_FEATURES')
  const serverOptIn = extractArray(serverFile, 'OPT_IN_FEATURES')
  if (JSON.stringify(sharedOptIn) !== JSON.stringify(serverOptIn)) {
    ok = false
    console.error('[check-feature-sync] OPT_IN_FEATURES 不一致！')
    console.error('  shared:', JSON.stringify(sharedOptIn))
    console.error('  server:', JSON.stringify(serverOptIn))
  } else {
    console.log('[check-feature-sync] OPT_IN_FEATURES ✓ (' + sharedOptIn.length + ' 项)')
  }

  // 3) PARENT_FEATURE_KEYS
  const sharedParent = extractArray(sharedFile, 'PARENT_FEATURE_KEYS')
  const serverParent = extractArray(serverFile, 'PARENT_FEATURE_KEYS')
  if (JSON.stringify(sharedParent) !== JSON.stringify(serverParent)) {
    ok = false
    console.error('[check-feature-sync] PARENT_FEATURE_KEYS 不一致！')
    console.error('  shared:', JSON.stringify(sharedParent))
    console.error('  server:', JSON.stringify(serverParent))
  } else {
    console.log('[check-feature-sync] PARENT_FEATURE_KEYS ✓ (' + sharedParent.length + ' 项)')
  }

  // 4) FEATURE_LABELS
  const sharedLabels = extractLabels(sharedFile, 'FEATURE_FLAG_LABELS')
  const serverLabels = extractLabels(serverFile, 'FEATURE_LABELS')
  if (JSON.stringify(sharedLabels) !== JSON.stringify(serverLabels)) {
    ok = false
    console.error('[check-feature-sync] FEATURE_LABELS 不一致！')
    const allKeys = new Set([...Object.keys(sharedLabels), ...Object.keys(serverLabels)])
    for (const k of allKeys) {
      if (sharedLabels[k] !== serverLabels[k]) {
        console.error(`    ${k}: shared='${sharedLabels[k] || ''}' server='${serverLabels[k] || ''}'`)
      }
    }
  } else {
    console.log('[check-feature-sync] FEATURE_LABELS ✓ (' + Object.keys(sharedLabels).length + ' 项)')
  }
} catch (e) {
  console.error('[check-feature-sync] 运行错误: ' + e.message)
  process.exit(2)
}

if (!ok) {
  console.error('[check-feature-sync] ❌ 功能包标识不一致，请同步后重试。')
  console.error('  指南：编辑 shared/constants/index.ts → 拷贝到 server/.../feature-flags.constants.ts')
  process.exit(1)
}
console.log('[check-feature-sync] ✅ 功能包标识一致性校验全部通过')
