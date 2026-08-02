import fs from 'node:fs'

// ===== 修正 1: functional-tests.mjs MSG-02 recipientId =====
const p1 = 'D:/workspae/gitee/techer/work-system/qa/functional-tests.mjs'
let c1 = fs.readFileSync(p1, 'utf8').replace(/\r\n/g, '\n')

const oldRecV1 = `recipientId: ENV.created.student1Id, recipientRole: 'parent', title: 'QA测试留言', content: '孩子在校表现良好'`
const newRecV1 = `recipientId: (Array.isArray(rc.d) ? (rc.d.find((r) => r.role === 'parent')?.id || ENV.created.student1Id) : ENV.created.student1Id), recipientRole: 'parent', title: 'QA测试留言', content: '孩子在校表现良好'`

if (!c1.includes(oldRecV1)) {
  console.error('V1 RECIPIENT PATTERN NOT FOUND')
  process.exit(1)
}
c1 = c1.replace(oldRecV1, newRecV1)
fs.writeFileSync(p1, c1, 'utf8')
console.log('OK: functional-tests.mjs MSG-02 recipientId updated')

// ===== 修正 2: seed-data.mjs 留言用家长 IM id =====
const p2 = 'D:/workspae/gitee/techer/work-system/qa/seed-data.mjs'
let c2 = fs.readFileSync(p2, 'utf8').replace(/\r\n/g, '\n')

const anchorSeed = `// ---------- 10. 留言（教师 → 家长） ----------`
const newSeedBlock = `// ---------- 10. 留言（教师 → 家长，P1-MSG-01 修复后 recipientId 使用家长 IM id） ----------
let parentRecSeed = null
try {
  const rr = await call('/messages/recipients', { token: HEAD })
  const rl = Array.isArray(rr.d) ? rr.d : rr.d?.items || []
  parentRecSeed = rl.find((r) => r.role === 'parent')?.id || null
} catch {}`

if (!c2.includes(anchorSeed)) {
  console.error('SEED ANCHOR NOT FOUND')
  process.exit(1)
}
c2 = c2.replace(anchorSeed, newSeedBlock)

const oldRecSeed = `recipientId: students[0]?.id, content: '孩子最近表现很好，继续保持！'`
const newRecSeed = `recipientId: parentRecSeed || students[0]?.id, recipientRole: 'parent', title: '家校留言', content: '孩子最近表现很好，继续保持！', type: 'direct'`
if (!c2.includes(oldRecSeed)) {
  console.error('SEED RECIPIENT PATTERN NOT FOUND')
  const i = c2.indexOf('孩子最近表现')
  console.log(JSON.stringify(c2.slice(i - 200, i + 200)))
  process.exit(1)
}
c2 = c2.replace(oldRecSeed, newRecSeed)
fs.writeFileSync(p2, c2, 'utf8')
console.log('OK: seed-data.mjs message updated')
