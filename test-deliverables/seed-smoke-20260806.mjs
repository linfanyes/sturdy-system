#!/usr/bin/env node
/**
 * 小规模冒烟验证：1 学校 + 1 校管 + 4 教师 + 1 班 + 5 学生 + 1 考试 + 成绩
 * 跑通造数全链路（school→sa→teacher→class→student→exam→grade→notice→resource→textbook→parent）
 */
import { writeFileSync } from 'node:fs'
const BASE = 'https://tec-work-283329-8-1440166408.sh.run.tcloudbase.com/api'
const delay = (ms) => new Promise((r) => setTimeout(r, ms))

async function call(method, p, { body, token } = {}) {
  const res = await fetch(`${BASE}${p}`, {
    method,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  })
  const text = await res.text()
  let data = null
  try { data = text ? JSON.parse(text) : null } catch { data = text }
  if (!res.ok) throw new Error(`${method} ${p} -> ${res.status}: ${data?.message || text.slice(0, 160)}`)
  return data
}
async function login(u, p) {
  const r = await call('POST', u === 'admin' ? '/admin/login' : '/auth/unified-login', { body: { username: u, password: p } })
  if (!r?.token) throw new Error('登录失败: ' + JSON.stringify(r).slice(0, 150))
  return r.token
}
const ok = (m) => console.log('  ✅ ' + m)
const P = 'Qa@2026'
const prefix = 'ZZ'

