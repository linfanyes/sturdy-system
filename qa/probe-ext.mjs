// 探测扩展模块权限行为（一次性脚本）
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ENV = JSON.parse(fs.readFileSync(path.join(__dirname, 'qa-env.json'), 'utf8'))
const BASE = ENV.base
const head = ENV.created.headToken
const sa = ENV.created.saToken
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
const stu = ENV.created.students[0]

const probes = [
  ['T|GET  /resource-library/poems', () => call('/resource-library/poems', { token: head })],
  ['T|GET  /resource-library/poems/search?keyword=静夜思', () => call('/resource-library/poems/search?keyword=静夜思', { token: head })],
  ['T|PATCH /resource-library/poems/:id', async () => {
    const list = await call('/resource-library/poems', { token: head })
    const id = list.d?.items?.[0]?.id || list.d?.[0]?.id
    return id ? call(`/resource-library/poems/${id}`, { method: 'PATCH', token: head, body: { keywords: 'qa-probe' } }) : { status: 'no-id' }
  }],
  ['SA|POST /resource-library/poems', () => call('/resource-library/poems', { method: 'POST', token: sa, body: { title: 'QA探测诗', dynasty: '唐', author: 'QA', content: '测试内容', grade: '三年级' } })],
  ['T|GET  /textbooks/tree', () => call('/textbooks/tree', { token: head })],
  ['T|GET  /textbooks/search?keyword=语文', () => call('/textbooks/search?keyword=语文', { token: head })],
  ['T|POST /textbooks/units', () => call('/textbooks/units', { method: 'POST', token: head, body: { textbookId: 'x', name: 'QA单元' } })],
  ['T|GET  /schedules/my', () => call('/schedules/my', { token: head })],
  ['T|POST /backups', () => call('/backups', { method: 'POST', token: head, body: { label: 'qa-probe' } })],
  ['T|GET  /backups', () => call('/backups', { token: head })],
  ['P|GET  /parent-auth/homework', () => call('/parent-auth/homework', { token: parent })],
  ['P|GET  /parent-auth/attendance', () => call('/parent-auth/attendance', { token: parent })],
  ['P|GET  /parent-auth/behavior', () => call('/parent-auth/behavior', { token: parent })],
  ['P|GET  /parent-auth/schedule', () => call('/parent-auth/schedule', { token: parent })],
  ['P|GET  /parent-auth/communications', () => call('/parent-auth/communications', { token: parent })],
  ['P|GET  /parent-auth/teachers', () => call('/parent-auth/teachers', { token: parent })],
  ['P|GET  /parent-auth/compare-kids', () => call('/parent-auth/compare-kids', { token: parent })],
  ['P|GET  /parent-auth/bindings', () => call('/parent-auth/bindings', { token: parent })],
  ['P|POST /parent-auth/switch-student', () => call('/parent-auth/switch-student', { method: 'POST', token: parent, body: { studentId: stu.id } })],
  ['T|GET  /teachers/:id/detail', () => call(`/teachers/${ENV.created.teacherIds[0]}/detail`, { token: head })],
  ['T|POST /security/msg-check', () => call('/security/msg-check', { method: 'POST', token: head, body: { content: '你好，这是一条正常消息' } })],
  ['T|POST /security/img-check', () => call('/security/img-check', { method: 'POST', token: head, body: { image: '' } })],
  ['T|POST /im/user-sig', () => call('/im/user-sig', { method: 'POST', token: head, body: {} })],
  ['T|GET  /im/parents?classId=' + class1, () => call(`/im/parents?classId=${class1}`, { token: head })],
  ['T|POST /im/class-group', () => call('/im/class-group', { method: 'POST', token: head, body: { classId: class1 } })],
  ['T|POST /notices (scope=class)', () => call('/notices', { method: 'POST', token: head, body: { classId: class1, title: 'QA探测公告', content: '内容', scope: 'class', pinned: false } })],
  ['T|POST /notices (scope=school)', () => call('/notices', { method: 'POST', token: head, body: { title: 'QA探测学校公告', content: '内容', scope: 'school' } })],
  ['T|POST /grades/merge', () => call('/grades/merge', { method: 'POST', token: head, body: { classId: class1, subject: '语文', examName: 'QA探测考试', date: '2026-08-02', scores: [{ studentId: stu.id, score: 95 }] } })],
  ['T|POST /grades/import-preview', () => call('/grades/import-preview', { method: 'POST', token: head, body: { classId: class1, filename: 'a.txt', data: Buffer.from('31001,98\n张小明,99').toString('base64') } })],
  ['T|GET  /grades/analysis/trend?classId=' + class1, () => call(`/grades/analysis/trend?classId=${class1}`, { token: head })],
  ['T|GET  /messages/sent', () => call('/messages/sent', { token: head })],
  ['T|POST /messages/mark-all-read', () => call('/messages/mark-all-read', { method: 'POST', token: head, body: {} })],
  ['P|GET  /notifications/unread-count', () => call('/notifications/unread-count', { token: parent })],
  ['T|GET  /generated/papers', () => call('/generated/papers', { token: head })],
  ['T|POST /generated/papers', () => call('/generated/papers', { method: 'POST', token: head, body: { title: 'QA试卷', grade: '三年级', subject: '语文', content: '内容' } })],
]

for (const [label, fn] of probes) {
  try {
    const r = await fn()
    const body = typeof r.d === 'object' && r.d ? JSON.stringify(r.d).slice(0, 110) : String(r.d).slice(0, 110)
    console.log(`${label.padEnd(42)} => ${r.status} ${body}`)
  } catch (e) {
    console.log(`${label.padEnd(42)} => ERR ${e.message}`)
  }
}
