/**
 * 云端全量数据核验：核对 15校×6年级×10班×45生、教师配备、2学期×15考×3科成绩。
 * 按校使用「校管」token 访问学校内只读接口（超管无教师端/校管端权限），
 * 班级/考试/成绩/教师均从校管视角逐校核验。
 * 用法：node test/cloud/verify-data.mjs
 */
import { req, log, Pool } from './lib.mjs'

const SUPER = { username: 'admin', password: 'admin@520' }
const GRADES = ['一年级', '二年级', '三年级', '四年级', '五年级', '六年级']
const SUBJECTS = ['语文', '数学', '英语']
const SAD_PASSWORD = 'Sad12345'

const pool = new Pool(6)
const results = { schools: 0, classes: 0, students: 0, teachers: 0, exams: 0, grades: 0, sampledClasses: 0 }
const issues = []

/** 前缀 T1..T9 / TA..TF → 校管编号 01..15（16 进制尾号即可映射） */
function prefixToNo(prefix) {
  return String(parseInt(prefix.replace('T', ''), 16)).padStart(2, '0')
}

/** 单校核验：班级数/年级齐全、抽 2 班学生/考试/成绩、语数英教师配备 */
async function verifySchool(superToken, school) {
  const prefix = String(school.code || '').slice(0, 2) // code 格式：2位前缀+5位随机+平台后缀
  const no = prefixToNo(prefix)
  const adminUser = `sad_test${no}`
  const lr = await req('POST', '/auth/unified-login', { body: { username: adminUser, password: SAD_PASSWORD } })
  if (!lr.data?.token) {
    issues.push(`${school.name}(${prefix}) 校管 ${adminUser} 登录失败`)
    return
  }
  const sad = lr.data.token

  // 班级：60 个、6 年级齐全
  const cr = await req('GET', '/school-admin/classes?take=500', { token: sad })
  const cl = cr.data?.items || []
  results.classes += cl.length
  const gs = new Set(cl.map((c) => c.grade))
  for (const g of GRADES) if (!gs.has(g)) issues.push(`${prefix} 缺少${g}`)
  if (cl.length !== 60) issues.push(`${prefix} 班级数 ${cl.length} ≠ 60`)

  // 教师：语数英配备（批量建师接口未持久化 grade，故按学校级科目覆盖 + 班级级绑定核验）
  const tr = await req('GET', '/school-admin/teachers?take=500', { token: sad })
  const teachers = tr.data?.items || []
  results.teachers += teachers.length
  const allSubs = new Set(teachers.map((t) => t.subject))
  for (const s of SUBJECTS) if (!allSubs.has(s)) issues.push(`${prefix} 全校缺${s}科任教师`)

  // 抽查 2 个班（一年级1班 + 四年级6班），逐项核对 45 生 / 30 考 / 90 成绩 / 语数英科任绑定
  const picks = [cl.find((c) => c.grade === '一年级' && c.classNo === '1'), cl.find((c) => c.grade === '四年级' && c.classNo === '6')].filter(Boolean)
  for (const c of picks) {
    results.sampledClasses++
    const sr = await req('GET', `/school-admin/students?classId=${c.id}&take=500`, { token: sad })
    const stus = sr.data?.items || []
    results.students += stus.length
    if (stus.length !== 45) issues.push(`${prefix} ${c.name}(${c.id}) 学生 ${stus.length} ≠ 45`)

    const er = await req('GET', `/school-admin/academic/exams?classId=${c.id}`, { token: sad })
    const exams = er.data?.items || []
    results.exams += exams.length
    if (exams.length !== 30) issues.push(`${prefix} ${c.name} 考试 ${exams.length} ≠ 30`)

    const gr = await req('GET', `/school-admin/academic/grades?classId=${c.id}`, { token: sad })
    const grades = gr.data?.items || []
    results.grades += grades.length
    if (grades.length !== 90) issues.push(`${prefix} ${c.name} 成绩 ${grades.length} ≠ 90`)

    const cr = await req('GET', `/school-admin/classes/${c.id}`, { token: sad })
    const clsSubjects = new Set((cr.data?.subjectTeachers || []).flatMap((m) => m.subjects || []))
    for (const s of SUBJECTS) if (!clsSubjects.has(s)) issues.push(`${prefix} ${c.name} 班级缺${s}科任绑定`)
    log(`  ${prefix} ${c.grade}${c.name}: 学生=${stus.length} 考试=${exams.length} 成绩=${grades.length} 科任=[${[...clsSubjects].join(',')}]`)
  }
}

async function main() {
  const t0 = Date.now()
  log('=== 云端全量数据核验 ===')
  let r = await req('POST', '/auth/unified-login', { body: SUPER })
  const superToken = r.data?.token
  if (!superToken) throw new Error('超管登录失败')

  r = await req('GET', '/admin/schools?take=100', { token: superToken })
  const schools = (r.data?.items || []).filter((s) => /^T[0-9A-F]/.test(String(s.code || '')))
  results.schools = schools.length
  log(`测试学校: ${schools.length}`)
  if (schools.length !== 15) issues.push(`测试学校数 ${schools.length} ≠ 15`)

  await Promise.all(schools.map((s) => pool.add(() => verifySchool(superToken, s))))

  const el = (Date.now() - t0) / 1000
  log(`\n=== 核验汇总（耗时 ${el.toFixed(0)}s）===`)
  log(`学校: ${results.schools}`)
  log(`班级(全校): ${results.classes}`)
  log(`教师(全校): ${results.teachers}`)
  log(`抽查班级: ${results.sampledClasses} 个`)
  log(`抽查学生合计: ${results.students}（期望 45×${results.sampledClasses}=${45 * results.sampledClasses}）`)
  log(`抽查考试合计: ${results.exams}（期望 30×${results.sampledClasses}=${30 * results.sampledClasses}）`)
  log(`抽查成绩合计: ${results.grades}（期望 90×${results.sampledClasses}=${90 * results.sampledClasses}）`)
  if (issues.length) {
    log(`\n⚠️ 发现 ${issues.length} 个问题:`)
    issues.forEach((i) => log('  - ' + i))
    process.exit(1)
  }
  log('\n✅ 抽样核验全部通过')
}

main().catch((e) => { console.error('核验失败:', e); process.exit(1) })
