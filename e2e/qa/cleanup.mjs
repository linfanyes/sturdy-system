// QA 测试数据清理：删除测试学校（级联清理校管/教师/班级/学生等）
// 用法: node e2e/qa/cleanup.mjs
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
const __dirname = path.dirname(fileURLToPath(import.meta.url))
const envPath = path.join(__dirname, 'qa-env.json')
if (!fs.existsSync(envPath)) { console.log('无 qa-env.json，无需清理'); process.exit(0) }
const env = JSON.parse(fs.readFileSync(envPath, 'utf8'))
const BASE = env.base
const j = { 'Content-Type': 'application/json' }
const call = async (p, opt = {}) => {
  const r = await fetch(BASE + p, { method: opt.method || 'GET', headers: { ...j, ...(opt.token ? { Authorization: 'Bearer ' + opt.token } : {}) }, body: opt.body ? JSON.stringify(opt.body) : undefined })
  const t = await r.text(); let d; try { d = t ? JSON.parse(t) : null } catch { d = t }
  return { status: r.status, ok: r.ok, d }
}
const su = await call('/admin/login', { method: 'POST', body: { username: process.env.QA_SUPER_USER || 'admin', password: process.env.QA_SUPER_PASS || 'admin' } })
if (!su.ok || !su.d?.token) { console.error('超管登录失败，无法清理'); process.exit(1) }
const tk = su.d.token

// 1) 删除测试校管（qa_sa / qa_sa2 / 临时教师账号由学校级联删除）
const admins = await call('/admin/school-admins?skip=0&take=100', { token: tk })
const al = Array.isArray(admins.d) ? admins.d : admins.d?.items || []
for (const a of al) {
  if (a.username.startsWith('qa_') || a.username.startsWith('smoke_')) {
    const r = await call(`/admin/school-admins/${a.id}`, { method: 'DELETE', token: tk })
    console.log(r.ok ? '✔ 删除校管 ' + a.username : '✘ 校管 ' + a.username + ' ' + JSON.stringify(r.d).slice(0, 80))
  }
}
// 2) 删除测试学校
const schools = await call('/admin/schools?skip=0&take=100', { token: tk })
const sl = Array.isArray(schools.d) ? schools.d : schools.d?.items || []
for (const s of sl) {
  if (s.name.startsWith('QA-代码审查测试学校')) {
    const r = await call(`/admin/schools/${s.id}`, { method: 'DELETE', token: tk })
    console.log(r.ok ? '✔ 删除测试学校 ' + s.name : '✘ 学校删除失败 ' + JSON.stringify(r.d).slice(0, 120))
  }
}
// 3) 清理清单文件
fs.unlinkSync(envPath)
console.log('✔ 清理完成，qa-env.json 已删除')
