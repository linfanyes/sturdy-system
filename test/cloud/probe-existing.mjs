/**
 * 检查已有学校内是否已存在班级/学生（用超管新建校管绑定该校后登录查看）。
 */
const BASE = process.env.BASE || 'https://tec-work-283329-8-1440166408.sh.run.tcloudbase.com/api/v1'
const SUPER = { username: 'admin', password: 'admin@520' }
const SCHOOL_ID = 'a28cb0a9-4fb8-4d28-8061-3a94ad178eb4' // 测试梧桐小学
const j = (r) => r.json().catch(() => ({}))
async function req(method, path, { token, body } = {}) {
  const res = await fetch(BASE + path, {
    method,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: 'Bearer ' + token } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  })
  return { status: res.status, data: await j(res) }
}
async function main() {
  let r = await req('POST', '/auth/unified-login', { body: SUPER })
  const token = r.data.token
  console.log('super:', r.status)

  const uname = 'sad_probe_2'
  r = await req('POST', '/admin/school-admins', { token, body: { username: uname, password: 'Sad12345', name: '探查校管2', schoolId: SCHOOL_ID, enabled: true } })
  console.log('create sadm:', r.status, JSON.stringify(r.data).slice(0, 160))

  r = await req('POST', '/auth/unified-login', { body: { username: uname, password: 'Sad12345' } })
  console.log('sadm login:', r.status, r.data?.role)
  const st = r.data.token

  r = await req('GET', '/school-admin/classes?take=20', { token: st })
  const classes = r.data?.items || []
  console.log('classes:', r.data?.total, 'sample:', JSON.stringify(classes[0] || null).slice(0, 220))

  r = await req('GET', '/school-admin/teachers?take=20', { token: st })
  console.log('teachers:', r.data?.total, 'sample:', JSON.stringify((r.data?.items || [])[0] || null).slice(0, 220))

  if (classes.length) {
    r = await req('GET', `/school-admin/students?classId=${classes[0].id}&take=5`, { token: st })
    console.log('students for first class:', r.data?.total, JSON.stringify((r.data?.items || [])[0] || null).slice(0, 200))
  }
}
main().catch((e) => { console.error(e); process.exit(1) })
