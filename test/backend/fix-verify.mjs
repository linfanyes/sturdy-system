/**
 * 针对性回归验证：两个已知修复点（打真实本地服务）
 *   修复1：小程序打卡/读书日志使用真实 studentId/classId（家长端可按 studentId 看到孩子记录）
 *   修复2：小程序「全部科目批量导入」逐科幂等提交（复刻小程序端 CSV 矩阵解析 + import-commit）
 * 前置：本地 MariaDB + 后端已启动（server/.env 的 SUPER_ADMIN_USER/PASSWORD）
 * 用法：node ../test/backend/fix-verify.mjs
 */
import { createRequire } from 'module'
import fs from 'fs'

const require = createRequire('/workspace/work-system/server/')
const axios = require('axios')

const BASE = process.env.BASE || 'http://127.0.0.1:3000/api/v1'

const env = {}
const envPath = '/workspace/work-system/server/.env'
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Z0-9_]+)=(.*)$/)
    if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, '')
  }
}
const SUPER_USER = process.env.SUPER_ADMIN_USER || env.SUPER_ADMIN_USER || 'admin'
const SUPER_PASS = process.env.SUPER_ADMIN_PASSWORD || env.SUPER_ADMIN_PASSWORD || 'admin'

const results = []
let passCount = 0, failCount = 0
function check(name, cond, detail = '') {
  const line = `${cond ? '[PASS]' : '[FAIL]'} ${name}${detail ? ' | ' + detail : ''}`
  if (cond) passCount++; else failCount++
  results.push(line)
  console.log('  ' + line)
}
const errOf = (e) => (e?.response ? `${e.response.status} ${JSON.stringify(e.response.data || '').slice(0, 160)}` : e?.message || String(e))
const listOf = (d) => (Array.isArray(d) ? d : d?.items || d?.data || [])
async function req(method, url, { data, token, params } = {}) {
  const headers = {}
  if (token) headers.Authorization = 'Bearer ' + token
  if (data) headers['Content-Type'] = 'application/json'
  const res = await axios({ method, url: BASE + url, data, params, headers, timeout: 30000, validateStatus: () => true })
  return { status: res.status, data: res.data }
}
const login = async (u, p) => req('POST', '/auth/unified-login', { data: { username: u, password: p } })

// 需要的功能开关（checkin/reading 为两个修复点对应的模块）
const FEATURES = ['checkin', 'reading', 'students', 'classes', 'grades', 'exams', 'parents', 'analysis']

