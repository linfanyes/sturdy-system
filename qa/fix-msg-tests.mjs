import fs from 'node:fs'

const p = 'D:/workspae/gitee/techer/work-system/qa/functional-tests-v2.mjs'
let c = fs.readFileSync(p, 'utf8')
// 统一换行符为 LF 再替换（写回时保持 LF）
c = c.replace(/\r\n/g, '\n')

const old1 = `  const g = 'O. 消息与通知扩展（已读/未读/全部已读/删除）'
  const stu1 = ENV.created.students[0]

  // O01 发送消息（正确 payload）
  let t = T('MSG-05', '教师发送消息（recipientId/role/title）', g)
  t.method = 'POST'; t.path = '/messages'; t.expect = '201 + id'
  const m = await call('/messages', { method: 'POST', token: head, body: {
    recipientId: stu1.id, recipientRole: 'parent', title: 'QA扩展消息', content: '消息内容',
  } })`

const new1 = `  const g = 'O. 消息与通知扩展（已读/未读/全部已读/删除）'
  const stu1 = ENV.created.students[0]

  // P1-MSG-01 修复后：教师收件人列表返回家长 IM 账号（p_xxx，与家长 JWT sub 一致）
  const recRes = await call('/messages/recipients', { token: head })
  const recList = Array.isArray(recRes.d) ? recRes.d : recRes.d?.items || []
  const parentRec = recList.find((r) => r.role === 'parent')

  // O01 发送消息（正确 payload）
  let t = T('MSG-05', '教师发送消息（recipientId/role/title）', g)
  t.method = 'POST'; t.path = '/messages'; t.expect = '201 + id'
  const m = await call('/messages', { method: 'POST', token: head, body: {
    recipientId: parentRec?.id || stu1.id, recipientRole: 'parent', title: 'QA扩展消息', content: '消息内容',
  } })`

if (!c.includes(old1)) {
  console.error('PATTERN 1 NOT FOUND')
  const i = c.indexOf("const g = 'O.")
  console.log(JSON.stringify(c.slice(i, i + 650)))
  process.exit(1)
}
c = c.replace(old1, new1)

// 2. MSG-08/08b 正向断言
const old2 = `  // O04 家长标记已读 —— 已知缺陷：教师→家长消息 recipientId 体系不一致
  // 教师发送时 recipientId=\`\${studentId}_\${parentName}\`，而家长 JWT sub=\`p_xxx\`，
  // 家长端 list/markRead 均无法匹配 → 家长永远收不到教师站内信
  t = T('MSG-08', '家长标记教师消息已读（缺陷验证）', g)
  t.method = 'PATCH'; t.path = '/messages/:id/read'; t.expect = '200（当前缺陷：404）'
  const mr = await call(\`/messages/\${m.d.id}/read\`, { method: 'PATCH', token: parent })
  t.actual = \`\${mr.status} \${brief(mr.d, 60)}\`
  if (mr.status === 404) {
    markDefect(t, '缺陷 P1-MSG-01：教师→家长消息 recipientId=\`\${studentId}_\${parentName}\` 与家长 JWT sub=\`p_xxx\` 不匹配，家长端无法标记已读（也无法在收件箱看到）')
  } else if (ok2xx(mr.status)) {
    passed++
  } else {
    t.status = 'FAIL'; failed++
  }

  // O04b 家长收件箱能否看到教师消息（缺陷验证）
  t = T('MSG-08b', '家长收件箱能看到教师消息（缺陷验证）', g)
  t.method = 'GET'; t.path = '/messages'; t.expect = '含教师消息（当前缺陷：为空）'
  const inbox = await call('/messages', { token: parent })
  const hit = (inbox.d?.items || []).some((x) => x.id === m.d.id)
  t.actual = \`\${inbox.status} items=\${inbox.d?.items?.length ?? 0} hit=\${hit}\`
  if (!hit) {
    markDefect(t, '缺陷 P1-MSG-01（同源）：家长收件箱（recipientId=p_xxx）匹配不到教师消息（recipientId=studentId_parentName）')
  } else {
    passed++
  }`

const new2 = `  // O04 家长标记已读（P1-MSG-01 修复后应通过）
  t = T('MSG-08', '家长标记教师消息已读', g)
  t.method = 'PATCH'; t.path = '/messages/:id/read'; t.expect = '200'
  const mr = await call(\`/messages/\${m.d.id}/read\`, { method: 'PATCH', token: parent })
  t.actual = \`\${mr.status} \${brief(mr.d, 60)}\`
  if (ok2xx(mr.status)) {
    passed++
  } else {
    t.status = 'FAIL'; failed++
  }

  // O04b 家长收件箱能看到教师消息（P1-MSG-01 修复后应通过）
  t = T('MSG-08b', '家长收件箱能看到教师消息', g)
  t.method = 'GET'; t.path = '/messages'; t.expect = '含教师消息'
  const inbox = await call('/messages', { token: parent })
  const hit = (inbox.d?.items || []).some((x) => x.id === m.d.id)
  t.actual = \`\${inbox.status} items=\${inbox.d?.items?.length ?? 0} hit=\${hit}\`
  if (hit) {
    passed++
  } else {
    t.status = 'FAIL'; failed++
  }`

if (!c.includes(old2)) {
  console.error('PATTERN 2 NOT FOUND')
  const i = c.indexOf('MSG-08')
  console.log(JSON.stringify(c.slice(i - 300, i + 1300)))
  process.exit(1)
}
c = c.replace(old2, new2)

fs.writeFileSync(p, c, 'utf8')
console.log('OK: O-group updated (MSG-05 uses parent IM id, MSG-08/08b positive assertions)')
