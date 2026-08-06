#!/usr/bin/env node
/**
 * 补全考试与成绩数据（2026-08-06）— 限速友好 + 幂等
 * 目标：10 校 × 6 班 × 2 学期 × 10 次 = 1200 场考试 × 3 科成绩
 * 幂等：按班级已有考试名跳过；已存在的考试不重复创建
 */
const BASE = 'https://tec-work-283329-8-1440166408.sh.run.tcloudbase.com/api'
const delay = (ms) => new Promise((r) => setTimeout(r, ms))
const GRADES = ['一年级', '二年级', '三年级', '四年级', '五年级', '六年级']
const SUBJECTS = ['语文', '数学', '英语']
const TERMS = ['2025 秋', '2026 春']
const CONC = Number(process.env.SEED_CONC || 3)

async function call(m, p, { body, token } = {}) {
  for (let i = 0; ; i++) {
    const res = await fetch(BASE + p, {
      method: m,
      headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: 'Bearer ' + token } : {}) },
      body: body ? JSON.stringify(body) : undefined,
    })
    if (res.status === 429 && i < 10) { await delay(1500 * Math.pow(2, i)); continue }
    const t = await res.text()
    let d = null
    try { d = t ? JSON.parse(t) : null } catch { d = t }
    if (!res.ok) {
      const e = new Error(`${m} ${p} -> ${res.status}: ${d?.message || t.slice(0, 150)}`)
      e.status = res.status
      throw e
    }
    return d
  }
}

let lastLogin = 0
const tokenCache = {}
async function throttledLogin(u, p) {
  if (tokenCache[u]) return tokenCache[u]
  const wait = Math.max(0, lastLogin + 7500 - Date.now())
  if (wait > 0) await delay(wait)
  lastLogin = Date.now()
  const r = await call('POST', '/auth/unified-login', { body: { username: u, password: p } })
  tokenCache[u] = r.token
  return r.token
}
async function saLogin(u, p) {
  const r = await call('POST', '/school-admin/login', { body: { username: u, password: p } })
  return r.token
}

async function pool(items, fn, concurrency = CONC) {
  const results = []
  let i = 0
  async function worker() {
    while (i < items.length) {
      const idx = i++
      try { results.push({ idx, ok: true, data: await fn(items[idx]) }) }
      catch (e) { results.push({ idx, ok: false, error: e.message }) }
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, items.length || 1) }, worker))
  return results.sort((a, b) => a.idx - b.idx)
}

async function main() {
  console.log('=== 补全考试与成绩数据 ===')
  const prefixes = ['qa', 'qb', 'qc', 'qd', 'qe', 'qf', 'qg', 'qh', 'qi', 'qj']
  const schools = []
  for (const pre of prefixes) {
    const saToken = await saLogin(`qa_sa_${pre}`, 'Qa@2026')
    const cls = await call('GET', '/school-admin/classes', { token: saToken })
    const cList = Array.isArray(cls) ? cls : cls.items || []
    const stu = await call('GET', '/school-admin/students', { token: saToken })
    const sList = Array.isArray(stu) ? stu : stu.items || []
    schools.push({ pre, saToken, classes: cList, students: sList })
    console.log(`校${pre}: ${cList.length} 班 / ${sList.length} 学生`)
    await delay(800)
  }

  // 构建任务列表（每班 20 场考试）
  const tasks = []
  for (const sch of schools) {
    for (const cls of sch.classes) {
      for (const term of TERMS) {
        for (let e = 1; e <= 10; e++) {
          const date = term.startsWith('2025') ? `2025-0${Math.ceil(e / 2)}-${String(10 + (e % 9)).padStart(2, '0')}` : `2026-0${Math.ceil(e / 2)}-${String(10 + (e % 9)).padStart(2, '0')}`
          tasks.push({
            sch, cls,
            name: `${term}第${e}次月考`, term, date,
          })
        }
      }
    }
  }
  console.log(`待处理考试任务：${tasks.length} 场`)

  // 预查每班已有考试（班主任 token）
  const existByClass = new Map()
  for (const sch of schools) {
    for (const cls of sch.classes) {
      const gi = GRADES.indexOf(cls.grade)
      const htUser = `qa_${sch.pre}_ht_${gi + 1}`
      try {
        const htToken = await throttledLogin(htUser, 'Qa@2026')
        const r = await call('GET', `/exams?classId=${cls.id}&take=500`, { token: htToken })
        const list = Array.isArray(r) ? r : r.items || []
        existByClass.set(cls.id, new Set(list.map((e) => e.name)))
      } catch (e) {
        console.log(`  ⚠ 预查 ${cls.name}: ${e.message}`)
      }
    }
  }

  // 执行（并发 3）
  let done = 0
  const results = await pool(tasks, async (task) => {
    const { sch, cls } = task
    const existSet = existByClass.get(cls.id)
    if (existSet?.has(task.name)) return { skipped: true }
    const gi = GRADES.indexOf(cls.grade)
    const htUser = `qa_${sch.pre}_ht_${gi + 1}`
    const token = await throttledLogin(htUser, 'Qa@2026')
    const exam = await call('POST', '/exams', {
      body: { name: task.name, classId: cls.id, subjects: SUBJECTS, date: task.date, term: task.term, subjectFullScores: { 语文: 100, 数学: 100, 英语: 100 } },
      token,
    })
    const clsStudents = sch.students.filter((s) => s.classId === cls.id)
    await Promise.all(SUBJECTS.map(async (sub) => {
      const scores = clsStudents.map((st) => ({ studentId: st.id, score: 60 + Math.floor(Math.random() * 40) }))
      await call('POST', '/grades/merge', {
        body: { classId: cls.id, examName: task.name, subject: sub, scores, date: task.date, examId: exam.id },
        token,
      })
    }))
    done++
    if (done % 30 === 0) console.log(`  进度：${done} 场完成`)
    return { ok: true, examId: exam.id }
  }, CONC)

  const created = results.filter((r) => r.ok && !r.skipped).length
  const skipped = results.filter((r) => r.skipped).length
  const failed = results.filter((r) => !r.ok && !r.skipped).length
  console.log(`\n=== 完成：新建 ${created} / 已存在跳过 ${skipped} / 失败 ${failed} ===`)
  results.filter((r) => !r.ok).slice(0, 10).forEach((r) => console.log(`  ❌ ${r.error}`))
}
main().catch((e) => { console.error('FATAL: ' + e.message); process.exit(1) })
