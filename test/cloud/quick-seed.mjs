/**
 * 快速云端数据写入脚本：5 学校 × 6 年级 × 3 班级 × 30 学生 × 10 考试
 */
const BASE = 'https://tec-work-283329-8-1440166408.sh.run.tcloudbase.com/api/v1'

const SCHOOLS = [
  { id: '37150479-63f3-4b30-9130-6401a6323eae', name: '云端测试小学01', prefix: 'T1' },
  { id: 'f6750f89-6024-46e4-839f-ba38b1903db6', name: '云端测试小学02', prefix: 'T2' },
  { id: '59f443a4-6a67-446c-85fd-17e91a45afd4', name: '云端测试小学03', prefix: 'T3' },
  { id: 'e964e270-434b-47ab-972a-475ec0854154', name: '云端测试小学04', prefix: 'T4' },
  { id: '0c0c1ee8-6103-4f05-bf03-9a4f167cab7d', name: '云端测试小学05', prefix: 'T5' },
]

const GRADES = ['一年级', '二年级', '三年级', '四年级', '五年级', '六年级']
const SUBJECTS = ['语文', '数学', '英语']
const EXAMS = ['第一次月考', '期中考试', '第二次月考', '第三次月考', '第四次月考', '第五次月考', '第六次月考', '期末考试', '摸底考试', '综合测试']
const PASSWORD = 'Teacher123'

async function req(method, path, { token, body } = {}) {
  const res = await fetch(BASE + path, {
    method,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: 'Bearer ' + token } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  })
  const txt = await res.text()
  let data = null
  try { data = txt ? JSON.parse(txt) : null } catch { data = txt }
  return { status: res.status, data }
}

async function main() {
  // 超管登录
  let r = await req('POST', '/auth/unified-login', { body: { username: 'admin', password: 'admin@520' } })
  if (!r.data?.token) throw new Error('超管登录失败: ' + JSON.stringify(r.data))
  const superToken = r.data.token
  console.log('✅ 超管登录成功')

  for (const school of SCHOOLS) {
    console.log(`\n🏫 ${school.name} (${school.prefix})`)

    // 创建校管
    const adminUser = `sad_${school.prefix.toLowerCase()}`
    r = await req('POST', '/admin/school-admins', {
      token: superToken,
      body: { username: adminUser, password: PASSWORD, name: `${school.name}校管`, schoolId: school.id, enabled: true },
    })
    if (r.status >= 400) {
      console.log(`  ⚠️ 校管创建失败: ${JSON.stringify(r.data).slice(0, 100)}`)
      continue
    }
    console.log(`  ✅ 校管 ${adminUser}`)

    // 校管登录
    r = await req('POST', '/auth/unified-login', { body: { username: adminUser, password: PASSWORD } })
    if (!r.data?.token) {
      console.log(`  ⚠️ 校管登录失败`)
      continue
    }
    const sadToken = r.data.token

    // 创建教师（班主任 + 科任老师）
    const teachers = []
    for (const g of GRADES) {
      for (let c = 1; c <= 3; c++) {
        const headName = `${g}${c}班班主任`
        teachers.push({ name: headName, username: `ht_${school.prefix}_${g}_${c}`, password: PASSWORD, subject: '语文', grade: g })
      }
    }
    for (const g of GRADES) {
      for (const sub of SUBJECTS) {
        teachers.push({ name: `${g}${sub}老师`, username: `st_${school.prefix}_${g}_${sub}`, password: PASSWORD, subject: sub, grade: g })
      }
    }

    r = await req('POST', '/school-admin/teachers/batch', { token: sadToken, body: { teachers } })
    if (r.status >= 400) {
      console.log(`  ⚠️ 教师创建失败: ${JSON.stringify(r.data).slice(0, 100)}`)
      continue
    }
    console.log(`  ✅ ${teachers.length} 位教师`)

    // 获取已创建教师列表
    r = await req('GET', '/school-admin/teachers?take=500', { token: sadToken })
    const allTeachers = r.data?.items || []
    const teacherMap = new Map(allTeachers.map(t => [t.name, t]))

    // 创建班级
    const classes = []
    for (const g of GRADES) {
      for (let c = 1; c <= 3; c++) {
        classes.push({ name: `${g}${c}班`, grade: g, classNo: String(c), term: '2026春', headTeacher: `${g}${c}班班主任` })
      }
    }
    r = await req('POST', '/school-admin/classes/batch', { token: sadToken, body: { classes } })
    if (r.status >= 400) {
      console.log(`  ⚠️ 班级创建失败: ${JSON.stringify(r.data).slice(0, 100)}`)
      continue
    }
    console.log(`  ✅ ${classes.length} 个班级`)

    // 获取班级列表
    r = await req('GET', '/school-admin/classes?take=500', { token: sadToken })
    const allClasses = r.data?.items || []
    const classMap = new Map(allClasses.map(c => [c.name, c]))

    // 创建学生 + 考试 + 成绩
    for (const cls of classes) {
      const clsId = classMap.get(cls.name)?.id
      if (!clsId) continue

      const students = []
      for (let i = 0; i < 30; i++) {
        students.push({
          name: `${cls.grade}${cls.classNo}班${String(i + 1).padStart(2, '0')}号`,
          gender: i % 2 === 0 ? '男' : '女',
          studentNo: `${school.prefix}${cls.grade.slice(-1)}${cls.classNo}${String(i + 1).padStart(2, '0')}`,
          classId: clsId,
        })
      }

      r = await req('POST', '/school-admin/students/batch', { token: sadToken, body: { students } })
      if (r.status >= 400) {
        console.log(`    ⚠️ 学生创建失败 ${cls.name}: ${JSON.stringify(r.data).slice(0, 80)}`)
        continue
      }

      // 获取学生列表
      r = await req('GET', `/school-admin/students?classId=${clsId}&take=100`, { token: sadToken })
      const stus = r.data?.items || []

      // 班主任登录创建考试和成绩
      const headUser = `ht_${school.prefix}_${cls.grade}_${cls.classNo}`
      r = await req('POST', '/auth/unified-login', { body: { username: headUser, password: PASSWORD } })
      const teacherToken = r.data?.token
      if (!teacherToken) continue

      for (let ei = 0; ei < 10; ei++) {
        const examName = EXAMS[ei]
        r = await req('POST', '/exams', {
          token: teacherToken,
          body: { name: examName, term: '2026春', classId: clsId, subjects: SUBJECTS, subjectFullScores: { 语文: 100, 数学: 100, 英语: 100 }, date: `2026-0${(ei % 9) + 2}-${String((ei % 28) + 1).padStart(2, '0')}` },
        })
        if (r.status >= 400) continue
        const examId = r.data.id

        for (const sub of SUBJECTS) {
          const rows = stus.map((s, i) => ({
            studentId: s.id,
            score: Math.floor(40 + Math.random() * 60),
            valid: true,
          }))
          await req('POST', '/grades/import-commit', {
            token: teacherToken,
            body: { classId: clsId, examId, examName, subject: sub, date: '2026-03-15', rows },
          })
        }
      }
      console.log(`    ✅ ${cls.name}: ${stus.length} 学生, 10 考试 × 3 科成绩`)
    }
  }

  console.log('\n✅ 数据写入完成')
}

main().catch(e => { console.error(e); process.exit(1) })
