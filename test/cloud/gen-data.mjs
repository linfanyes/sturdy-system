/**
 * 云端全量数据生成脚本（真实环境直连微信云托管）。
 *
 * 规模：15 校 × 6 年级 × 10 班 = 900 班；
 *       每班 45 生 = 40,500 生；每班 4 教师（班主任+语/数/英）= 1,170 教师；
 *       每班 2 学期 × 15 考试 = 30 考试（27,000 考试）；
 *       每次考试 3 科成绩（81,000 成绩记录，每条含 45 人分数）。
 *
 * 幂等/断点续跑：
 *   - 结构阶段以「学校」为单位记状态；学术阶段以「班级」为单位记状态。
 *   - 已存在的学校/教师/班级/学生/考试/成绩均先查询复用，不重复创建。
 *   - 状态落盘 test/cloud/.gen-state.json。
 *
 * 用法：node test/cloud/gen-data.mjs [并发]
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { req, log, Pool, stats, dumpStats } from './lib.mjs'

const __dirname = dirname(fileURLToPath(import.meta.url))
const STATE_FILE = join(__dirname, '.gen-state.json')

// ============ 规模配置 ============
const SCHOOLS = 5
const GRADES = ['一年级', '二年级', '三年级', '四年级', '五年级', '六年级']
const CLASSES_PER_GRADE = 3
const STUDENTS_PER_CLASS = 30
const SEMESTERS = [
  { term: '2026春', name: '2026年春季学期', start: '2026-02-16', end: '2026-07-03' },
]
const EXAMS_PER_SEMESTER = 10
const SUBJECTS = ['语文', '数学', '英语']
const FULL = 100
const PASSWORD = 'Teacher123'
const SAD_PASSWORD = 'Sad12345'
// 每个班级开通家长登录的学生数（0=不开通，30=全部）
const PARENT_ENABLE = Number(process.env.PARENT_ENABLE || 30)
// 并发：外=同时处理的学校/班级数，内=班级内成绩提交并发
const CONC = Number(process.argv[2] || 10)
const OUTER = Math.max(1, Math.floor(CONC))
const INNER = Math.max(1, Math.min(6, Math.floor(CONC / 2) || 2))

const gradeNo = (g) => String(GRADES.indexOf(g) + 1).padStart(2, '0')

function loadState() {
  try { return JSON.parse(readFileSync(STATE_FILE, 'utf8')) } catch { return { schools: {}, academic: {} } }
}
let state = loadState()
const saveState = () => writeFileSync(STATE_FILE, JSON.stringify(state, null, 2))

// 确定性伪随机分数：语文略低、数学居中、英语略高，随时间缓慢进步
function genScore(i, subIdx, examIdx) {
  const seed = i * 1000 + subIdx * 37 + examIdx * 7 + 11
  const r = ((seed * 2654435761) >>> 0) % 1000 / 1000
  const base = 60 + subIdx * 2
  const improve = Math.min(12, Math.floor(examIdx / 3))
  return Math.min(FULL, Math.max(40, base + improve + Math.floor(r * 20)))
}

// ============ 计划生成 ============
const prefixes = Array.from({ length: SCHOOLS }, (_, i) => {
  const n = i + 1
  return n <= 9 ? `T${n}` : `T${String.fromCharCode(65 + n - 10)}` // T1..T9, TA..TF
})

function buildPlan() {
  const plan = []
  for (let s = 0; s < SCHOOLS; s++) {
    const prefix = prefixes[s]
    const schoolNo = String(s + 1).padStart(2, '0')
    const school = {
      prefix,
      name: `云端测试小学${schoolNo}`,
      address: `测试市云端区${schoolNo}号路1号`,
      adminUsername: `sad_test${schoolNo}`,
      adminName: `测试校管${schoolNo}`,
    }
    const teachers = []
    const headByClass = {}
    const subjectTeacherByGrade = {}
    for (const g of GRADES) {
      const gn = gradeNo(g)
      const subTeachers = {}
      SUBJECTS.forEach((sub, si) => {
        const t = { name: `${g}${sub}老师`, username: `st_${prefix}_${gn}_${si}`, password: PASSWORD, subject: sub, grade: g }
        teachers.push(t)
        subTeachers[sub] = t
      })
      subjectTeacherByGrade[g] = subTeachers
      for (let c = 1; c <= CLASSES_PER_GRADE; c++) {
        const cn = String(c).padStart(2, '0')
        const headName = `${g}${c}班班主任`
        const ht = { name: headName, username: `ht_${prefix}_${gn}_${cn}`, password: PASSWORD, subject: '语文', grade: g }
        teachers.push(ht)
        headByClass[`${g}${c}班`] = ht
      }
    }
    school.teachers = teachers
    school.headByClass = headByClass
    school.subjectTeacherByGrade = subjectTeacherByGrade
    const classes = []
    for (const g of GRADES) {
      for (let c = 1; c <= CLASSES_PER_GRADE; c++) {
        classes.push({ name: `${g}${c}班`, grade: g, classNo: String(c), term: '2026春', headTeacher: headByClass[`${g}${c}班`].name })
      }
    }
    school.classes = classes
    school.studentNoFor = (g, c, i) => `${prefix}${gradeNo(g)}${String(c).padStart(2, '0')}${String(i + 1).padStart(2, '0')}`
    school.parentPhoneFor = (g, c, i) => {
      const gi = GRADES.indexOf(g)
      const idx = s * (GRADES.length * CLASSES_PER_GRADE * STUDENTS_PER_CLASS) + gi * CLASSES_PER_GRADE * STUDENTS_PER_CLASS + (c - 1) * STUDENTS_PER_CLASS + i
      return `139${String(idx).padStart(8, '0')}`
    }
    plan.push(school)
  }
  return plan
}

// ============ 结构阶段（每校） ============
async function ensureSchool(superToken, ps) {
  const { prefix } = ps
  // 1. 学校
  let r = await req('GET', `/admin/schools?take=500`, { token: superToken })
  let school = (r.data?.items || []).find((x) => (x.code || '').startsWith(prefix))
  if (!school) {
    r = await req('POST', '/admin/schools', { token: superToken, body: { name: ps.name, prefix, platform: 'web', address: ps.address, status: 'active' } })
    if (r.status >= 400) throw new Error(`建校失败 ${prefix}: ${JSON.stringify(r.data).slice(0, 160)}`)
    school = r.data
  }
  const schoolId = school.id

  // 2. 校管
  r = await req('GET', `/admin/school-admins?take=500`, { token: superToken })
  let admin = (r.data?.items || []).find((a) => a.username === ps.adminUsername)
  if (!admin) {
    r = await req('POST', '/admin/school-admins', { token: superToken, body: { username: ps.adminUsername, password: SAD_PASSWORD, name: ps.adminName, schoolId, enabled: true } })
    if (r.status >= 400) throw new Error(`建校管失败: ${JSON.stringify(r.data).slice(0, 160)}`)
    admin = r.data
  }

  // 3. 校管登录
  r = await req('POST', '/auth/unified-login', { body: { username: ps.adminUsername, password: SAD_PASSWORD } })
  if (r.status >= 400 || !r.data?.token) throw new Error(`校管登录失败: ${JSON.stringify(r.data).slice(0, 160)}`)
  const sadToken = r.data.token

  // 4. 教师
  r = await req('GET', `/school-admin/teachers?take=500`, { token: sadToken })
  const byUsername = new Map((r.data?.items || []).map((t) => [t.username, t]))
  const toCreate = ps.teachers.filter((t) => !byUsername.has(t.username))
  if (toCreate.length) {
    r = await req('POST', '/school-admin/teachers/batch', { token: sadToken, body: { teachers: toCreate } })
    if (r.status >= 400) throw new Error(`批量建教师失败: ${JSON.stringify(r.data).slice(0, 200)}`)
  }
  r = await req('GET', `/school-admin/teachers?take=500`, { token: sadToken })
  const allTeachers = r.data?.items || []
  const teacherByName = new Map(allTeachers.map((t) => [t.name, t]))
  const missingTeachers = ps.teachers.filter((t) => !teacherByName.has(t.name))
  if (missingTeachers.length) throw new Error(`教师创建缺失 ${missingTeachers.length} 人: ${missingTeachers[0].name}`)

  // 5. 班级
  r = await req('GET', `/school-admin/classes?take=500`, { token: sadToken })
  const classByName = new Map((r.data?.items || []).map((c) => [c.name, c]))
  const toCreateClasses = ps.classes.filter((c) => !classByName.has(c.name))
  if (toCreateClasses.length) {
    r = await req('POST', '/school-admin/classes/batch', { token: sadToken, body: { classes: toCreateClasses } })
    if (r.status >= 400) throw new Error(`批量建班级失败: ${JSON.stringify(r.data).slice(0, 200)}`)
  }
  r = await req('GET', `/school-admin/classes?take=500`, { token: sadToken })
  const classByName2 = new Map((r.data?.items || []).map((c) => [c.name, c]))
  const classList = ps.classes.map((c) => ({ ...c, id: classByName2.get(c.name)?.id }))
  const missingClass = classList.filter((c) => !c.id)
  if (missingClass.length) throw new Error(`班级创建缺失: ${missingClass[0].name}`)

  // 6. 补科任老师到班级
  const p6 = []
  const patchPool = new Pool(6)
  for (const cls of classList) {
    const sts = SUBJECTS.map((sub) => ({ teacherId: teacherByName.get(ps.subjectTeacherByGrade[cls.grade][sub].name).id, subjects: [sub] }))
    p6.push(patchPool.add(async () => {
      const rr = await req('PATCH', `/school-admin/classes/${cls.id}`, { token: sadToken, body: { subjectTeachers: sts } })
      if (rr.status >= 400) throw new Error(`补科任失败 ${cls.name}: ${JSON.stringify(rr.data).slice(0, 160)}`)
      return true
    }))
  }
  await Promise.all(p6)

  // 7. 学生（每班 45）
  const classStudents = []
  const p7 = []
  const stuPool = new Pool(6)
  for (const cls of classList) {
    p7.push(stuPool.add(async () => {
      const cn = Number(cls.classNo)
      const q = await req('GET', `/school-admin/students?classId=${cls.id}&take=500`, { token: sadToken })
      const existing = q.data?.items || []
      const haveNos = new Set(existing.map((s) => s.studentNo))
      const missing = []
      for (let i = 0; i < STUDENTS_PER_CLASS; i++) {
        const no = ps.studentNoFor(cls.grade, cn, i)
        if (haveNos.has(no)) continue
        missing.push({
          name: `${cls.grade}${cn}班${String(i + 1).padStart(2, '0')}号学生`,
          gender: i % 2 === 0 ? '男' : '女',
          studentNo: no,
          classId: cls.id,
          parentName: `${cls.grade}${cn}班${String(i + 1).padStart(2, '0')}号家长`,
          parentPhone: ps.parentPhoneFor(cls.grade, cn, i),
        })
      }
      if (missing.length) {
        const rr = await req('POST', '/school-admin/students/batch', { token: sadToken, body: { students: missing } })
        if (rr.status >= 400) throw new Error(`建生失败 ${cls.name}: ${JSON.stringify(rr.data).slice(0, 160)}`)
      }
      const q2 = await req('GET', `/school-admin/students?classId=${cls.id}&take=500`, { token: sadToken })
      classStudents.push({ cls, stus: q2.data?.items || [] })
      return true
    }))
  }
  await Promise.all(p7)

  // 8. 开通家长登录
  if (PARENT_ENABLE > 0) {
    const p8 = []
    const parPool = new Pool(6)
    for (const { stus } of classStudents) {
      for (const stu of stus.slice(0, PARENT_ENABLE)) {
        if (stu.parentLoginEnabled) continue
        p8.push(parPool.add(async () => {
          const rr = await req('POST', `/students/${stu.id}/toggle-parent-login`, { token: sadToken })
          if (rr.status >= 400) throw new Error(`开通家长登录失败 ${stu.studentNo}: ${JSON.stringify(rr.data).slice(0, 120)}`)
          return true
        }))
      }
    }
    await Promise.all(p8)
  }

  return { schoolId, classList, classStudents }
}

// ============ 学术阶段（每班） ============
const tokenCache = new Map()

async function runAcademicClass(job) {
  const { classId, teacherId, teacherUsername, stus } = job
  if (!tokenCache.has(teacherId)) {
    const r = await req('POST', '/auth/unified-login', { body: { username: teacherUsername, password: PASSWORD } })
    if (r.status >= 400 || !r.data?.token) throw new Error(`班主任登录失败 ${teacherUsername}: ${JSON.stringify(r.data).slice(0, 120)}`)
    tokenCache.set(teacherId, r.data.token)
  }
  const token = tokenCache.get(teacherId)

  // 1. 学期
  const semR = await req('GET', '/semesters?take=500', { token })
  const haveSem = new Set((semR.data?.items || []).map((s) => s.name))
  for (const sem of SEMESTERS) {
    if (!haveSem.has(sem.name)) {
      const rr = await req('POST', '/semesters', { token, body: { name: sem.name, startDate: sem.start, endDate: sem.end, current: sem.term === '2026春' } })
      if (rr.status >= 400) throw new Error(`建学期失败 ${sem.name}: ${JSON.stringify(rr.data).slice(0, 120)}`)
    }
  }

  // 2. 考试（先查已有，补建）
  const examR = await req('GET', `/exams?classId=${classId}&take=500`, { token })
  const examByName = new Map((examR.data?.items || []).map((e) => [e.name, e]))
  const examJobs = []
  for (const sem of SEMESTERS) {
    for (let n = 1; n <= EXAMS_PER_SEMESTER; n++) {
      const ename = `${sem.term}第${n}次考试`
      const date = sem.term === '2026春'
        ? `2026-03-${String(1 + (n % 28)).padStart(2, '0')}`
        : `2026-10-${String(1 + (n % 28)).padStart(2, '0')}`
      let exam = examByName.get(ename)
      if (!exam) {
        const rr = await req('POST', '/exams', { token, body: { name: ename, term: sem.term, classId, subjects: SUBJECTS, subjectFullScores: { 语文: FULL, 数学: FULL, 英语: FULL }, date } })
        if (rr.status >= 400) {
          const again = await req('GET', `/exams?classId=${classId}&take=500`, { token })
          const hit = (again.data?.items || []).find((e) => e.name === ename)
          if (!hit) throw new Error(`建考试失败 ${ename}: ${JSON.stringify(rr.data).slice(0, 120)}`)
          exam = hit
        } else {
          exam = rr.data
        }
      }
      examJobs.push({ examId: exam.id, examName: ename, term: sem.term, date, examIdx: examJobs.length })
    }
  }

  // 3. 成绩提交（每考试 × 3 科，每科 45 行）
  const gp = new Pool(INNER)
  const tasks = []
  for (const job2 of examJobs) {
    SUBJECTS.forEach((sub, si) => {
      const rows = stus.map((stu, i) => ({ studentId: stu.id, score: genScore(i, si, job2.examIdx), valid: true }))
      tasks.push(gp.add(async () => {
        await submitGrades(token, {
          classId, examId: job2.examId, examName: job2.examName, subject: sub, date: job2.date, rows,
        })
        return true
      }))
    })
  }
  await Promise.all(tasks)
  return { classId, exams: examJobs.length }
}

/**
 * 提交成绩（带 5xx/504 长退避重试）。
 * lib.req 内部对 5xx 只退避 500ms，云网关过载时易持续 504；
 * 这里外层再重试多次并递增退避，扛过瞬时过载。
 */
