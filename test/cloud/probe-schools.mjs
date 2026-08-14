/**
 * 枚举真实环境已有学校，检查是否存在可用班级，用于隔离学生建表缺列。
 */
const BASE = process.env.BASE || 'https://tec-work-283329-8-1440166408.sh.run.tcloudbase.com/api/v1'
const SUPER = { username: 'admin', password: 'admin@520' }
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

  r = await req('GET', '/admin/schools?take=100', { token })
  const schools = r.data?.items || []
  console.log('schools total:', r.data?.total ?? schools.length, 'count:', schools.length)
  for (const s of schools.slice(0, 30)) {
    console.log(' -', s.code, s.name, s.id)
  }
}
main().catch((e) => { console.error(e); process.exit(1) })
