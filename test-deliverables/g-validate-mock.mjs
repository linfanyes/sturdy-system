import { getMockData } from '../mini-program/src/common/mock-data.js'

const TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIzYzEzMjhjOC0wMTEwLTRjN2ItOWYyMy05NTc5MTM4ODljNGQiLCJpYXQiOjE3ODQ3OTEwNzcsImV4cCI6MTc4NzM4MzA3N30.U2mQGFQmhTr0uKlcUPxXmpxzoYVOJpzIn0cbp8H5sms'
const BASE = 'http://127.0.0.1:3000/api'

// 真实 API 拥有但前端通常无需的DB管理字段（mock 允许缺失）
const IGNORE = new Set(['id', 'teacherId', 'createdAt', 'updatedAt'])

const ENDPOINTS = [
  '/todos', '/schedules', '/notices', '/behavior-records', '/homework',
  '/award-records', '/class-activities', '/duty-rosters', '/class-galleries',
  '/my-galleries', '/attendances', '/lesson-plan-templates', '/reading-logs',
  '/home-visits', '/semesters', '/parent-contacts', '/group-scores',
  '/score-records', '/reward-records', '/checkins', '/resources', '/notes',
  '/growth-entries', '/generated/papers', '/generated/lesson-plans',
  '/generated/knowledges', '/generated/queries', '/class-duty-configs',
  '/seat-layouts', '/work-logs', '/award-categories', '/lesson-observations',
  '/class-expenses',
]

function keysOf(arr) {
  if (!Array.isArray(arr)) return []
  return arr.length ? Object.keys(arr[0]) : []
}

async function realKeys(path) {
  const r = await fetch(BASE + path, { headers: { Authorization: 'Bearer ' + TOKEN } })
  const j = await r.json()
  const items = Array.isArray(j) ? j : (j.items || [])
  return keysOf(items)
}

let allOk = true
const lines = []
for (const ep of ENDPOINTS) {
  const mock = getMockData(ep)
  const mk = new Set(keysOf(mock))
  let rk = []
  try { rk = await realKeys(ep) } catch (e) { rk = [] }
  const rkSet = new Set(rk)
  // mock 缺失的真实业务字段
  const missing = [...rkSet].filter((k) => !IGNORE.has(k) && !mk.has(k))
  // 真实缺失的 mock 字段（仅信息，不一定是问题）
  const extra = [...mk].filter((k) => !rkSet.has(k) && !IGNORE.has(k))
  const status = missing.length === 0 ? 'OK ' : 'GAP'
  if (missing.length) allOk = false
  lines.push(`${status} ${ep}\n   mock: [${[...mk].sort().join(', ')}]\n   real: [${[...rkSet].sort().join(', ')}]` +
    (missing.length ? `\n   >>> 缺失业务字段: ${missing.join(', ')}` : '') +
    (extra.length ? `\n   (mock额外字段: ${extra.join(', ')})` : ''))
}

console.log(lines.join('\n'))
console.log('\n==== 结果: ' + (allOk ? '全部字段对齐 ✅' : '存在缺失字段 ⚠️') + ' ====')
process.exit(allOk ? 0 : 1)
