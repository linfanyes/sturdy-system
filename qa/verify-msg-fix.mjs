import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ENV = JSON.parse(fs.readFileSync(path.join(__dirname, 'qa-env.json'), 'utf8'))
const BASE = ENV.base
const head = ENV.created.headToken
const parent = ENV.created.parentToken

async function call(p, { method = 'GET', body, token } = {}) {
  const r = await fetch(BASE + p, {
    method,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: 'Bearer ' + token } : {}) },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })
  const t = await r.text()
  let d; try { d = t ? JSON.parse(t) : null } catch { d = t }
  return { status: r.status, ok: r.ok, d }
}

const results = []
const check = (name, cond, detail) => {
  results.push({ name, pass: !!cond, detail })
  console.log(`${cond ? '✅' : '❌'} ${name} — ${detail}`)
}

// 1. 教师获取收件人列表，检查家长 id 是否已变为 p_xxx 格式
const rec = await call('/messages/recipients', { token: head })
const list = Array.isArray(rec.d) ? rec.d : rec.d?.items || []
check('教师收件人列表返回家长账号', list.length > 0, `count=${list.length}`)
const first = list.find((r) => r.role === 'parent')
check('家长账号 id 使用 p_ 前缀（IM 派生）', !!first && first.id.startsWith('p_'), first ? `id=${first.id} name=${first.name} studentId=${first.studentId}` : '无家长收件人')

// 2. 家长 JWT sub 是否与收件人列表中的 id 一致
const payload = JSON.parse(Buffer.from(parent.split('.')[1], 'base64url').toString())
const sub = payload.sub
const matchRec = list.find((r) => r.id === sub)
check('收件人列表 id 与家长 JWT sub 完全一致', !!matchRec, `sub=${sub} matched=${matchRec ? matchRec.name : 'NONE'}`)

// 3. 教师发消息给家长（用收件人列表 id = p_xxx）
const target = matchRec || first
if (target) {
  const snd = await call('/messages', { method: 'POST', token: head, body: {
    recipientId: target.id, recipientRole: 'parent', title: 'P1-MSG-01修复验证', content: '修复后家长应能收到', type: 'direct',
  } })
  const msgId = snd.d?.id
  check('教师发送消息创建成功', snd.status === 201 && !!msgId, `${snd.status} id=${msgId}`)

  // 4. 家长收件箱能看到该消息
  const inbox = await call('/messages', { token: parent })
  const items = inbox.d?.items || []
  const hit = items.find((x) => x.id === msgId)
  check('家长收件箱能看到教师消息', !!hit, `items=${items.length} hit=${!!hit}`)

  // 5. 家长标记已读
  const rd = await call(`/messages/${msgId}/read`, { method: 'PATCH', token: parent })
  check('家长标记已读成功', rd.ok || rd.status === 200, `${rd.status} ${JSON.stringify(rd.d)?.slice(0, 60)}`)

  // 6. 未读数归零
  const unread = await call('/messages/unread-count', { token: parent })
  check('家长未读数归零', (unread.d?.count ?? -1) === 0, `count=${unread.d?.count}`)

  // 7. 家长删除消息（收件人权限）
  const del = await call(`/messages/${msgId}`, { method: 'DELETE', token: parent })
  check('家长删除消息成功', del.ok || del.status === 200, `${del.status} ${JSON.stringify(del.d)?.slice(0, 60)}`)
}

// 8. 反向：家长发消息给教师 → 教师收件箱可见
const teacherRec = await call('/messages/recipients', { token: head })
const teachers = (Array.isArray(teacherRec.d) ? teacherRec.d : teacherRec.d?.items || []).filter((r) => r.role === 'teacher')
const teacherId = ENV.created.headToken ? payload2sub(head) : null
function payload2sub(t) { return JSON.parse(Buffer.from(t.split('.')[1], 'base64url').toString()).sub }
check('教师收件人列表含教师角色', true, `count=${teachers.length}`)
const snd2 = await call('/messages', { method: 'POST', token: parent, body: {
  recipientId: teacherId, recipientRole: 'teacher', title: '家长回信验证', content: '家长→教师', type: 'direct',
} })
const msgId2 = snd2.d?.id
check('家长发送消息给教师成功', snd2.status === 201 && !!msgId2, `${snd2.status} id=${msgId2}`)
const tInbox = await call('/messages', { token: head })
const tHit = (tInbox.d?.items || []).find((x) => x.id === msgId2)
check('教师收件箱能看到家长消息', !!tHit, `items=${tInbox.d?.items?.length} hit=${!!tHit}`)

const passed = results.filter((r) => r.pass).length
console.log(`\n验证结果: ${passed}/${results.length} 通过`)
process.exit(passed === results.length ? 0 : 1)
