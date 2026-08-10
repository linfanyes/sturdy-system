// 将最新构建的 shared/dist 同步到 server/vendor/gardener-shared/dist，
// 使 Docker（构建上下文为 server/）能解析 @gardener/shared 各子路径。
//
// 使用：在 server/ 目录下执行 `npm run vendor:shared`
// 前置：需先在仓库根 shared/ 执行过 `npm run build` 生成 dist。
import { cpSync, rmSync, existsSync, mkdirSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = resolve(__dirname, '..')
const src = resolve(root, 'shared/dist')
const dest = resolve(root, 'server/vendor/gardener-shared/dist')

if (!existsSync(src)) {
  console.error('[sync-shared-vendor] 未找到 shared/dist，请先在仓库根 shared/ 执行 `npm run build`。')
  process.exit(1)
}

rmSync(dest, { recursive: true, force: true })
mkdirSync(dirname(dest), { recursive: true })
cpSync(src, dest, { recursive: true })
console.log(`[sync-shared-vendor] 已同步 ${src}\n  -> ${dest}`)
console.log('[sync-shared-vendor] 请记得将 server/vendor/gardener-shared/dist 一并提交（它不在 .gitignore 内）。')