async function main() {
  console.log('==== 两个已知修复点 · 针对性回归验证 ====\n')
  const TS = new Date().getTime().toString().slice(-6)

  // ---------- 准备数据 ----------
  let r = await login(SUPER_USER, SUPER_PASS)
  if ((r.status !== 200 && r.status !== 201) || !r.data?.token) {
    console.error('超管登录失败，请确认后端已启动且 .env 账号正确:', errOf(r))
    process.exit(1)
  }
  const superT = r.data.token

  const schoolName = `回归验证小学${TS}`
  r = await req('POST', '/admin/schools', { token: superT, data: { name: schoolName, prefix: 'FV', platform: 'web' } })
  const schoolId = r.data?.id
  await req('PATCH', `/admin/schools/${schoolId}/features`, { token: superT, data: { featureFlags: FEATURES } })

  const saU = `fix_sa_${TS}`
  r = await req('POST', '/admin/school-admins', { token: superT, data: { username: saU, password: 'Sadmin123', name: '回归校管', schoolId } })
  const saId = r.data?.id
  if (!saId) { console.error('创建校管失败:', r.status, JSON.stringify(r.data).slice(0, 160)); process.exit(1) }

  // 校管登录（教师/班级创建需校管身份）
  r = await login(saU, 'Sadmin123')
  if ((r.status !== 200 && r.status !== 201) || !r.data?.token) { console.error('校管登录失败:', r.status, JSON.stringify(r.data).slice(0, 160)); process.exit(1) }
  const saT = r.data.token

  const tU = `fix_t_${TS}`
  r = await req('POST', '/school-admin/teachers', { token: saT, data: { name: '回归老师', subject: '语文', phone: '13800009999', gender: '女', username: tU, password: 'Teacher123' } })
  const teacherId = r.data?.id
  r = await req('POST', '/school-admin/teachers', { token: saT, data: { name: '班主任1', subject: '语文', phone: '13800009998', gender: '女', username: `fix_ht_${TS}`, password: 'Teacher123' } })
  const htId = r.data?.id
  if (!teacherId || !htId) { console.error('创建教师失败:', r.status, JSON.stringify(r.data).slice(0, 160)); process.exit(1) }

  r = await login(tU, 'Teacher123')
  if ((r.status !== 200 && r.status !== 201) || !r.data?.token) { console.error('教师登录失败:', r.status, JSON.stringify(r.data).slice(0, 160)); process.exit(1) }
  const tT = r.data.token
  await req('PATCH', `/school-admin/teachers/${teacherId}/features`, { token: saT, data: { features: FEATURES } })
  await req('PATCH', `/school-admin/teachers/${htId}/features`, { token: saT, data: { features: FEATURES } })

  r = await req('POST', '/school-admin/classes', { token: saT, data: { name: '回归一班', grade: '三年级', classNo: '1', headTeacher: '回归老师', headTeacherId: teacherId, term: '2026春' } })
  const classId = r.data?.id
  if (!classId) { console.error('创建班级失败:', r.status, JSON.stringify(r.data).slice(0, 160)); process.exit(1) }

  const st1 = { name: '小明', gender: '男', studentNo: `FIX${TS}01`, parentName: '明父', parentPhone: '13900000001', classId }
  const st2 = { name: '小红', gender: '女', studentNo: `FIX${TS}02`, parentName: '红母', parentPhone: '13900000002', classId }
  r = await req('POST', '/students', { token: tT, data: st1 })
  const st1Id = r.data?.id
  r = await req('POST', '/students', { token: tT, data: st2 })
  const st2Id = r.data?.id
  if (!st1Id || !st2Id) { console.error('创建学生失败:', r.status, JSON.stringify(r.data).slice(0, 160)); process.exit(1) }

  r = await req('POST', `/students/${st1Id}/toggle-parent-login`, { token: tT })
  const parentPwd = r.data?.initialPassword || r.data?.defaultPassword || '123456'

  // ---------- 修复1：打卡/读书日志真实 studentId 落库 + 家长端可见 ----------
  console.log('\n— 修复1：打卡/读书日志 真实 studentId（家长端可查） —')
  const today = '2026-08-13'
  let r2 = await req('POST', '/checkins', { token: tT, data: { studentId: st1Id, studentName: '小明', classId, type: '阅读', date: today, count: 2, note: '《安徒生童话》30分钟' } })
  check('F1-1 打卡写入(带真实 studentId/classId)', r2.status === 200 || r2.status === 201, `status=${r2.status} ${errOf(r2).slice(0, 100)}`)

  r2 = await req('GET', '/checkins', { token: tT, params: { studentId: st1Id, take: 50 } })
  const ck = listOf(r2.data).find((c) => c.studentId === st1Id)
  check('F1-2 打卡记录 studentId 落库(非伪造)', !!ck, ck ? `studentId=${ck.studentId}` : `list=${JSON.stringify(r2.data).slice(0, 120)}`)
  check('F1-3 打卡记录 classId 落库', !!ck && ck.classId === classId, `classId=${ck?.classId}`)

  r2 = await req('POST', '/reading-logs', { token: tT, data: { studentId: st1Id, studentName: '小明', classId, bookTitle: '安徒生童话', author: '安徒生', pages: 40, minutes: 30, date: today } })
  check('F1-4 读书日志写入(带真实 studentId/classId)', r2.status === 200 || r2.status === 201, `status=${r2.status} ${errOf(r2).slice(0, 100)}`)

  r2 = await req('GET', '/reading-logs', { token: tT, params: { studentId: st1Id, take: 50 } })
  const rl = listOf(r2.data).find((x) => x.studentId === st1Id)
  check('F1-5 读书日志 studentId 落库(非伪造)', !!rl, rl ? `studentId=${rl.studentId}` : `list=${JSON.stringify(r2.data).slice(0, 120)}`)
  check('F1-6 读书日志 classId 落库', !!rl && rl.classId === classId, `classId=${rl?.classId}`)

  // 家长端：用该学生的学号+口令登录，按 studentId 应能看到孩子的打卡
  r2 = await req('POST', '/parent-auth/login', { data: { studentNo: st1.studentNo, password: parentPwd } })
  const parentT = r2.data?.token
  check('F1-7 家长登录(学号+口令)', (r2.status === 200 || r2.status === 201) && !!parentT, `status=${r2.status} ${JSON.stringify(r2.data).slice(0, 100)}`)
  if (parentT) {
    r2 = await req('GET', '/parent-auth/attendance', { token: parentT })
    const att = r2.data || {}
    const hasReading = (att.recent || []).some((c) => c.type === '阅读')
    check('F1-8 家长端能看到孩子打卡(按真实 studentId)', r2.status === 200 && att.total >= 2 && hasReading, `total=${att.total} recent=${JSON.stringify(att.recent || []).slice(0, 120)}`)
  } else {
    check('F1-8 家长端能看到孩子打卡(按真实 studentId)', false, '家长登录失败，跳过')
  }

  // ---------- 修复2：全部科目矩阵导入（复刻小程序端解析 + 逐科 import-commit） ----------
  console.log('\n— 修复2：全部科目批量导入（矩阵 CSV → 逐科幂等提交） —')
  const examName = `期末考试${TS}`
  r2 = await req('POST', '/exams', { token: tT, data: { name: examName, classId, subjects: ['语文', '数学'], date: '2026-07-01', term: '2026春', teacherName: '班主任1' } })
  const examId = r2.data?.id
  check('F2-1 创建考试(语文/数学)', (r2.status === 200 || r2.status === 201) && !!examId, `status=${r2.status} ${errOf(r2).slice(0, 120)}`)

  // 复刻小程序 GradeEntry.vue pickAllFile 的客户端解析：首行表头「学号,姓名,科目1,科目2,…」，按学号/姓名匹配学生
  const csv = `学号,姓名,语文,数学\n${st1.studentNo},小明,92,88\n${st2.studentNo},小红,85,90\n`
  const lines = csv.replace(/^\uFEFF/, '').split(/\r?\n/).map((l) => l.trim()).filter(Boolean)
  const header = lines[0].split(/[,，\t]+/).map((c) => c.trim())
  const noCol = Math.max(header.findIndex((h) => h === '学号'), header.findIndex((h) => /student\s*no/i.test(h)))
  const nameCol = Math.max(header.findIndex((h) => h === '姓名'), header.findIndex((h) => /^name$/i.test(h)))
  const keyCol = noCol >= 0 ? noCol : nameCol
  const subjects = ['语文', '数学']
  const subCols = subjects.map((s) => ({ subject: s, idx: header.findIndex((h) => h === s) })).filter((x) => x.idx >= 0)
  check('F2-2 矩阵表头解析出全部科目列', subCols.length === subjects.length, `found=${subCols.map((s) => s.subject).join(',')}`)

  const students = [
    { id: st1Id, name: '小明', studentNo: st1.studentNo },
    { id: st2Id, name: '小红', studentNo: st2.studentNo },
  ]
  const perSubject = {}
  let matchedCells = 0, unmatched = 0
  for (let i = 1; i < lines.length; i++) {
    const cells = lines[i].split(/[,，\t]+/).map((c) => c.trim())
    const key = cells[keyCol]
    const stu = students.find((s) => (noCol >= 0 ? s.studentNo === key : s.name === key))
      || students.find((s) => s.studentNo === key || s.name === key)
    if (!stu) { unmatched++; continue }
    for (const { subject, idx } of subCols) {
      const raw = cells[idx] ?? ''
      if (raw === '') continue
      matchedCells++
      perSubject[subject] = perSubject[subject] || []
      perSubject[subject].push({ studentId: stu.id, name: stu.name, studentNo: stu.studentNo, score: Number(raw), valid: true })
    }
  }
  check('F2-3 矩阵解析出有效成绩格(学生匹配)', matchedCells === 4 && unmatched === 0, `cells=${matchedCells} unmatched=${unmatched}`)

  let commitOk = 0
  for (const subject of subjects) {
    r2 = await req('POST', '/grades/import-commit', { token: tT, data: { classId, examName, examId, subject, date: '2026-07-01', rows: perSubject[subject] || [] } })
    if (r2.status === 200 || r2.status === 201) commitOk++
    else console.log(`    [warn] 科目 ${subject} 提交: ${errOf(r2)}`)
  }
  check('F2-4 逐科 import-commit 全部成功', commitOk === subjects.length, `ok=${commitOk}/${subjects.length}`)

  r2 = await req('GET', '/grades', { token: tT, params: { classId, examName, take: 100 } })
  const grades = listOf(r2.data)
  const chinese = grades.find((g) => g.subject === '语文')
  const math = grades.find((g) => g.subject === '数学')
  const scoreOf = (g, sid) => (g?.scores || []).find((s) => s.studentId === sid)?.score
  check('F2-5 语文成绩落库(小明92/小红85)', !!chinese && scoreOf(chinese, st1Id) === 92 && scoreOf(chinese, st2Id) === 85, `scores=${JSON.stringify(chinese?.scores).slice(0, 120)}`)
  check('F2-6 数学成绩落库(小明88/小红90)', !!math && scoreOf(math, st1Id) === 88 && scoreOf(math, st2Id) === 90, `scores=${JSON.stringify(math?.scores).slice(0, 120)}`)

  // 幂等：重复提交同一科目（改分），不新增记录
  r2 = await req('POST', '/grades/import-commit', { token: tT, data: { classId, examName, examId, subject: '语文', date: '2026-07-01', rows: [{ studentId: st1Id, score: 95, valid: true }] } })
  const idem = r2.data?.created === false
  r2 = await req('GET', '/grades', { token: tT, params: { classId, examName, take: 100 } })
  const grades2 = listOf(r2.data)
  const chinese2 = grades2.find((g) => g.subject === '语文')
  const chineseCount = grades2.filter((g) => g.subject === '语文').length
  check('F2-7 重复提交幂等(不新增重复记录)', idem && chineseCount === 1 && scoreOf(chinese2, st1Id) === 95, `created=${idem} count=${chineseCount} score=${scoreOf(chinese2, st1Id)}`)

  // ---------- 汇总 ----------
  console.log(`\n==== 结果：${passCount} 通过 / ${failCount} 失败 ====`)
  if (failCount > 0) process.exit(1)
}

main().catch((e) => { console.error('执行异常:', e); process.exit(2) })
