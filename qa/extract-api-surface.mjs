// 从 server/src 提取 API 路由清单（控制器路径 + HTTP 方法），供静态一致性测试使用
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const SRC = path.join(__dirname, '..', 'server', 'src')
const OUT = path.join(__dirname, 'api-surface.json')

const METHOD_RE = /@(Get|Post|Patch|Put|Delete)\(([^)]*)\)/g
const CTRL_RE = /@Controller\(([^)]+)\)/
const PREFIX_RE = /setGlobalPrefix\('([^']+)'\)/

function walk(dir) {
  const out = []
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name)
    if (e.isDirectory()) out.push(...walk(p))
    else if (e.name.endsWith('.controller.ts') || e.name.endsWith('.module.ts')) out.push(p)
  }
  return out
}

const controllers = [] // { file, ctrlPath, methods: [{method, path}] }
for (const f of walk(SRC)) {
  const src = fs.readFileSync(f, 'utf8')
  const ctrlM = src.match(CTRL_RE)
  if (!ctrlM) continue
  const ctrlPath = ctrlM[1].replace(/['"]/g, '').trim()
  const methods = []
  for (const m of src.matchAll(METHOD_RE)) {
    const method = m[1].toUpperCase()
    const sub = (m[2] || '').replace(/['"`]/g, '').trim()
    methods.push({ method, sub })
  }
  if (methods.length) controllers.push({ file: path.relative(SRC, f), ctrlPath, methods })
}

// 由运行中服务的主文件读取全局前缀（默认 api）
let globalPrefix = 'api'
const main = path.join(SRC, 'main.ts')
if (fs.existsSync(main)) {
  const m = fs.readFileSync(main, 'utf8').match(PREFIX_RE)
  if (m) globalPrefix = m[1]
}

const surface = {
  globalPrefix,
  generatedAt: new Date().toISOString(),
  controllers,
  endpoints: [],
}
for (const c of controllers) {
  for (const mt of c.methods) {
    const full = `/${globalPrefix}/${c.ctrlPath}`.replace(/\/+/g, '/')
    const ep = mt.sub ? `${full}/${mt.sub}` : full
    surface.endpoints.push({ method: mt.method, path: ep.replace(/\/$/, '') })
  }
}
fs.writeFileSync(OUT, JSON.stringify(surface, null, 2))
console.log(`✅ 提取 ${surface.controllers.length} 个控制器 / ${surface.endpoints.length} 个端点 → ${OUT}`)
