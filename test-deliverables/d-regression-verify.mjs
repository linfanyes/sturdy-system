#!/usr/bin/env node
/**
 * 本次迭代专项回归验证（2026-08-07）
 * 覆盖：
 *  1. 班级列表带 studentCount（校管 + 教师端）
 *  2. 教师端 GET /students 按班级集合可见（class_members 非空场景）
 *  3. 转交班主任后 students.teacherId 同步（updateClass 修复）
 *  4. 跨班科任教师可见性（张老师两班、王老师兼二班科任）
 *  5. 家长登录（学号 + 默认口令）
 *
 * 用法：node test-deliverables/d-regression-verify.mjs
 * 前置：本地后端 localhost:3000 + 已跑 a-test-seed-data.js
 */
const BASE = process.env.BASE || 'http://localhost:3000/api'

const results = []
let passed = 0, failed = 0
function test(name, ok, detail = '') {
  results.push({ name, ok, detail: detail.slice(0, 160) })
  ok ? passed++ : failed++
  console.log(`  ${ok ? '✅' : '❌'} ${name}${detail ? ' — ' + detail.slice(0, 120) : ''}`)
}

async function call(method, path, body, token) {
  const headers = { 'Content-Type': 'application/json' }
  if (token) headers.Authorization = `Bearer ${token}`
  const res = await fetch(BASE + path, {
    method,
    headers,
    body: body !== undefined && body !== null ? JSON.stringify(body) : undefined,
  })
  const text = await res.text()
  let d; try { d = JSON.parse(text) } catch { d = text }
  return { status: res.status, ok: res.ok, d }
}

const unwrap = (d) => (d && Array.isArray(d.items) ? d.items : Array.isArray(d) ? d : [])

async function login(username, password, endpoint = '/auth/unified-login') {
  const r = await call('POST', endpoint, { username, password })
  return r.ok ? r.d.token : null
}

