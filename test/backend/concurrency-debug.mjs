// 临时调试脚本：复现 G5 并发创建学生的失败原因
import { createRequire } from 'module'
import fs from 'fs'
const require = createRequire('/workspace/work-system/server/')
const axios = require('axios')
const BASE = 'http://127.0.0.1:3000/api/v1'
const env = {}
for (const line of fs.readFileSync('/workspace/work-system/server/.env', 'utf8').split('\n')) {
  const m = line.match(/^\s*([A-Z0-9_]+)=(.*)$/)
  if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, '')
}
const req = async (method, url, { data, token } = {}) => {
  const headers = token ? { Authorization: 'Bearer ' + token } : {}
  if (data) headers['Content-Type'] = 'application/json'
  const res = await axios({ method, url: BASE + url, data, headers, timeout: 30000, validateStatus: () => true })
  return { status: res.status, data: res.data }
}
const TS = new Date().getTime().toString().slice(-6)
const l = await req('POST', '/auth/unified-login', { data: { username: env.SUPER_ADMIN_USER || 'admin', password: env.SUPER_ADMIN_PASSWORD || 'admin123' } })
const superToken = l.data.token
const ls = await req('GET', '/admin/schools', { token: superToken, data: undefined })
const schools = Array.isArray(ls.data) ? ls.data : (ls.data?.items || [])
const school = schools[0]
const saList = await req('GET', '/admin/school-admins', { token: superToken })
const admins = Array.isArray(saList.data) ? saList.data : (saList.data?.items || [])
const sa = admins.find(a => a.schoolId === school.id)
const saToken = (await req('POST', '/auth/unified-login', { data: { username: sa.username, password: 'Reset123' } })).data.token
const tList = await req('GET', '/school-admin/teachers', { token: saToken })
const teachers = Array.isArray(tList.data) ? tList.data : (tList.data?.items || [])
const t = teachers[0]
const tLogin = await req('POST', '/auth/unified-login', { data: { username: t.username, password: 'Teacher456' } })
const tToken = tLogin.data.token
const cls = await req('GET', '/classes', { token: tToken, data: undefined })
const classes = Array.isArray(cls.data) ? cls.data : (cls.data?.items || [])
const class1 = classes[0]
console.log('class1:', class1.id, class1.name)
const conc = []
for (let i = 0; i < 20; i++) {
  conc.push(req('POST', '/students', { token: tToken, data: { name: `并发${i}`, gender: '男', studentNo: `BF${TS}${i}`, classId: class1.id } }))
}
const res = await Promise.all(conc)
res.forEach((r, i) => {
  if (r.status !== 201 && r.status !== 200) {
    console.log(`FAIL #${i}: status=${r.status} ${JSON.stringify(r.data).slice(0, 200)}`)
  } else {
    console.log(`ok #${i}`)
  }
})
