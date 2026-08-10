/**
 * sync-shared.cjs —— 将 ../shared 的构建产物同步到 server/vendor/gardener-shared
 *
 * 背景缺陷（QA 测试发现）：server 源码通过 '@gardener/shared/*' 引用共享包，
 * tsconfig paths 只在编译期生效；运行时（node dist/main.js）需要 node_modules
 * 真实可解析。而云托管部署只打包 server/ 目录（构建上下文不含 ../shared），
 * 导致含 shared 引用的版本部署后启动即报 Cannot find module '@gardener/shared/*'。
 *
 * 修复：将 shared 的 package.json + dist 复制为 server/vendor/gardener-shared，
 * server/package.json 以 "file:./vendor/gardener-shared" 声明依赖，
 * npm install 时自动建立 node_modules/@gardener/shared 链接。
 *
 * 用法：node scripts/sync-shared.cjs   （shared 变更并构建后执行）
 */
const fs = require('fs')
const path = require('path')

const root = path.resolve(__dirname, '..', '..')
const sharedDir = path.join(root, 'shared')
const vendorDir = path.resolve(__dirname, '..', 'vendor', 'gardener-shared')

function copyDir(src, dest) {
  fs.mkdirSync(dest, { recursive: true })
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const s = path.join(src, entry.name)
    const d = path.join(dest, entry.name)
    if (entry.isDirectory()) copyDir(s, d)
    else if (entry.isFile()) fs.copyFileSync(s, d)
  }
}

if (!fs.existsSync(path.join(sharedDir, 'dist'))) {
  console.error('✗ shared/dist 不存在，请先在 shared/ 执行 npm run build')
  process.exit(1)
}

fs.rmSync(vendorDir, { recursive: true, force: true })
fs.mkdirSync(vendorDir, { recursive: true })
fs.copyFileSync(path.join(sharedDir, 'package.json'), path.join(vendorDir, 'package.json'))
copyDir(path.join(sharedDir, 'dist'), path.join(vendorDir, 'dist'))
console.log('✓ shared 已同步到 server/vendor/gardener-shared')