async function main() {
  console.log('── 1. 登录矩阵 ──')
  const adminT = await call('POST', '/admin/login', { username: 'admin', password: 'admin' })
  test('超管登录', adminT.ok && !!adminT.d.token, adminT.status + '')
  const saT = await login('sa1', '123456', '/school-admin/login')
  test('校管 sa1 登录', !!saT, saT ? '' : '登录失败')
  const t1T = await login('teacher1', '123456')   // 王老师 班主任一班
  const t2T = await login('teacher2', '123456')   // 李老师 班主任二班
  const t3T = await login('teacher3', '123456')   // 张老师 跨班科任
  test('班主任 teacher1 登录', !!t1T, t1T ? '' : '登录失败')
  test('班主任 teacher2 登录', !!t2T)
  test('任课教师 teacher3 登录', !!t3T)
  if (!(saT && t1T && t3T)) { console.log('登录失败，终止'); process.exit(1) }

  console.log('── 2. 班级列表 studentCount（校管） ──')
  const saClasses = await call('GET', '/school-admin/classes?take=500', null, saT)
  const saItems = unwrap(saClasses.d)
  const c1 = saItems.find(c => c.name === '一年级一班')
  const c2 = saItems.find(c => c.name === '二年级二班')
  test('校管班级列表 200 且 2 班', saClasses.ok && saItems.length >= 2, `${saItems.length} 班`)
  test('一年级一班 studentCount=6', c1 && c1.studentCount === 6, c1 ? String(c1.studentCount) : '班级缺失')
  test('二年级二班 studentCount=4', c2 && c2.studentCount === 4, c2 ? String(c2.studentCount) : '班级缺失')

  console.log('── 3. 教师端班级列表 studentCount ──')
  const t1Classes = await call('GET', '/classes', null, t1T)
  const t1Items = unwrap(t1Classes.d)
  const my1 = t1Items.find(c => c.name === '一年级一班')
  test('王老师 GET /classes 含一班且 studentCount=6', t1Classes.ok && my1 && my1.studentCount === 6, t1Classes.status + ' ' + (my1 ? String(my1.studentCount) : '无一班'))
  const t3Classes = await call('GET', '/classes', null, t3T)
  const t3Items = unwrap(t3Classes.d)
  test('张老师 GET /classes 跨班可见 2 班', t3Classes.ok && t3Items.length === 2, `${t3Items.length} 班`)
  test('张老师一班 studentCount=6', t3Items.find(c => c.name === '一年级一班')?.studentCount === 6)
  test('张老师二班 studentCount=4', t3Items.find(c => c.name === '二年级二班')?.studentCount === 4)

  console.log('── 4. 教师端学生列表（班级集合可见性） ──')
  const t1Stu = await call('GET', '/students?take=500', null, t1T)
  const t1StuItems = unwrap(t1Stu.d)
  // 王老师：一班 head(6) + 二班 subject(4) = 10（种子设计跨班协作）
  test('王老师可见学生=10（一班head+二班科任）', t1Stu.ok && t1StuItems.length === 10, `${t1StuItems.length} 名`)
  const t3Stu = await call('GET', '/students?take=500', null, t3T)
  const t3StuItems = unwrap(t3Stu.d)
  // 张老师：一班(6) + 二班(4) = 10
  test('张老师可见学生=10（跨班）', t3Stu.ok && t3StuItems.length === 10, `${t3StuItems.length} 名`)
  const t2Stu = await call('GET', '/students?take=500', null, t2T)
  test('李老师可见学生=4（二班）', t2Stu.ok && unwrap(t2Stu.d).length === 4, `${unwrap(t2Stu.d).length} 名`)

  console.log('── 5. 班级成员列表 ──')
  const members = await call('POST', `/classes/${my1.id}/members/list`, {}, t1T)
  const mItems = Array.isArray(members.d) ? members.d : []
  test('一班成员含 head+2 subject', members.ok && mItems.length === 3, `${mItems.length} 人`)
  test('王老师为一班 head', mItems.some(m => m.role === 'head'))

  console.log('── 6. 转交班主任同步 students.teacherId ──')
  // 校管把二班班主任从李老师转给张老师（张老师当前无 head 记录，满足一师一班规则）
  const zhangId = await findTeacherId(saT, '张老师')
  const liId = await findTeacherId(saT, '李老师')
  const c2id = c2.id
  test('定位张老师/李老师 id', !!zhangId && !!liId, `张=${zhangId.slice(0,8)} 李=${liId.slice(0,8)}`)
  const transfer = await call('PATCH', `/school-admin/classes/${c2id}`, {
    headTeacherId: zhangId,
    headTeacher: '张老师',
  }, saT)
  test('转交班主任 PATCH 200', transfer.ok, transfer.status + ' ' + (typeof transfer.d === 'string' ? transfer.d : JSON.stringify(transfer.d).slice(0, 80)))
  if (transfer.ok) {
    // 转交后从列表接口核对班级 teacherId（校管无 GET /classes/:id 单查端点）
    const saList2 = await call('GET', '/school-admin/classes?take=500', null, saT)
    const c2new = unwrap(saList2.d).find(c => c.id === c2id)
    test('二班 classes.teacherId=张老师', c2new && c2new.teacherId === zhangId, c2new ? c2new.teacherId : '未找到班级')
    // 校管 students 接口返回全校学生（无 classId 参数），自行按 classId 过滤
    const allStus = unwrap((await call('GET', '/school-admin/students?take=500', null, saT)).d)
    const stus = allStus.filter(s => s.classId === c2id)
    const allNew = stus.length > 0 && stus.every(s => s.teacherId === zhangId)
    test('二班全部学生 teacherId 已同步为张老师', allNew, `${stus.length} 名学生`)
    // 转回李老师，恢复数据
    await call('PATCH', `/school-admin/classes/${c2id}`, { headTeacherId: liId, headTeacher: '李老师' }, saT)
  }

  console.log('── 7. 家长登录 ──')
  const pLogin = await call('POST', '/auth/unified-login', { username: '2024001', password: '123456' })
  test('家长（学号 2024001）登录', pLogin.ok && !!pLogin.d.token, pLogin.status + '')
  const pT = pLogin.ok ? pLogin.d.token : null
  if (pT) {
    const me = await call('GET', '/parent-auth/me', null, pT)
    test('家长 me 接口 200', me.ok)
  }

  console.log('── 8. 越权与鉴权 ──')
  const noToken = await call('GET', '/classes')
  test('无 token 访问 /classes → 401', noToken.status === 401, String(noToken.status))
  const t1ToAdmin = await call('GET', '/admin/schools', null, t1T)
  test('教师 token 调超管接口 → 401', t1ToAdmin.status === 401, String(t1ToAdmin.status))
  const t3DeleteClass = await call('DELETE', `/classes/${my1.id}`, null, t3T)
  test('非班主任删除班级 → 403', t3DeleteClass.status === 403, String(t3DeleteClass.status))

  console.log(`\n════════ 汇总：${passed} 通过 / ${failed} 失败 ════════`)
  process.exit(failed ? 1 : 0)
}

async function findTeacherId(saT, name) {
  const r = await call('GET', '/school-admin/teachers?take=500', null, saT)
  return unwrap(r.d).find(t => t.name === name)?.id || ''
}

main().catch(e => { console.error('脚本异常:', e.message); process.exit(1) })
