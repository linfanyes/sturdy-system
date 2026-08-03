import { writeFileSync } from 'node:fs'

const BASE = 'https://tec-work-283329-8-1440166408.sh.run.tcloudbase.com/api'
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

async function api(method, path, body = null, token = '') {
  const headers = { 'Content-Type': 'application/json' }
  if (token) headers['Authorization'] = `Bearer ${token}`
  const resp = await fetch(BASE + path, { method, headers, body: body === null ? undefined : JSON.stringify(body) })
  const text = await resp.text()
  let data
  try { data = JSON.parse(text) } catch { data = text }
  return { status: resp.status, data }
}

const SUFFIX = Date.now().toString(36).toUpperCase()
const PW = 'Test@2026'
const out = { base: BASE, generatedAt: new Date().toISOString(), suffix: SUFFIX, roles: {}, entities: {}, notes: [] }

async function main() {
  // 1) 超管
  let r = await api('POST', '/admin/login', { username: 'admin', password: 'admin' })
  if (r.status !== 201 && r.status !== 200) throw new Error('超管登录失败 ' + r.status + ' ' + JSON.stringify(r.data))
  const superToken = r.data.token || r.data?.data?.token
  out.roles.super = { username: 'admin', password: 'admin', token: superToken }
  console.log('✅ 超管登录')

  // 2) 学校
  r = await api('POST', '/admin/schools', {
    name: `园丁测试学校_${SUFFIX}`, prefix: 'QA', address: '测试路1号', contact: '测试主任', phone: '13800000000', platform: 'mini',
  }, superToken)
  if (r.status !== 201 && r.status !== 200) throw new Error('建校失败 ' + r.status + ' ' + JSON.stringify(r.data))
  const schoolId = r.data.id || r.data?.data?.id
  out.entities.schoolId = schoolId
  console.log('✅ 建校', schoolId)

  // 3) 校管
  r = await api('POST', '/admin/school-admins', {
    username: `qa_sa_${SUFFIX}`, password: PW, name: '测试校管', schoolId, enabled: true,
  }, superToken)
  if (r.status !== 201 && r.status !== 200) throw new Error('建校管失败 ' + r.status + ' ' + JSON.stringify(r.data))
  out.roles.school_admin = { username: `qa_sa_${SUFFIX}`, password: PW }
  console.log('✅ 建校管', out.roles.school_admin.username)

  // 校管登录
  await sleep(800)
  r = await api('POST', '/auth/unified-login', { username: out.roles.school_admin.username, password: PW })
  if (r.status !== 201) throw new Error('校管登录失败 ' + r.status + ' ' + JSON.stringify(r.data))
  const saToken = r.data.token
  out.roles.school_admin.token = saToken
  console.log('✅ 校管登录')

  // 4) 教师 x2
  const teachers = []
  for (const [uname, name] of [['qa_teacher1', '王老师'], ['qa_teacher2', '李老师']]) {
    r = await api('POST', '/school-admin/teachers', {
      username: `${uname}_${SUFFIX}`, password: PW, name, gender: '女', subject: '语文', teacherNo: `JSQA${SUFFIX}${teachers.length}`,
      phone: `139${String(10000000 + teachers.length).padStart(8, '0')}`,
    }, saToken)
    if (r.status !== 201 && r.status !== 200) throw new Error('建教师失败 ' + uname + ' ' + r.status + ' ' + JSON.stringify(r.data))
    teachers.push({ id: r.data.id || r.data?.data?.id, username: `${uname}_${SUFFIX}`, name })
    console.log('✅ 建教师', uname)
    await sleep(300)
  }
  out.entities.teacherIds = teachers.map((t) => t.id)

  // 5) 班级（班主任=teacher1）
  r = await api('POST', '/school-admin/classes', {
    name: '一年级1班', grade: '一年级', classNo: '1',
    headTeacher: teachers[0].name, headTeacherId: teachers[0].id, term: '2026秋季',
    subjects: ['语文', '数学'],
  }, saToken)
  if (r.status !== 201 && r.status !== 200) throw new Error('建班失败 ' + r.status + ' ' + JSON.stringify(r.data))
  const classId = r.data.id || r.data?.data?.id
  out.entities.classId = classId
  console.log('✅ 建班', classId)

  // 6) 学生 x8（自动建家长，默认密码 123456）
  const names = ['小明', '小红', '小刚', '小丽', '小强', '小芳', '小军', '小燕']
  const numBase = '88' + String(Date.now()).slice(-6)
  const students = names.map((n, i) => ({
    name: `${n}`, gender: i % 2 === 0 ? '男' : '女',
    studentNo: `${numBase}${String(i + 1).padStart(2, '0')}`,
    classId, parentName: `家长${n}`, parentPhone: `137${String(10000000 + i).padStart(8, '0')}`,
  }))
  r = await api('POST', '/school-admin/students/batch', { students }, saToken)
  if (r.status !== 201 && r.status !== 200) throw new Error('建学生失败 ' + r.status + ' ' + JSON.stringify(r.data))
  out.entities.studentNos = students.map((s) => s.studentNo)
  console.log('✅ 建学生', students.length, '首个学号', students[0].studentNo)

  // 7) 教师 token
  for (const t of teachers) {
    await sleep(400)
    const lr = await api('POST', '/auth/unified-login', { username: t.username, password: PW })
    if (lr.status === 201 && lr.data?.token) {
      out.roles['teacher_' + t.username] = { username: t.username, password: PW, token: lr.data.token, name: t.name }
      console.log('✅ 教师登录', t.username)
    } else {
      out.notes.push(`教师 ${t.username} 登录失败 ${lr.status}`)
    }
  }

  // 8) 家长登录（教师先授权学生家长登录 → 默认密码 123456）
  const t1 = out.roles['teacher_qa_teacher1_' + SUFFIX]?.token
  if (t1) {
    const lr = await api('GET', `/students?classId=${classId}&take=20`, null, t1)
    const stus = Array.isArray(lr.data) ? lr.data : (lr.data?.items || [])
    const first = stus[0]
    if (first?.id) {
      await sleep(400)
      const tog = await api('POST', `/students/${first.id}/toggle-parent-login`, {}, t1)
      out.notes.push(`toggle-parent-login -> ${tog.status} pw=${tog.data?.initialPassword || ''}`)
      await sleep(400)
      r = await api('POST', '/parent-auth/login', { studentNo: first.studentNo, password: '123456' })
      if (r.status === 201 || r.status === 200) {
        out.roles.parent = { studentNo: first.studentNo, password: '123456', token: r.data?.token, parentId: r.data?.parent?.id, studentId: first.id }
        console.log('✅ 家长登录', first.studentNo)
      } else {
        out.notes.push(`家长登录失败 ${r.status} ${JSON.stringify(r.data).slice(0, 140)}`)
      }
    } else {
      out.notes.push('未能获取学生ID以授权家长登录')
    }
  } else {
    out.notes.push('teacher1 无 token，跳过家长授权')
  }

  writeFileSync(new URL('./mini-test-tokens.json', import.meta.url), JSON.stringify(out, null, 2))
  console.log('\n=== 开通完成，token 已保存 ===')
  console.log('schoolId:', schoolId)
  console.log('classId:', classId)
  console.log('teacherIds:', out.entities.teacherIds)
  console.log('studentNos:', out.entities.studentNos)
  console.log('roles saved:', Object.keys(out.roles).join(', '))
  console.log('notes:', out.notes)
}

main().catch((e) => { console.error('PROVISION ERROR:', e.message); process.exit(1) })
