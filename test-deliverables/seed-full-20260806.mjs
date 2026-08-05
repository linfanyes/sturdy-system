#!/usr/bin/env node
/**
 * 全量大数据造数脚本（2026-08-06 版）— 直连云托管
 *
 * 目标数据规模：
 *  - 10 所学校（每校 1 名校管）
 *  - 每校 6 个班级（不同年级：一~六年级），每班 50 名学生 → 全平台 3000 学生
 *  - 每班各科老师：班主任 + 语文/数学/英语科任（多职位覆盖：班主任/教研组长/年级组长等）
 *  - 两学期（2025 秋 / 2026 春）每学期 10 次考试 → 每班 20 次考试，每次全科成绩（语数英）
 *  - 每校：学校公告、教师公告、资源库初始化（古诗词/公式/单词）、教材初始化（32 本）
 *  - 每班开通 2 名家长登录（默认口令 123456）
 *
 * 幂等：可重复执行，已存在（按 name/prefix/username 判定）跳过。
 * 数据清单输出：test-deliverables/Test-Data-Fixtures/fixture-2026-08-06.json（保留供查看）
 */
import { writeFileSync, mkdirSync, existsSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const BASE = (process.env.SEED_API_BASE || 'https://tec-work-283329-8-1440166408.sh.run.tcloudbase.com/api').replace(/\/$/, '')
const SUPER_USER = process.env.SEED_SUPER_USER || 'admin'
const SUPER_PASS = process.env.SEED_SUPER_PASS || 'admin'
const TEACHER_PASS = 'Qa@2026'
const SA_PASS = 'Qa@2026'
const PARENT_PASS = '123456'

const OUT = path.join(__dirname, 'Test-Data-Fixtures', 'fixture-2026-08-06.json')
const OUT_DIR = path.dirname(OUT)

const GRADES = ['一年级', '二年级', '三年级', '四年级', '五年级', '六年级']
const SUBJECTS = ['语文', '数学', '英语']
const TERMS = ['2025 秋', '2026 春']

let CONC = Number(process.env.SEED_CONC || 2)

const delay = (ms) => new Promise((r) => setTimeout(r, ms))

/** 带 429 退避的请求：限速时指数退避重试（云托管全局 60/min/IP，多实例倍增） */
async function callApi(method, p, { body, token, maxRetry = 8 } = {}) {
  for (let attempt = 0; ; attempt++) {
    const res = await fetch(`${BASE}${p}`, {
      method,
      headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: body ? JSON.stringify(body) : undefined,
    })
    if (res.status === 429 && attempt < maxRetry) {
      const wait = 1500 * Math.pow(2, attempt)
      log(`  ⏳ 429 限速，退避 ${wait}ms（${p.slice(0, 50)}）`)
      await delay(wait)
      continue
    }
    const text = await res.text()
    let data = null
    try { data = text ? JSON.parse(text) : null } catch { data = text }
    if (!res.ok) {
      const err = new Error(`${method} ${p} -> HTTP ${res.status}: ${data?.message || text.slice(0, 200)}`)
      err.status = res.status
      err.data = data
      throw err
    }
    return data
  }
}

async function login(uname, pass) {
  // 超管用 /admin/login，其余用 unified-login
  let r
  if (uname === SUPER_USER && pass === SUPER_PASS) {
    r = await callApi('POST', '/admin/login', { body: { username: uname, password: pass } })
  } else {
    r = await callApi('POST', '/auth/unified-login', { body: { username: uname, password: pass } })
  }
  if (!r?.token) throw new Error(`登录失败 ${uname}: ${JSON.stringify(r).slice(0, 200)}`)
  return r.token
}

/** 登录节流器：unified-login 限速 10/min/IP（云托管出口共享），全局排队保证 ≤8/min */
let lastLoginAt = 0
async function throttledLogin(uname, pass, { superLogin = false } = {}) {
  if (!superLogin) {
    const gap = 7500 // 8/min ≈ 7.5s/次
    const wait = Math.max(0, lastLoginAt + gap - Date.now())
    if (wait > 0) await delay(wait)
    lastLoginAt = Date.now()
  }
  return login(uname, pass)
}

/** 并发池执行 */
async function pool(items, fn, concurrency = CONC) {
  const results = []
  let i = 0
  async function worker() {
    while (i < items.length) {
      const idx = i++
      try { results.push({ idx, ok: true, data: await fn(items[idx], idx) }) }
      catch (e) { results.push({ idx, ok: false, error: e.message }) }
    }
  }
  const workers = Array.from({ length: Math.min(concurrency, items.length || 1) }, worker)
  await Promise.all(workers)
  return results.sort((a, b) => a.idx - b.idx)
}

const log = (m) => console.log(`[seed ${new Date().toISOString().slice(11, 19)}] ${m}`)
const fixture = { generatedAt: new Date().toISOString(), base: BASE, schools: [], accounts: {} }

async function main() {
  log('=== 大数据造数开始（10 学校 × 6 班 × 50 学生）===')

  // 0) 超管登录
  const superToken = await throttledLogin(SUPER_USER, SUPER_PASS, { superLogin: true })
  log('超管登录 OK')

  // 1) 创建 10 所学校（幂等：按 prefix 跳过已存在）
  const existingSchools = await callApi('GET', '/admin/schools?skip=0&take=100', { token: superToken })
  const schoolList = Array.isArray(existingSchools) ? existingSchools : existingSchools?.items || []
  const existPrefix = new Set(schoolList.map((s) => s.prefix).filter(Boolean))

  const schoolDefs = [
    { prefix: 'QA', name: '测试阳光小学', address: '云城阳光路1号' },
    { prefix: 'QB', name: '测试育才小学', address: '云城育才路2号' },
    { prefix: 'QC', name: '测试实验小学', address: '云城实验路3号' },
    { prefix: 'QD', name: '测试第一小学', address: '云城一环路4号' },
    { prefix: 'QE', name: '测试新世纪小学', address: '云城二环路5号' },
    { prefix: 'QF', name: '测试红领巾小学', address: '云城三环路6号' },
    { prefix: 'QG', name: '测试晨曦小学', address: '云城四环路7号' },
    { prefix: 'QH', name: '测试星火小学', address: '云城五环路8号' },
    { prefix: 'QI', name: '测试博雅小学', address: '云城六环路9号' },
    { prefix: 'QJ', name: '测试梧桐小学', address: '云城七环路10号' },
  ]

  for (const sd of schoolDefs) {
    if (existPrefix.has(sd.prefix)) {
      const existing = schoolList.find((s) => s.prefix === sd.prefix)
      fixture.schools.push({ ...sd, id: existing.id, reused: true })
      log(`学校 ${sd.name} 已存在，复用 id=${existing.id}`)
      continue
    }
    const created = await callApi('POST', '/admin/schools', {
      body: { ...sd, platform: 'web', status: 'active' },
      token: superToken,
    })
    fixture.schools.push({ ...sd, id: created.id, reused: false })
    log(`创建学校 ${sd.name} id=${created.id}`)
    await delay(80)
  }
  log(`学校就绪：${fixture.schools.length} 所`)

  // 2) 每校创建校管 + 校管登录
  for (let i = 0; i < fixture.schools.length; i++) {
    const sch = fixture.schools[i]
    const saUser = `qa_sa_${sch.prefix.toLowerCase()}`
    const admins = await callApi('GET', `/admin/school-admins?skip=0&take=100`, { token: superToken })
    const adminList = Array.isArray(admins) ? admins : admins?.items || []
    let saId = adminList.find((a) => a.username === saUser)?.id
    if (!saId) {
      const created = await callApi('POST', '/admin/school-admins', {
        body: { username: saUser, password: SA_PASS, name: `${sch.name}校管`, schoolId: sch.id, enabled: true },
        token: superToken,
      })
      saId = created.id
    }
    sch.saUser = saUser
    sch.saPass = SA_PASS
    sch.saId = saId
    try {
      sch.saToken = await throttledLogin(saUser, SA_PASS)
    } catch (e) {
      log(`校管 ${saUser} 登录失败（可能在新建后延迟），等待 3s 重试...`)
      await delay(3000)
      sch.saToken = await throttledLogin(saUser, SA_PASS)
    }
    log(`校管 ${saUser} 就绪 id=${saId}`)
  }

  // 3) 每校：创建教师（6 班 × (班主任+语数英科任)）+ 班级 + 50 学生/班
  for (let si = 0; si < fixture.schools.length; si++) {
    const sch = fixture.schools[si]
    const token = sch.saToken

    // 3.1 幂等：已有班级数
    const existingClasses = await callApi('GET', '/school-admin/classes', { token })
    const clsList = Array.isArray(existingClasses) ? existingClasses : existingClasses?.items || []
    const existClsNames = new Set(clsList.map((c) => c.name))

    // 3.2 教师列表（幂等判断）
    const teachersResp = await callApi('GET', '/school-admin/teachers?skip=0&take=500', { token })
    const teacherList = Array.isArray(teachersResp) ? teachersResp : teachersResp?.items || []

    const needTeachers = []
    for (let gi = 0; gi < 6; gi++) {
      const grade = GRADES[gi]
      needTeachers.push(
        { name: `${grade}班班主任`, subject: '', position: '班主任', username: `qa_${sch.prefix.toLowerCase()}_ht_${gi + 1}` },
        { name: `${grade}语文老师`, subject: '语文', position: '学科组长', username: `qa_${sch.prefix.toLowerCase()}_cn_${gi + 1}` },
        { name: `${grade}数学老师`, subject: '数学', position: '教研组长', username: `qa_${sch.prefix.toLowerCase()}_math_${gi + 1}` },
        { name: `${grade}英语老师`, subject: '英语', position: '年级组长', username: `qa_${sch.prefix.toLowerCase()}_en_${gi + 1}` },
      )
    }
    const existUsernames = new Set(teacherList.map((t) => t.username).filter(Boolean))
    const toCreate = needTeachers.filter((t) => !existUsernames.has(t.username))
    if (toCreate.length) {
      const batch = await callApi('POST', '/school-admin/teachers/batch', {
        body: { teachers: toCreate.map((t) => ({ ...t, password: TEACHER_PASS, gender: '男', grade: t.name.slice(0, 3) })) },
        token,
      })
      log(`校${si + 1} 创建教师 ${batch?.success || toCreate.length} 名`)
      await delay(200)
    }

    // 重新拉教师列表拿到 id 映射
    const teachers2 = await callApi('GET', '/school-admin/teachers?skip=0&take=500', { token })
    const tList = Array.isArray(teachers2) ? teachers2 : teachers2?.items || []
    const teacherByUser = new Map(tList.map((t) => [t.username, t]))

    // 3.3 班级（6 个年级班）
    // 拉取当前全部班级：幂等判断 + reused 时补 id（否则考试段拿不到 classId）
    const classesNow = await callApi('GET', '/school-admin/classes', { token })
    const clsNowList = Array.isArray(classesNow) ? classesNow : classesNow?.items || []
    const clsNowByName = new Map(clsNowList.map((c) => [c.name, c]))
    for (let gi = 0; gi < 6; gi++) {
      const grade = GRADES[gi]
      const clsName = `${grade}${gi + 1}班`
      const existingCls = clsNowByName.get(clsName)
      if (existingCls) {
        sch.classes ||= []
        sch.classes.push({ name: clsName, grade, id: existingCls.id, headTeacherId: existingCls.teacherId, reused: true })
        log(`校${si + 1} ${clsName} 已存在，复用 id=${existingCls.id}`)
        continue
      }
      const htUser = `qa_${sch.prefix.toLowerCase()}_ht_${gi + 1}`
      const ht = teacherByUser.get(htUser)
      if (!ht) { log(`⚠ 校${si + 1} 找不到班主任 ${htUser}`); continue }
      const subjectTeachers = ['cn', 'math', 'en'].map((sub, idx) => {
        const t = teacherByUser.get(`qa_${sch.prefix.toLowerCase()}_${sub}_${gi + 1}`)
        return t ? { teacherId: t.id, subjects: [SUBJECTS[idx]] } : null
      }).filter(Boolean)

      const created = await callApi('POST', '/school-admin/classes', {
        body: {
          name: clsName, grade, classNo: String(gi + 1),
          headTeacher: ht.name, headTeacherId: ht.id,
          term: TERMS[1],
          subjects: SUBJECTS,
          subjectTeachers,
        },
        token,
      })
      sch.classes ||= []
      sch.classes.push({ name: clsName, grade, id: created.id, headTeacherId: ht.id, teacherId: ht.id })
      log(`校${si + 1} 创建 ${clsName} id=${created.id}`)
      await delay(100)
    }

    // 3.4 每班 50 学生（幂等：按学号前缀跳过）
    const studentsResp = await callApi('GET', '/school-admin/students', { token })
    const studentList = Array.isArray(studentsResp) ? studentsResp : studentsResp?.items || []
    const existNos = new Set(studentList.map((s) => s.studentNo).filter(Boolean))

    for (let gi = 0; gi < 6; gi++) {
      const grade = GRADES[gi]
      const clsName = `${grade}${gi + 1}班`
      const cls = (sch.classes || []).find((c) => c.name === clsName)
      if (!cls?.id) { log(`⚠ 校${si + 1} ${clsName} 无班级 id，跳过学生造数`); continue }
      const prefix = `QA${String(si + 1).padStart(2, '0')}${gi + 1}`
      const batchStudents = []
      for (let s = 1; s <= 50; s++) {
        const no = `${prefix}${String(s).padStart(3, '0')}`
        if (existNos.has(no)) continue
        batchStudents.push({
          name: `${grade.slice(0, 3)}班${s}号同学`,
          gender: s % 2 ? '男' : '女',
          studentNo: no,
          parentName: `${grade.slice(0, 3)}班${s}号家长`,
          parentPhone: `13${String(800000000 + si * 100000 + gi * 1000 + s).slice(0, 9)}`,
          classId: cls.id,
        })
      }
      if (batchStudents.length) {
        const r = await callApi('POST', '/school-admin/students/batch', {
          body: { students: batchStudents },
          token,
        })
        log(`校${si + 1} ${clsName} 创建学生 ${r?.success || batchStudents.length} 名`)
      }
    }
    await delay(100)
  }
  log('教师/班级/学生造数完成')

  // 4) 考试 + 成绩（每班每学期 10 次考试，全科成绩）
  log('开始考试与成绩造数（量大，并发 ' + CONC + '）...')
  const examTasks = []
  for (const sch of fixture.schools) {
    for (const cls of sch.classes || []) {
      if (!cls.id) continue
      for (const term of TERMS) {
        for (let e = 1; e <= 10; e++) {
          const date = term.startsWith('2025')
            ? `2025-0${Math.ceil(e / 2)}-${String(10 + (e % 9)).padStart(2, '0')}`
            : `2026-0${Math.ceil(e / 2)}-${String(10 + (e % 9)).padStart(2, '0')}`
          examTasks.push({
            school: sch, cls,
            name: `${term}第${e}次月考`,
            term, date,
            subjects: SUBJECTS,
            subjectFullScores: { 语文: 100, 数学: 100, 英语: 100 },
          })
        }
      }
    }
  }
  log(`待创建考试：${examTasks.length} 场`)

  // 考试创建：用校管 token 不行（exams 是 teacher 角色），需用班主任 token
  // 由于班主任 username 已知，这里逐个登录班主任（限速注意：10/min，串行 + 延时）
  log('登录班主任账号（60 个，串行避免限速）...')
  const headTokens = {}
  for (const sch of fixture.schools) {
    for (let gi = 0; gi < 6; gi++) {
      const htUser = `qa_${sch.prefix.toLowerCase()}_ht_${gi + 1}`
      try {
        headTokens[htUser] = await throttledLogin(htUser, TEACHER_PASS)
        log(`班主任 ${htUser} 登录 OK`)
      } catch (e) {
        log(`⚠ 班主任 ${htUser} 登录失败: ${e.message}`)
      }
    }
  }

  // 创建考试 + 录成绩：并发 3（云托管多实例限速倍增），429 由 callApi 退避消化
  // 幂等：按班级已有考试名跳过（exams 无唯一约束，靠查重）
  // 预查每班已有考试名 + 每校学生缓存（学生列表每校只查一次）
  const existExamByClass = new Map()
  const studentsBySchool = new Map()
  for (const sch of fixture.schools) {
    const stu = await callApi('GET', `/school-admin/students`, { token: sch.saToken })
    const sList = Array.isArray(stu) ? stu : stu?.items || []
    studentsBySchool.set(sch.prefix, sList)
    for (const cls of sch.classes || []) {
      if (!cls.id) continue
      try {
        const r = await callApi('GET', `/exams?classId=${cls.id}&take=500`, { token: headTokens[`qa_${sch.prefix.toLowerCase()}_ht_${GRADES.indexOf(cls.grade) + 1}`] })
        const list = Array.isArray(r) ? r : r.items || []
        existExamByClass.set(cls.id, new Set(list.map((e) => e.name)))
      } catch (e) {
        log(`  ⚠ 预查考试 ${cls.name}: ${e.message}`)
      }
    }
  }
  // 每场考试：1 create + 3 merge，并发 3 个班同时推进
  let examDone = 0
  const examTotal = examTasks.length
  const examResults = await pool(examTasks, async (task) => {
    try {
      const existSet = existExamByClass.get(task.cls.id)
      if (existSet?.has(task.name)) return { ok: true, skipped: true }
      const gi = GRADES.indexOf(task.cls.grade)
      const user = `qa_${task.school.prefix.toLowerCase()}_ht_${gi + 1}`
      const token = headTokens[user]
      if (!token) throw new Error('班主任 token 缺失')
      const exam = await callApi('POST', '/exams', {
        body: {
          name: task.name, classId: task.cls.id, subjects: SUBJECTS,
          date: task.date, term: task.term, subjectFullScores: task.subjectFullScores,
        },
        token,
      })
      const clsStudents = (studentsBySchool.get(task.school.prefix) || []).filter((s) => s.classId === task.cls.id)
      await Promise.all(SUBJECTS.map(async (sub) => {
        const scores = clsStudents.map((st) => ({ studentId: st.id, score: 60 + Math.floor(Math.random() * 40) }))
        await callApi('POST', '/grades/merge', {
          body: { classId: task.cls.id, examName: task.name, subject: sub, scores, date: task.date, examId: exam.id },
          token,
        })
      }))
      examDone++
      if (examDone % 20 === 0) log(`考试+成绩进度：${examDone}/${examTotal}`)
      return { ok: true, examId: exam.id }
    } catch (e) {
      log(`  ❌ ${task.name}: ${e.message}`)
      return { ok: false, error: e.message }
    }
  }, 3)
  const createdExamsCount = examResults.filter((r) => r.ok).length
  log(`考试+成绩：成功 ${createdExamsCount} / 总 ${examTotal}`)

  // 5) 每校：公告 + 资源库初始化 + 教材初始化
  for (const sch of fixture.schools) {
    const token = sch.saToken
    // 学校公告（幂等）
    try {
      const notices = await callApi('GET', '/school-admin/notices', { token })
      const nList = Array.isArray(notices) ? notices : notices?.items || []
      if (!nList.some((n) => n.title === '新学期开学通知')) {
        await callApi('POST', '/school-admin/notices', { body: { title: '新学期开学通知', content: `${sch.name}全体师生：2026 春季学期即将开始，请做好开学准备。` }, token })
        await callApi('POST', '/school-admin/notices', { body: { title: '期末考务安排', content: '期末考试将于 2026 年 6 月底举行，请各班做好准备。', pinned: true }, token })
        log(`校 ${sch.name} 公告已创建`)
      }
    } catch (e) { log(`⚠ 校 ${sch.name} 公告: ${e.message}`) }
    // 资源库初始化
    try {
      await callApi('POST', '/school-admin/resource-library/seed-defaults', { body: {}, token })
      log(`校 ${sch.name} 资源库初始化 OK`)
    } catch (e) { log(`⚠ 校 ${sch.name} 资源库: ${e.message}`) }
    // 教材初始化（32 本）
    try {
      await callApi('POST', '/school-admin/textbooks/seed-defaults', { body: {}, token })
      log(`校 ${sch.name} 教材初始化 OK`)
    } catch (e) { log(`⚠ 校 ${sch.name} 教材: ${e.message}`) }
  }

  // 6) 每班开通 2 名家长登录（默认口令 123456）
  // 注意：toggle-parent-login 也在全局 60/min 限速下，串行 + 节流（每 6s 一个）
  let parentCount = 0
  for (const sch of fixture.schools) {
    const token = sch.saToken
    const studentsResp = await callApi('GET', '/school-admin/students', { token })
    const sList = Array.isArray(studentsResp) ? studentsResp : studentsResp?.items || []
    const candidates = sList.filter((s) => s.classId && ((s.studentNo || '').endsWith('001') || (s.studentNo || '').endsWith('002')))
    for (const st of candidates.slice(0, 12)) {
      try {
        await callApi('POST', `/students/${st.id}/toggle-parent-login`, { body: {}, token })
        parentCount++
        log(`  家长开通 ${st.studentNo}（${parentCount}）`)
      } catch (e) {
        log(`  ⚠ 家长 ${st.studentNo}: ${e.message}`)
      }
      await delay(6000) // 60/min 限速 → 6s/次
    }
  }
  log(`家长登录开通：${parentCount} 名（口令默认 ${PARENT_PASS}）`)

  // 7) 持久化数据清单
  mkdirSync(OUT_DIR, { recursive: true })
  writeFileSync(OUT, JSON.stringify(fixture, null, 2) + '\n')
  log(`数据清单已保存：${OUT}`)

  // 汇总
  const summary = {
    schools: fixture.schools.length,
    schoolAdmins: fixture.schools.filter((s) => s.saUser).length,
    classes: fixture.schools.reduce((a, s) => a + (s.classes || []).length, 0),
    examsCreated: createdExamsCount,
    parentsEnabled: parentCount,
    output: OUT,
  }
  console.log('\n=== 造数汇总 ===')
  console.log(JSON.stringify(summary, null, 2))
  console.log('=== 完成 ===')
}

main().catch((e) => { console.error('[seed] 失败:', e.message); process.exit(1) })
