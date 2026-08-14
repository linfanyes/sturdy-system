/**
 * 清理真实环境残留测试学校（按前缀 PX/S9/Q 等）。
 * 先删校管 → 再删学校（deleteSchool 会自动级联清理教师/班级/学生/成绩）。
 * 用法：node test/cloud/cleanup.mjs
 */
const BASE = process.env.BASE || 'https://tec-work-283329-8-1440166408.sh.run.tcloudbase.com/api/v1'
const SUPER = { username: 'admin', password: 'admin@520' }

const log = (...a) => console.log(...a)
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
  log('=== 清理残留测试学校 ===')
  let r = await req('POST', '/auth/unified-login', { body: SUPER })
  const token = r.data?.token
  if (!token) throw new Error('超管登录失败')

  r = await req('GET', '/admin/schools?take=500', { token })
  const all = r.data?.items || []
  // 匹配所有测试前缀（PX, S9, Q 开头）
  const testSchools = all.filter(s => /^(PX|S9|Q)/.test(s.code || ''))
  log(`共有 ${all.length} 所学校，需要清理 ${testSchools.length} 所测试学校`)

  let ok = 0, fail = 0
  for (const school of testSchools) {
    // 1. 查校管并删除
    r = await req('GET', `/admin/school-admins?take=500`, { token })
    const admins = (r.data?.items || []).filter(a => a.schoolId === school.id)
    for (const admin of admins) {
      await req('DELETE', `/admin/school-admins/${admin.id}`, { token })
      log(`  [清理] 删除校管 ${admin.username} (${school.code})`)
    }

    // 2. 删学校（级联清理教师/班级/学生/成绩）
    r = await req('DELETE', `/admin/schools/${school.id}`, { token })
    if (r.status < 400) {
      ok++
      log(`  [OK] 已删除 ${school.code} ${school.name}`)
    } else {
      fail++
      log(`  [FAIL] ${school.code} ${school.name}: ${JSON.stringify(r.data).slice(0, 120)}`)
    }
  }
  log(`\n清理完成: 成功 ${ok}, 失败 ${fail}`)
}

main().catch(e => { console.error(e); process.exit(1) })