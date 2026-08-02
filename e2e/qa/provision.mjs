// QA 测试数据准备：创建专用测试学校 + 校管 + 教师 + 班级 + 学生（家长）
// 用法: node e2e/qa/provision.mjs
// 产物: e2e/qa/qa-env.json （账号/ID 清单，供 api-tests.mjs 与 cleanup.mjs 使用）
const BASE = (process.env.QA_API_BASE || 'https://tec-work-283329-8-1440166408.sh.run.tcloudbase.com/api').replace(/\/$/, '')
const SU = process.env.QA_SUPER_USER || 'admin'
const SP = process.env.QA_SUPER_PASS || 'admin'
const PW = 'Test@2026'
const FS = await import('node:fs')
import path from 'node:path'
import { fileURLToPath } from 'node:url'
const __dirname = path.dirname(fileURLToPath(import.meta.url))
const OUT = path.join(__dirname, 'qa-env.json')

const j = { 'Content-Type': 'application/json' }
async function call(p, { method = 'GET', body, token } = {}) {
  const r = await fetch(BASE + p, {
    method,
    headers: { ...j, ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  })
  const t = await r.text()
  let d
  try { d = t ? JSON.parse(t) : null } catch { d = t }
  return { status: r.status, ok: r.ok, d }
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
async function loginWithRetry(p, body, tries = 10, gap = 800) {
  for (let i = 0; i < tries; i++) {
    const r = await call(p, { method: 'POST', body })
    if (r.ok && r.d?.token) return r.d
    if (i === tries - 1) throw new Error(`${p} 登录失败: ${JSON.stringify(r.d).slice(0, 120)}`)
    await sleep(gap)
  }
}

const env = { base: BASE, password: PW, created: {} }
try {
  // 1. 超管登录
  const su = await call('/admin/login', { method: 'POST', body: { username: SU, password: SP } })
  if (!su.ok || !su.d?.token) throw new Error('超管登录失败: ' + JSON.stringify(su.d).slice(0, 150))
  const suToken = su.d.token
  console.log('[1/6] 超管登录 OK')

  // 2. 建测试学校（幂等：先查同名）
  const stamp = new Date().toISOString().slice(0, 10).replace(/-/g, '')
  const schoolName = `QA-代码审查测试学校${stamp}`
  const schools = await call('/admin/schools?skip=0&take=100', { token: suToken })
  const list = Array.isArray(schools.d) ? schools.d : schools.d?.items || []
  let school = list.find((s) => s.name === schoolName)
  if (!school) {
    const r = await call('/admin/schools', {
      method: 'POST', token: suToken,
      body: { name: schoolName, prefix: 'QA', platform: 'web', address: 'QA测试地址', contact: 'QA', phone: '13800000000', status: 'active' },
    })
    if (!r.ok) throw new Error('建学校失败: ' + JSON.stringify(r.d).slice(0, 150))
    school = r.d
  }
  env.created.schoolId = school.id
  env.created.schoolName = school.name
  console.log('[2/6] 学校 OK:', school.name, school.id)

  // 2.5 给学校开启全部功能包（否则教师 effectiveFeatures 为空，业务接口全 403）
  const flagsRes = await call(`/admin/schools/${school.id}/features`, { token: suToken })
  let allFlags = flagsRes.d?.featureFlags || []
  if (!Array.isArray(allFlags) || !allFlags.length) {
    // 从任意教师的 rawFeatures 取全集（超管全开，这里用 me 接口拿不到全集，直接写全量 key）
    const ALL = ['classes', 'students', 'exams', 'grades', 'analysis', 'attendance', 'homework', 'tools', 'seats', 'games', 'rewards', 'growth', 'behavior', 'reading', 'checkin', 'finance', 'activities', 'duty', 'gallery', 'parents', 'im', 'notices', 'ai', 'schedule', 'worklog', 'observation', 'calendar', 'teachers', 'todos', 'notes', 'demo', 'office_tools', 'subject_tools', 'quicktool', 'grade_trend', 'picker_history', 'reward', 'translate', 'blackboard', 'speech']
    allFlags = ALL
    const up = await call(`/admin/schools/${school.id}/features`, { method: 'PATCH', body: { featureFlags: allFlags }, token: suToken })
    if (!up.ok) console.warn('[warn] 学校功能包开启失败:', JSON.stringify(up.d).slice(0, 120))
    else console.log('  [info] 学校功能包已全部开启')
  }

  // 3. 建校管 qa_sa（幂等）
  const admins = await call(`/admin/school-admins?skip=0&take=100`, { token: suToken })
  const adminList = Array.isArray(admins.d) ? admins.d : admins.d?.items || []
  let sa = adminList.find((a) => a.username === 'qa_sa')
  if (!sa) {
    const r = await call('/admin/school-admins', {
      method: 'POST', token: suToken,
      body: { username: 'qa_sa', password: PW, name: 'QA测试校管', schoolId: school.id, enabled: true },
    })
    if (!r.ok) throw new Error('建校管失败: ' + JSON.stringify(r.d).slice(0, 150))
    sa = r.d
  }
  env.created.saId = sa.id
  const saLogin = await loginWithRetry('/school-admin/login', { username: 'qa_sa', password: PW })
  env.created.saToken = saLogin.token
  console.log('[3/6] 校管 OK: qa_sa')

  // 4. 建教师 qa_teacher + qa_teacher2（幂等）
  const tea = await call('/school-admin/teachers?skip=0&take=100', { token: env.created.saToken })
  const teaList = Array.isArray(tea.d) ? tea.d : tea.d?.items || []
  let t1 = teaList.find((x) => x.username === 'qa_teacher')
  if (!t1) {
    const r = await call('/school-admin/teachers', {
      method: 'POST', token: env.created.saToken,
      body: { name: 'QA测试教师', username: 'qa_teacher', password: PW, phone: '13811112222', gender: '男', subject: '语文', subjects: ['语文'], positions: ['班主任'], grade: '三年级', enabled: true },
    })
    if (!r.ok) throw new Error('建教师失败: ' + JSON.stringify(r.d).slice(0, 150))
    t1 = r.d
  }
  let t2 = teaList.find((x) => x.username === 'qa_teacher2')
  if (!t2) {
    const r = await call('/school-admin/teachers', {
      method: 'POST', token: env.created.saToken,
      body: { name: 'QA测试教师2', username: 'qa_teacher2', password: PW, phone: '13833334444', gender: '女', subject: '数学', subjects: ['数学'], positions: ['科任'], grade: '三年级', enabled: true },
    })
    if (!r.ok) throw new Error('建教师2失败: ' + JSON.stringify(r.d).slice(0, 150))
    t2 = r.d
  }
  env.created.teacherId = t1.id
  env.created.teacher2Id = t2.id
  const tLogin = await loginWithRetry('/auth/unified-login', { username: 'qa_teacher', password: PW })
  env.created.teacherToken = tLogin.token
  const t2Login = await loginWithRetry('/auth/unified-login', { username: 'qa_teacher2', password: PW })
  env.created.teacher2Token = t2Login.token
  console.log('[4/6] 教师 OK: qa_teacher / qa_teacher2')

  // 5. 建班级 QA一班（幂等）
  const cls = await call('/school-admin/classes', { token: env.created.saToken })
  const clsList = Array.isArray(cls.d) ? cls.d : cls.d?.items || cls.d || []
  let cl = (Array.isArray(clsList) ? clsList : []).find((x) => x.name === 'QA一班')
  if (!cl) {
    const r = await call('/school-admin/classes', {
      method: 'POST', token: env.created.saToken,
      body: { name: 'QA一班', grade: '三年级', classNo: '1', headTeacher: 'QA测试教师', headTeacherId: t1.id, term: '2026-2027-1', subjects: ['语文', '数学', '英语'], subjectTeachers: [{ teacherId: t1.id, subjects: ['语文'] }, { teacherId: t2.id, subjects: ['数学', '英语'] }] },
    })
    if (!r.ok) throw new Error('建班级失败: ' + JSON.stringify(r.d).slice(0, 200))
    cl = r.d
  }
  env.created.classId = cl.id
  console.log('[5/6] 班级 OK: QA一班', cl.id)

  // 6. 建 3 名学生（家长=学号），并开启家长登录
  //    注意：校管端无 POST /school-admin/students（缺陷记录），学生用教师接口创建；
  //    学号必须纯数字（家长登录 studentNo 校验只接受数字）
  const stu = await call(`/school-admin/students`, { token: env.created.saToken })
  const stuList = Array.isArray(stu.d) ? stu.d : stu.d?.items || stu.d || []
  const existing = Array.isArray(stuList) ? stuList : []
  const kids = []
  for (const [i, sname] of ['QA学生甲', 'QA学生乙', 'QA学生丙'].entries()) {
    let s = (existing || []).find((x) => x.name === sname && x.classId === env.created.classId)
    if (!s) {
      const r = await call('/students', {
        method: 'POST', token: env.created.teacherToken,
        body: { classId: env.created.classId, name: sname, gender: i % 2 ? '女' : '男', studentNo: `12${String(101 + i)}`, parentName: sname + '家长', parentPhone: `139${String(10000000 + i)}` },
      })
      if (!r.ok) { console.warn('  [warn] 建学生失败:', JSON.stringify(r.d).slice(0, 120)); continue }
      s = r.d
    }
    const tgl = await call(`/students/${s.id}/toggle-parent-login`, { method: 'POST', token: env.created.teacherToken })
    if (!tgl.ok) console.warn('  [warn] 开启家长登录失败:', s.name)
    kids.push({ id: s.id, name: s.name, studentNo: s.studentNo })
  }
  env.created.students = kids
  console.log('[6/6] 学生 OK:', kids.map((k) => `${k.name}(${k.studentNo})`).join(', '))

  FS.writeFileSync(OUT, JSON.stringify(env, null, 2))
  console.log('✔ 环境清单已写入', OUT)
} catch (e) {
  console.error('❌ provision 失败:', e.message)
  process.exit(1)
}
