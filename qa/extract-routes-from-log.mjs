// 从 QA 服务器启动日志提取实际映射的全部路由（权威端点清单）
// 兼容 UTF-8 / UTF-16LE（PowerShell *> 重定向产物）
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
const __dirname = path.dirname(fileURLToPath(import.meta.url))
const LOG = path.join(__dirname, '..', 'server', 'qa-server.log')
const OUT = path.join(__dirname, 'routes-from-log.json')

const buf = fs.readFileSync(LOG)
let text
if (buf[0] === 0xff && buf[1] === 0xfe) text = buf.toString('utf16le')
else text = buf.toString('utf8')

const re = /Mapped \{(\/[^,]+), (GET|POST|PATCH|PUT|DELETE)\} route/g
const routes = new Set()
let m
while ((m = re.exec(text))) routes.add(`${m[2]} ${m[1]}`)
const arr = [...routes].sort()
fs.writeFileSync(OUT, JSON.stringify(arr, null, 2))
console.log(`✅ 从日志提取 ${arr.length} 条已映射路由 → ${OUT}`)
const missing = arr.filter(r => /homework|attendance|notice|todo|expense|activity|duty|reading|checkin|work-log|observation|gallery|growth|behavior|award|reward|score|group|visit|semester|textbook|resource|picker|template|seat|im\//.test(r))
console.log(`  业务端点抽样 ${missing.length} 条:`)
console.log('  ' + missing.slice(0, 40).join('\n  '))
