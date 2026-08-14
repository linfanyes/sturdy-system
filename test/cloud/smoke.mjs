/**
 * 云端冒烟测试：验证「建校 → 校管 → 教师/班级/学生 → 考试/成绩 → 家长」全链路，
 * 并测量真实吞吐与 600/min 全局限流行为，为全量数据生成定参。
 * 用法：node test/cloud/smoke.mjs
 */
const BASE = process.env.BASE || 'https://tec-work-283329-8-1440166408.sh.run.tcloudbase.com/api/v1'
const SUPER = { username: 'admin', password: 'admin@520' }

const stats = { ok: 0, fail: 0, retry: 0, ms: [] }
const log = (...a) => console.log(...a)

async function req(method, path, { token, body } = {}) {
  const start = Date.now()
  const res = await fetch(BASE + path, {
    method,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: 'Bearer ' + token } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  })
  const ms = Date.now() - start
  stats.ms.push(ms)
  let data = null
  const txt = await res.text()
  try { data = txt ? JSON.parse(txt) : null } catch { data = txt }
  stats.ok++
  return { status: res.status, data, ms }
}
const ok = (name, cond, extra = '') => {
  console.log(`  ${cond ? '[PASS]' : '[FAIL]'} ${name}${extra ? ' | ' + extra : ''}`)
  if (!cond) stats.fail++
}
const errOf = (e) => (e?.data ? `${e.status} ${JSON.stringify(e.data).slice(0, 160)}` : String(e))