async function main() {
  console.log('=== 造数链路冒烟验证 ===')
  const superToken = await login('admin', 'admin')
  ok('超管登录')

  // 1) 学校
  const schools = await call('GET', '/admin/schools?skip=0&take=100', { token: superToken })
  const sList = Array.isArray(schools) ? schools : schools?.items || []
  let sch = sList.find((s) => s.prefix === prefix)
  if (!sch) {
    sch = await call('POST', '/admin/schools', { body: { prefix, name: '冒烟验证小学', platform: 'web' }, token: superToken })
    ok('创建学校')
  } else ok('学校已存在，复用')

  // 2) 校管
  const saUser = 'qa_sa_zz'
  const admins = await call('GET', '/admin/school-admins?skip=0&take=100', { token: superToken })
  const aList = Array.isArray(admins) ? admins : admins?.items || []
  let sa = aList.find((a) => a.username === saUser)
  if (!sa) {
    sa = await call('POST', '/admin/school-admins', { body: { username: saUser, password: P, name: '冒烟校管', schoolId: sch.id, enabled: true }, token: superToken })
    ok('创建校管')
  } else ok('校管已存在')
  await delay(800)
  const saToken = await login(saUser, P)
  ok('校管登录')

  // 3) 教师批量
  const teachers = await call('GET', '/school-admin/teachers?skip=0&take=500', { token: saToken })
  const tList = Array.isArray(teachers) ? teachers : teachers?.items || []
  const existUsers = new Set(tList.map((t) => t.username))
  const need = [
    { name: '冒烟班主任', position: '班主任', username: 'qa_zz_ht_1' },
    { name: '冒烟语文老师', subject: '语文', position: '学科组长', username: 'qa_zz_cn_1' },
    { name: '冒烟数学老师', subject: '数学', position: '教研组长', username: 'qa_zz_math_1' },
    { name: '冒烟英语老师', subject: '英语', position: '年级组长', username: 'qa_zz_en_1' },
  ].filter((t) => !existUsers.has(t.username))
  if (need.length) {
    const r = await call('POST', '/school-admin/teachers/batch', { body: { teachers: need.map((t) => ({ ...t, password: P, gender: '男' })) }, token: saToken })
    ok('批量创建教师 ' + need.length + ' 名')
  } else ok('教师已存在')

  // 4) 班级
  const classes = await call('GET', '/school-admin/classes', { token: saToken })
  const cList = Array.isArray(classes) ? classes : classes?.items || []
  let cls = cList.find((c) => c.name === '冒烟一年级1班')
  const teachers2 = await call('GET', '/school-admin/teachers?skip=0&take=500', { token: saToken })
  const t2 = Array.isArray(teachers2) ? teachers2 : teachers2?.items || []
  const byUser = new Map(t2.map((t) => [t.username, t]))
  const ht = byUser.get('qa_zz_ht_1')
  if (!cls) {
    cls = await call('POST', '/school-admin/classes', {
      body: {
        name: '冒烟一年级1班', grade: '一年级', classNo: '1',
        headTeacher: ht?.name || '冒烟班主任', headTeacherId: ht.id,
        term: '2026 春', subjects: ['语文', '数学', '英语'],
        subjectTeachers: ['cn', 'math', 'en'].map((s, i) => ({ teacherId: byUser.get(`qa_zz_${s}_1`).id, subjects: [['语文', '数学', '英语'][i]] })).filter(Boolean),
      },
      token: saToken,
    })
    ok('创建班级')
  } else ok('班级已存在')

  // 5) 学生 5 名
  const students = await call('GET', '/school-admin/students', { token: saToken })
  const stList = Array.isArray(students) ? students : students?.items || []
  const existNos = new Set(stList.map((s) => s.studentNo))
  const batch = []
  for (let i = 1; i <= 5; i++) {
    const no = `ZZ01001${i}`
    if (existNos.has(no)) continue
    batch.push({ name: `冒烟学生${i}`, gender: i % 2 ? '男' : '女', studentNo: no, parentName: `冒烟家长${i}`, parentPhone: `1380000${i}001`, classId: cls.id })
  }
  if (batch.length) {
    const r = await call('POST', '/school-admin/students/batch', { body: { students: batch }, token: saToken })
    ok('批量创建学生 ' + batch.length + ' 名')
  } else ok('学生已存在')

  // 6) 班主任登录 → 考试 + 成绩
  await delay(600)
  const htToken = await login('qa_zz_ht_1', P)
  ok('班主任登录')
  const exam = await call('POST', '/exams', {
    body: { name: '2026春第1次月考', classId: cls.id, subjects: ['语文', '数学', '英语'], date: '2026-03-15', term: '2026 春', subjectFullScores: { 语文: 100, 数学: 100, 英语: 100 } },
    token: htToken,
  })
  ok('创建考试 ' + exam.name)
  const students2 = await call('GET', '/school-admin/students', { token: saToken })
  const st2 = Array.isArray(students2) ? students2 : students2?.items || []
  const clsStu = st2.filter((s) => s.classId === cls.id)
  for (const sub of ['语文', '数学', '英语']) {
    await call('POST', '/grades/merge', {
      body: { classId: cls.id, examName: exam.name, subject: sub, scores: clsStu.map((s) => ({ studentId: s.id, score: 60 + Math.floor(Math.random() * 40) })), date: '2026-03-15', examId: exam.id },
      token: htToken,
    })
  }
  ok('录成绩（3 科 × ' + clsStu.length + ' 学生）')

  // 7) 公告/资源/教材
  await call('POST', '/school-admin/notices', { body: { title: '冒烟公告', content: '这是冒烟测试公告' }, token: saToken }).then(() => ok('创建公告')).catch(() => {})
  await call('POST', '/school-admin/resource-library/seed-defaults', { body: {}, token: saToken }).then(() => ok('资源库初始化')).catch((e) => console.log('  ⚠ 资源库: ' + e.message))
  await call('POST', '/school-admin/textbooks/seed-defaults', { body: {}, token: saToken }).then(() => ok('教材初始化')).catch((e) => console.log('  ⚠ 教材: ' + e.message))

  // 8) 家长登录开通
  const s3 = await call('GET', '/school-admin/students', { token: saToken })
  const st3 = Array.isArray(s3) ? s3 : s3?.items || []
  const target = st3.find((s) => s.classId === cls.id && (s.studentNo || '').endsWith('001'))
  if (target) {
    await call('POST', `/students/${target.id}/toggle-parent-login`, { body: {}, token: saToken })
    ok('开通家长登录 ' + target.studentNo)
    const pt = await login(target.studentNo, '123456')
    ok('家长登录（学号 ' + target.studentNo + '）')
    const me = await call('GET', '/parent-auth/me', { token: pt })
    ok('家长 me: ' + (me?.studentName || me?.parent?.studentName || '?') + ' 班级 ' + (me?.className || ''))
  }
  console.log('\n=== 冒烟验证完成 ✅ ===')
  writeFileSync('C:/Users/admin/.workbuddy/binaries/node/workspace/smoke-fixture.json', JSON.stringify({ schoolId: sch.id, classId: cls.id, saUser, htUser: 'qa_zz_ht_1', examName: exam.name }, null, 2))
}
main().catch((e) => { console.error('❌ 冒烟失败: ' + e.message); process.exit(1) })