async function submitGrades(token, body) {
  let last
  for (let attempt = 1; attempt <= 8; attempt++) {
    last = await req('POST', '/grades/import-commit', { token, body, retries: 2 })
    if (last.status < 500) return last
    const wa = 1500 * attempt + Math.floor(Math.random() * 500)
    log(`  ⚠️ 成绩提交 ${body.examName}/${body.subject} 收到 ${last.status}，${wa}ms 后重试 (${attempt}/8)`)
    await sleep(wa)
  }
  return last
}

// ============ 主流程 ============
async function main() {
  const t0 = Date.now()
  log('=== 云端全量数据生成 ===')
  log(`目标: ${SCHOOLS}校 × ${GRADES.length}年级 × ${CLASSES_PER_GRADE}班 × ${STUDENTS_PER_CLASS}生; 每班 ${SEMESTERS.length}学期 × ${EXAMS_PER_SEMESTER}考 × ${SUBJECTS.length}科`)
  log(`并发: 外=${OUTER} 内=${INNER} 家长开通=${PARENT_ENABLE}/班`)

  let r = await req('POST', '/auth/unified-login', { body: { username: 'admin', password: 'admin@520' } })
  if (r.status >= 400 || !r.data?.token) throw new Error('超管登录失败: ' + JSON.stringify(r.data))
  const superToken = r.data.token
  log('超管登录成功')

  const plan = buildPlan()

  // ---- 结构阶段 ----
  const schoolPool = new Pool(Math.max(2, Math.min(4, OUTER)))
  const schoolTasks = []
  let schoolDone = 0
  for (const ps of plan) {
    schoolTasks.push(schoolPool.add(async () => {
      if (state.schools[ps.prefix]?.done) { schoolDone++; return }
      log(`[结构] ${ps.name} (${ps.prefix}) 开始`)
      const res = await ensureSchool(superToken, ps)
      state.schools[ps.prefix] = { done: true, schoolId: res.schoolId }
      saveState()
      schoolDone++
      log(`[结构] ${ps.name} 完成 (${schoolDone}/${SCHOOLS})`)
    }))
  }
  await Promise.all(schoolTasks)

  // ---- 学术阶段 ----
  const classJobs = []
  for (const ps of plan) {
    if (!state.schools[ps.prefix]?.done) continue
    const st = state.schools[ps.prefix]
    // 收集阶段一次性请求量大，易触发限流导致班级列表返回空；
    // 少于预期班级数时重试查询（配合退避）。
    let clist = []
    for (let r = 0; r < 6 && clist.length < CLASSES_PER_GRADE * GRADES.length; r++) {
      const cr = await req('GET', `/admin/classes?schoolId=${st.schoolId}&take=1000`, { token: superToken })
      clist = cr.data?.items || []
      if (clist.length < CLASSES_PER_GRADE * GRADES.length && r < 5) {
        log(`  ⚠️ ${ps.prefix} 班级列表不足(${clist.length})，${2000 * (r + 1)}ms 后重试`)
        await sleep(2000 * (r + 1))
      }
    }
    for (const c of clist) {
      if (!c.name || !c.grade) continue
      const headUser = ps.headByClass[c.name]
      let stus = []
      for (let r = 0; r < 6 && stus.length < STUDENTS_PER_CLASS; r++) {
        const sr = await req('GET', `/admin/students?classId=${c.id}&take=1000`, { token: superToken })
        stus = sr.data?.items || []
        if (stus.length < STUDENTS_PER_CLASS && r < 5) await sleep(1500 * (r + 1))
      }
      if (stus.length < STUDENTS_PER_CLASS) log(`  ⚠️ ${c.name} 学生不足: ${stus.length}/${STUDENTS_PER_CLASS}`)
      classJobs.push({
        classId: c.id, className: c.name, grade: c.grade,
        teacherId: c.teacherId,
        teacherUsername: headUser ? headUser.username : `ht_${ps.prefix}_unknown`,
        stus: stus.slice(0, STUDENTS_PER_CLASS),
      })
    }
  }
  log(`学术阶段待处理班级: ${classJobs.length}`)

  // 多轮执行：单班失败不中断整体，失败的班在下一轮重试（最多 3 轮），
  // 已完成班级写入 state.academic，重启/中断后可续跑。
  const acadPool = new Pool(OUTER)
  let pending = classJobs
  const tAcad = Date.now()
  for (let pass = 1; pass <= 3 && pending.length; pass++) {
    if (pass > 1) { log(`[学术] 第 ${pass} 轮重试 ${pending.length} 个失败班级...`); await sleep(5000) }
    const results = await Promise.all(pending.map(job => acadPool.add(async () => {
      if (state.academic[job.classId]) return 'ok'
      try {
        await runAcademicClass(job)
        state.academic[job.classId] = true
        return 'ok'
      } catch (e) {
        log(`[学术] ❌ ${job.className}: ${String(e.message).slice(0, 140)}`)
        return 'fail'
      }
    })))
    const failed = pending.filter((_, i) => results[i] === 'fail')
    const doneThisPass = pending.length - failed.length
    saveState()
    const el = (Date.now() - tAcad) / 1000
    const rate = (classJobs.length - pending.length + doneThisPass) / Math.max(1, el)
    log(`[学术] 第 ${pass} 轮结束: 成功 ${doneThisPass}，失败 ${failed.length}，累计 ${(classJobs.length - failed.length)}/${classJobs.length}，速率≈${rate.toFixed(2)}班/s，剩余≈${(failed.length / Math.max(rate, 0.01) / 60).toFixed(1)}min`)
    pending = failed
  }
  if (pending.length) log(`[学术] ⚠️ 仍有 ${pending.length} 班未完成，将留待下次运行重试`)

  saveState()
  const totalMs = (Date.now() - t0) / 1000
  const doneCount = classJobs.filter((j) => state.academic[j.classId]).length
  log(`\n=== 数据生成结束: 结构学校 ${schoolDone} 学术班级 ${doneCount}/${classJobs.length}，总耗时 ${(totalMs / 60).toFixed(1)}min ===`)
  dumpStats('数据生成')
  process.exit(doneCount === classJobs.length ? 0 : 1)
}

main().catch((e) => { console.error('生成失败:', e); saveState(); process.exit(1) })
