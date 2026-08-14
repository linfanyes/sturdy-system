/**
 * 精确探测云端建班/建生报错（打印完整错误），确认 schema 漂移具体缺哪一列。
 * 用法：node test/cloud/probe-schema.mjs
 */
const BASE = process.env.BASE || 'https://tec-work-283329-8-1440166408.sh.run.tcloudbase.com/api/v1'
const SUPER = { username: 'admin', password: 'admin@520' }

async function req(method, path, { token, body } = {}) {
  const res = await fetch(BASE + path, {
    method,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: 'Bearer ' + token } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  })
  const txt = await res.text()
  return { status: res.status, txt }
}

async function main() {
  // 超管登录
  let r = await req('POST', '/auth/unified-login', { body: SUPER })
  const superToken = JSON.parse(r.txt).token
  console.log('super login:', r.status)

  // 建校（新校，避免污染已有数据）
  const prefix = 'PX'
  r = await req('POST', '/admin/schools', { token: superToken, body: { name: 'Schema探测校', prefix, platform: 'web' } })
  const school = JSON.parse(r.txt)
  console.log('school:', r.status, school.code || school)

  // 建校管
  r = await req('POST', '/admin/school-admins', { token: superToken, body: { username: 'sad_px', password: 'Sad12345', name: '探测校管', schoolId: school.id, enabled: true } })
  console.log('school-admin:', r.status, r.txt.slice(0, 200))

  r = await req('POST', '/auth/unified-login', { body: { username: 'sad_px', password: 'Sad12345' } })
  const sadToken = JSON.parse(r.txt).token
  console.log('sadm login:', r.status)

  // 建教师
  r = await req('POST', '/school-admin/teachers/batch', { token: sadToken, body: { teachers: [{ name: '探测班主任', username: 'ht_px', password: 'Teacher123', subject: '语文', grade: '一年级' }] } })
  console.log('teachers:', r.status, r.txt.slice(0, 300))

  // 建班级（完整报错）
  r = await req('POST', '/school-admin/classes/batch', { token: sadToken, body: { classes: [{ name: '一年级1班', grade: '一年级', classNo: '1', headTeacher: '探测班主任', term: '2026春' }] } })
  console.log('\n=== 建班完整响应 ===')
  console.log(r.status)
  console.log(r.txt)

  // 建学生（完整报错）
  r = await req('POST', '/school-admin/students/batch', { token: sadToken, body: { students: [{ name: '探测学生', gender: '男', studentNo: 'PX0001', classId: 'dummy' }] } })
  console.log('\n=== 建生完整响应 ===')
  console.log(r.status)
  console.log(r.txt)
}

main().catch((e) => { console.error(e); process.exit(1) })
