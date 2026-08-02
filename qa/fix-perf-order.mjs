import fs from 'node:fs'

const p = 'D:/workspae/gitee/techer/work-system/qa/performance-tests.mjs'
const lines = fs.readFileSync(p, 'utf8').split('\n')

// 定位 suites 数组块（79-88 行区域，含 teaching-calendar 行）
const start = lines.findIndex((l) => l.includes("const suites = ["))
const end = lines.findIndex((l, i) => i > start && l.trim() === ']')
if (start < 0 || end < 0) { console.error('suites block not found'); process.exit(1) }

const block = lines.slice(start + 1, end).filter((l) => l.trim().startsWith('['))
// 提取四行：health / classes / students / notes列表 / notes创建 / grades / exams / messages / teaching-calendar
const byLabel = {}
for (const l of block) {
  const m = l.match(/^\s*\['([^']+)'/)
  if (m) byLabel[m[1]] = l
}
const order = [
  'health', 'classes 列表（教师）', 'students 列表（教师）', 'notes 列表（教师）',
  'teaching-calendar 列表', 'grades 列表（教师）', 'exams 列表（教师）',
  'messages 未读数（教师）', 'notes 创建（教师）',
]
const missing = order.filter((k) => !byLabel[k])
if (missing.length) { console.error('missing labels:', missing); process.exit(1) }

const newBlock = order.map((k) => byLabel[k]).join('\n')
const newLines = [...lines.slice(0, start + 1), newBlock, ...lines.slice(end)]
fs.writeFileSync(p, newLines.join('\n'), 'utf8')
console.log('OK: suites reordered, teaching-calendar now before write-heavy scenes')
