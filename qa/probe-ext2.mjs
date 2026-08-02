// 二次探测：teachers detail / notices 权限 / messages read / picker-history
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ENV = JSON.parse(fs.readFileSync(path.join(__dirname, 'qa-env.json'), 'utf8'))
const BASE = ENV.base
const head = ENV.created.headToken
const sa = ENV.created.saToken
const iso = ENV.created.isoTokens.qa_t_iso
const parent = ENV.created.parentToken

async function call(p, { method = 'GET', body, token } = {}) {
  const r = await fetch(BASE + p, {
    method,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })
  const t = await r.text()
  let d
  try { d = t ? JSON.parse(t) : null } catch { d = t }
  return { status: r.status, ok: r.ok, d }
}

const class1 = ENV.created.class1Id

// 1. school-admin 教师列表获取真实 teacherId
const tl = await call('/school-admin/teachers?take=10', { token: sa })
console.log('SA teachers:', tl.status, JSON.stringify(tl.d).slice(0, 200))
const tid = tl.d?.items?.[0]?.id || tl.d?.[0]?.id
if (tid) {
  const det = await call(`/teachers/${tid}/detail`, { token: head })
  console.log(`T detail ${tid}:`, det.status, JSON.stringify(det.d).slice(0, 120))
  const det2 = await call(`/school-admin/teachers/${tid}/detail`, { token: sa })
  console.log(`SA detail ${tid}:`, det2.status, JSON.stringify(det2.d).slice(0, 120))
}

// 2. 非班主任（iso）发布班级公告
const isoNotice = await call('/notices', { method: 'POST', token: iso, body: { classId: class1, title: '越权公告', content: 'x', scope: 'class' } })
console.log('ISO notices scope=class:', isoNotice.status, JSON.stringify(isoNotice.d).slice(0, 100))

// 3. notices scope=school 过滤（先创建一条学校公告用 head）
const sc = await call('/notices', { method: 'POST', token: head, body: { title: 'QA学校公告A', content: 'x', scope: 'school' } })
console.log('POST school notice:', sc.status)
const scList = await call('/notices?scope=school', { token: head })
console.log('GET notices?scope=school:', scList.status, JSON.stringify(scList.d).slice(0, 120))

// 4. 教师发送消息 → 家长读 → 教师标已读
const msg = await call('/messages', { method: 'POST', token: head, body: { receiverType: 'parent', receiverId: ENV.created.students[0].id, content: 'QA已读测试消息' } })
console.log('POST message:', msg.status, JSON.stringify(msg.d).slice(0, 140))
const mid = msg.d?.id
if (mid) {
  const sent = await call('/messages/sent', { token: head })
  console.log('GET sent:', sent.status, 'items=', sent.d?.items?.length ?? sent.d?.length)
  const rd = await call(`/messages/${mid}/read`, { method: 'PATCH', token: parent })
  console.log('P parent read:', rd.status, JSON.stringify(rd.d).slice(0, 80))
  const ma = await call('/messages/mark-all-read', { method: 'PATCH', token: parent })
  console.log('PATCH mark-all-read:', ma.status, JSON.stringify(ma.d).slice(0, 80))
  const del = await call(`/messages/${mid}`, { method: 'DELETE', token: head })
  console.log('DELETE message:', del.status, JSON.stringify(del.d).slice(0, 80))
}

// 5. notifications 已读
const nl = await call('/notifications', { token: parent })
console.log('GET notifications:', nl.status, JSON.stringify(nl.d).slice(0, 120))
const nid = nl.d?.items?.[0]?.id || nl.d?.[0]?.id
if (nid) {
  const nr = await call(`/notifications/${nid}/read`, { method: 'PATCH', token: parent })
  console.log('PATCH notification read:', nr.status)
}
const nm = await call('/notifications/mark-all-read', { method: 'POST', token: parent })
console.log('POST notifications mark-all-read:', nm.status, JSON.stringify(nm.d).slice(0, 80))

// 6. picker-history
const ph = await call('/picker-history', { method: 'POST', token: head, body: { type: 'student', value: '9d75f83f-0aa6-4610-bc38-e01e0ce17667', label: '张小明' } })
console.log('POST picker-history:', ph.status, JSON.stringify(ph.d).slice(0, 100))
const phl = await call('/picker-history', { token: head })
console.log('GET picker-history:', phl.status, JSON.stringify(phl.d).slice(0, 100))

// 7. student-info-updates 家长提交 + 教师 review
const ur = await call('/parent-auth/student-update-request', { method: 'POST', token: parent, body: { payload: { phone: '13800001111' } } })
console.log('POST student-update-request:', ur.status, JSON.stringify(ur.d).slice(0, 100))
const url = await call('/parent-auth/student-update-requests', { token: parent })
console.log('GET student-update-requests:', url.status, JSON.stringify(url.d).slice(0, 120))

// 8. 教师提交 update-request 查看列表（/student-info-updates）
const sil = await call('/student-info-updates', { token: head })
console.log('GET student-info-updates (T):', sil.status, JSON.stringify(sil.d).slice(0, 120))

// 9. checkins 已有记录？/checkins 列表
const ck = await call('/checkins?take=3', { token: head })
console.log('GET checkins:', ck.status, 'items=', ck.d?.items?.length ?? ck.d?.length)

// 10. class-members 是否存在独立路由
const cm = await call('/classes/' + class1 + '/members', { token: head })
console.log('GET classes/:id/members:', cm.status, JSON.stringify(cm.d).slice(0, 100))
