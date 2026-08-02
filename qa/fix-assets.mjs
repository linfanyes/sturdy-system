import fs from 'node:fs'

// ===== 修正 1: functional-tests.mjs MSG-02 用家长 IM id =====
const p1 = 'D:/workspae/gitee/techer/work-system/qa/functional-tests.mjs'
let c1 = fs.readFileSync(p1, 'utf8').replace(/\r\n/g, '\n')

const oldV1 = `  // G02 发送消息（教师→家长）
  t = T('MSG-02', '教师发送消息给家长', g)
  t.method = 'POST'; t.path = '/messages'; t.expect = '201'
  const snd = await call('/messages', { method: 'POST', token: head, body: { recipientId: ENV.created.student1Id, recipientRole: 'parent', title: 'QA测试留言', content: '孩子在校表现良好' } })`

const newV1 = `  // G02 发送消息（教师→家长，P1-MSG-01 修复后 recipientId 使用家长 IM id）
  t = T('MSG-02', '教师发送消息给家长', g)
  t.method = 'POST'; t.path = '/messages'; t.expect = '201'
  const parentRec1 = Array.isArray(rc.d) ? rc.d.find((r) => r.role === 'parent') : null
  const snd = await call('/messages', { method: 'POST', token: head, body: { recipientId: parentRec1?.id || ENV.created.student1Id, recipientRole: 'parent', title: 'QA测试留言', content: '孩子在校表现良好' } })`

if (!c1.includes(oldV1)) {
  console.error('V1 PATTERN NOT FOUND')
  const i = c1.indexOf("t = T('MSG-02'")
  console.log(JSON.stringify(c1.slice(i - 200, i + 500)))
  process.exit(1)
}
c1 = c1.replace(oldV1, newV1)
fs.writeFileSync(p1, c1, 'utf8')
console.log('OK: functional-tests.mjs MSG-02 updated')

// ===== 修正 2: seed-data.mjs 留言用家长 IM id =====
const p2 = 'D:/workspae/gitee/techer/work-system/qa/seed-data.mjs'
let c2 = fs.readFileSync(p2, 'utf8').replace(/\r\n/g, '\n')

const oldSeed = `// ---------- 10. 留言（教师 → 家长） ----------
const msg = await call('/messages', { method: 'POST', token: head, body: { recipientId: students[0]?.id, content: '孩子最近表现很好，继续保持！', type: 'text' } })
if (msg.ok) log(true, '[10] 教师留言给家长')`

const newSeed = `// ---------- 10. 留言（教师 → 家长，P1-MSG-01 修复后 recipientId 使用家长 IM id） ----------
let parentRecSeed = null
try {
  const rr = await call('/messages/recipients', { token: head })
  const rl = Array.isArray(rr.d) ? rr.d : rr.d?.items || []
  parentRecSeed = rl.find((r) => r.role === 'parent')?.id || null
} catch {}
const msg = await call('/messages', { method: 'POST', token: head, body: { recipientId: parentRecSeed || students[0]?.id, recipientRole: 'parent', title: '家校留言', content: '孩子最近表现很好，继续保持！', type: 'direct' } })
if (msg.ok) log(true, '[10] 教师留言给家长')`

if (!c2.includes(oldSeed)) {
  console.error('SEED PATTERN NOT FOUND')
  const i = c2.indexOf('10. 留言')
  console.log(JSON.stringify(c2.slice(i - 100, i + 400)))
  process.exit(1)
}
c2 = c2.replace(oldSeed, newSeed)
fs.writeFileSync(p2, c2, 'utf8')
console.log('OK: seed-data.mjs message updated')
