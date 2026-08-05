/**
 * 校验 Web 管理端「菜单项 name」与「路由 name」是否一致。
 *
 * 背景：AppLayout.vue 的 findCategoryForRoute() / 瓷砖高亮均以
 *   item.name === route.name 作为匹配依据，
 * 一旦菜单 name 与该 to 路径对应的路由 name 不一致，
 * 就会出现「面包屑丢分类 + 瓷砖不高亮」的静默故障。
 *
 * 用法：node scripts/check-menu-route-names.mjs
 * 退出码：0=一致，1=存在失配（可接入 CI）
 */
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = resolve(__dirname, '..')
const routerSrc = readFileSync(resolve(root, 'web-app/src/router/index.ts'), 'utf8')
const layoutSrc = readFileSync(resolve(root, 'web-app/src/layouts/AppLayout.vue'), 'utf8')

/** 解析路由表：产出 fullPath -> routeName 映射（仅处理一层嵌套，够覆盖本项目结构） */
function parseRoutes(src) {
  const map = new Map()
  let parentPath = ''
  for (const line of src.split(/\r?\n/)) {
    const pathM = line.match(/path:\s*'([^']*)'/)
    if (!pathM) continue
    const p = pathM[1]
    const nameM = line.match(/name:\s*'([^']+)'/)
    if (p.startsWith('/')) {
      parentPath = p === '/' ? '' : p.replace(/\/$/, '')
      if (nameM) map.set(parentPath || '/', nameM[1])
      continue
    }
    if (!nameM) continue
    const full = p === '' ? parentPath : `${parentPath}/${p}`
    map.set(full, nameM[1])
  }
  return map
}

/** 解析菜单项：产出 { name, to, line } 列表 */
function parseMenuItems(src) {
  const items = []
  src.split(/\r?\n/).forEach((line, i) => {
    const m = line.match(/name:\s*'([^']+)'[\s\S]*?to:\s*'([^']+)'/)
    if (m) items.push({ name: m[1], to: m[2], line: i + 1 })
  })
  return items
}

const routes = parseRoutes(routerSrc)
const items = parseMenuItems(layoutSrc)

const missing = []   // to 指向的路径在路由表中不存在（死链）
const mismatch = []  // 路径存在但 name 与路由 name 不一致

for (const it of items) {
  const to = it.to.replace(/\/$/, '') || '/'
  const routeName = routes.get(to)
  if (!routeName) {
    missing.push(it)
  } else if (routeName !== it.name) {
    mismatch.push({ ...it, routeName })
  }
}

console.log(`已解析路由 ${routes.size} 条，菜单项 ${items.length} 个。\n`)

if (missing.length) {
  console.log(`✗ 死链（菜单 to 无对应路由）共 ${missing.length} 处：`)
  for (const m of missing) console.log(`  AppLayout.vue:${m.line}  name='${m.name}'  to='${m.to}'`)
  console.log('')
}

if (mismatch.length) {
  console.log(`✗ name 失配（面包屑/高亮会失效）共 ${mismatch.length} 处：`)
  for (const m of mismatch) {
    console.log(`  AppLayout.vue:${m.line}  to='${m.to}'  菜单 name='${m.name}'  实际路由 name='${m.routeName}'`)
  }
  console.log('')
}

if (!missing.length && !mismatch.length) {
  console.log('✓ 全部菜单项的 name 与路由 name 一致，且无死链。')
  process.exit(0)
}
process.exit(1)