async function main() {
  const t0 = Date.now()
  log('=== 云端冒烟：', BASE, '===')

  // 1. 超管登录
  let r = await req('POST', '/auth/unified-login', { body: SUPER })
  ok('超管登录', r.status === 200 || r.status === 201, `status=${r.status}`)
  const superToken = r.data?.token
  if (!superToken) throw new Error('超管登录失败: ' + errOf(r))

  // 2. 建校
  const prefix = 'S9'
  r = await req('POST', '/admin/schools', { token: superToken, body: { name: '冒烟测试小学', prefix, platform: 'web', address: '测试路1号', status: 'active' } })
  ok('创建学校', r.status === 201 || r.status === 200, errOf(r))
  const schoolId = r.data?.id
  const schoolCode = r.data?.code
  if (!schoolId) throw new Error('建校失败')

  // 3. 建校管
  const sadm = { username: 'sad_smoke', password: 'Sad12345', name: '冒烟校管', schoolId, enabled: true }
  r = await req('POST', '/admin/school-admins', { token: superToken, body: sadm })
  ok('创建校管', r.status === 201 || r.status === 200, errOf(r))

  // 4. 校管登录
  r = await req('POST', '/auth/unified-login', { body: { username: sadm.username, password: sadm.password } })
  ok('校管登录', r.status === 200 || r.status === 201, `role=${r.data?.role}`)
  const sadToken = r.data?.token

  // 5. 批量建教师（班主任 x1 + 科任 x3）
  const teachers = [
    { name: '三年级一班班主任', username: 'ht_smoke01', password: 'Teacher123', subject: '语文', grade: '三年级' },
    { name: '三年级语文老师', username: 'st_smoke_cn', password: 'Teacher123', subject: '语文', grade: '三年级' },
    { name: '三年级数学老师', username: 'st_smoke_ma', password: 'Teacher123', subject: '数学', grade: '三年级' },
    { name: '三年级英语老师', username: 'st_smoke_en', password: 'Teacher123', subject: '英语', grade: '三年级' },
  ]
  r = await req('POST', '/school-admin/teachers/batch', { token: sadToken, body: { teachers } })
  ok('批量建教师', r.status === 201 && r.data?.success === 4, errOf(r))
  const head = r.data?.results?.find(x => x.username === 'ht_smoke01')

  // 6. 批量建班级（班主任按姓名解析）
  r = await req('POST', '/school-admin/classes/batch', { token: sadToken, body: { classes: [{ name: '三年级1班', grade: '三年级', classNo: '1', headTeacher: '三年级一班班主任', term: '2026春' }] } })
  ok('批量建班级', r.status === 201 && r.data?.success === 1, errOf(r))
  r = await req('GET', '/school-admin/classes?take=50', { token: sadToken })
  const cls = (r.data?.items || []).find(c => c.grade === '三年级' && c.classNo === '1')
  ok('班级列表', !!cls, `classId=${cls?.id}`)
  const classId = cls?.id

  // 7. 批量建学生 45 人
  const students = Array.from({ length: 45 }, (_, i) => {
    const g = i % 2 === 0 ? '男' : '女'
    return { name: `冒烟学生${String(i + 1).padStart(3, '0')}`, gender: g, studentNo: `S9${String(i + 1).padStart(3, '0')}`, classId, parentName: '冒烟家长', parentPhone: `1380000${String(i).padStart(4, '0')}` }
  })
  r = await req('POST', '/school-admin/students/batch', { token: sadToken, body: { students } })
  ok('批量建学生45', r.status === 201 && r.data?.success === 45, errOf(r))
  r = await req('GET', `/school-admin/students?classId=${classId}&take=500`, { token: sadToken })
  const stus = r.data?.items || []
  ok('学生列表45', stus.length === 45, `count=${stus.length}`)

  // 8. 开通家长登录（1 人）
  const stu = stus[0]
  r = await req('POST', `/students/${stu.id}/toggle-parent-login`, { token: sadToken })
  ok('开通家长登录', r.status === 200 || r.status === 201, errOf(r))

  // 9. 班主任登录
  r = await req('POST', '/auth/unified-login', { body: { username: 'ht_smoke01', password: 'Teacher123' } })
  ok('班主任登录', r.status === 200 || r.status === 201, `role=${r.data?.role}`)
  const headToken = r.data?.token

  // 10. 建考试（自动建3科空成绩）
  r = await req('POST', '/exams', { token: headToken, body: { name: '2026春月考1', term: '2026春', classId, subjects: ['语文', '数学', '英语'], subjectFullScores: { 语文: 100, 数学: 100, 英语: 100 }, date: '2026-03-10' } })
  ok('创建考试', r.status === 201 || r.status === 200, errOf(r))
  const examId = r.data?.id

  // 11. 提交 3 科成绩
  for (const [si, subject] of ['语文', '数学', '英语'].entries()) {
    const rows = stus.map((s, i) => ({ studentId: s.id, score: 60 + ((i * 7 + si * 5) % 41), valid: true }))
    r = await req('POST', '/grades/import-commit', { token: headToken, body: { classId, examId, examName: '2026春月考1', subject, date: '2026-03-10', rows } })
    ok(`提交${subject}成绩45`, (r.status === 200 || r.status === 201) && r.data?.count === 45, errOf(r))
  }

  // 12. 家长登录（学号+123456）
  r = await req('POST', '/parent-auth/login', { body: { studentNo: stu.studentNo, password: '123456' } })
  ok('家长登录', r.status === 200 || r.status === 201, `role=${r.data?.role}`)

  // 13. 性能采样：连发 30 个轻量 GET，测吞吐与是否触发 429
  const t1 = Date.now()
  let burstOk = 0, burst429 = 0
  for (let i = 0; i < 30; i++) {
    const rr = await req('GET', '/health', {})
    if (rr.status === 429) burst429++
    else burstOk++
  }
  const burstMs = Date.now() - t1
  log(`  吞吐采样: 30 请求 / ${burstMs}ms = ${(30000 / burstMs).toFixed(1)} req/s (429=${burst429})`)

  const totalMs = Date.now() - t0
  const avg = (stats.ms.reduce((a, b) => a + b, 0) / Math.max(1, stats.ms.length)).toFixed(0)
  log(`\n=== 冒烟结束: PASS/FAIL = ${stats.ok - stats.fail}/${stats.fail}，总耗时 ${(totalMs / 1000).toFixed(1)}s，平均单请求 ${avg}ms ===`)
  process.exit(stats.fail ? 1 : 0)
}

main().catch((e) => { console.error('冒烟失败:', e); process.exit(1) })
