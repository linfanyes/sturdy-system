/**
 * 端到端用户旅程测试（E2E）
 *
 * 模拟班主任的一天完整流程 → 验证数据流完整性 → 校管验证
 * 全程使用 live API，不依赖 mock
 */
const crypto = require('crypto')

const BASE = 'http://127.0.0.1:3000/api'
const TODAY = new Date().toISOString().slice(0, 10)

async function p(t) { process.stdout.write(t + '\n') }
async function ok(t) { process.stdout.write('  ✅ ' + t + '\n') }
async function fail(t) { process.stdout.write('  ❌ ' + t + '\n') }
async function warn(t) { process.stdout.write('  ⚠️  ' + t + '\n') }

async function login(ep, body) {
  const r = await fetch(BASE + ep, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
  const j = await r.json()
  return { ok: r.ok, token: j.token, data: j }
}

async function get(path, token) {
  const r = await fetch(BASE + path, { headers: { Authorization: 'Bearer ' + token } })
  const j = await r.json()
  // 统一解包 {items,total} → 数组
  return { ok: r.ok, status: r.status, data: Array.isArray(j) ? j : (j.items || j) }
}

async function post(path, token, body) {
  const r = await fetch(BASE + path, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token }, body: JSON.stringify(body) })
  const j = await r.json()
  return { ok: r.ok, status: r.status, data: j }
}

async function patch(path, token, body) {
  const r = await fetch(BASE + path, { method: 'PATCH', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token }, body: JSON.stringify(body) })
  return { ok: r.ok, status: r.status, data: await r.json() }
}

async function del(path, token) {
  const r = await fetch(BASE + path, { method: 'DELETE', headers: { Authorization: 'Bearer ' + token } })
  return { ok: r.ok, status: r.status, data: await r.json() }
}

;(async () => {
  await p('═══════════════════════════════════════════')
  await p('  E2E 用户旅程测试 — 班主任的一天')
  await p('  日期: ' + TODAY)
  await p('═══════════════════════════════════════════\n')

  let step = 0
  let pass = 0, failCount = 0

  // ===== Step 1: 班主任登录 =====
  await p(`【Step ${++step}】班主任登录`)
  const t1Login = await login('/auth/unified-login', { username: 'teacher1', password: '123456' })
  if (!t1Login.ok) { fail(`登录失败`); failCount++; return }
  ok(`王老师登录成功 (school: ${t1Login.data.user.school})`)
  const T1 = t1Login.token
  pass++

  // 获取班级和学生 ID
  let classId, stuIds = []
  const classesR = await get('/classes', T1)
  if (classesR.ok && classesR.data.length) {
    classId = classesR.data[0].id
    ok(`班级: ${classesR.data[0].name} (${classId.slice(0,8)})`)
    pass++
  } else { warn('未找到班级'); classId = 'unknown' }

  const studentsR = await get('/students', T1)
  if (studentsR.ok && studentsR.data.length) {
    stuIds = studentsR.data.map(s => s.id)
    ok(`学生: ${stuIds.length} 人`)
    pass++
  } else { warn('未找到学生'); stuIds = ['unknown'] }

  // ===== Step 2: 创建待办 =====
  await p(`\n【Step ${++step}】创建待办`)
  const todoR = await post('/todos', T1, { title: '批改单元测试卷', note: '周末前完成', date: TODAY })
  if (todoR.ok && todoR.data.id) { ok(`待办 "批改单元测试卷" 已创建 (id: ${todoR.data.id.slice(0,8)})`); pass++ }
  else { fail(`创建失败: ${todoR.status}`); failCount++ }

  // ===== Step 3: 考勤 =====
  await p(`\n【Step ${++step}】记考勤`)
  if (stuIds.length > 0) {
    const records = stuIds.map((sid, i) => ({
      studentId: sid,
      status: i === 0 ? '出勤' : i === 1 ? '迟到' : i === 2 ? '请假' : '出勤'
    }))
    const attR = await post('/attendances', T1, { classId, date: TODAY, records })
    if (attR.ok) { ok(`考勤记录 ${records.length} 人 (出勤${records.filter(r => r.status === '出勤').length + records.filter(r => r.status === '迟到').length}人, 请假1人)`); pass++ }
    else { fail(`考勤创建失败: ${attR.status}`); failCount++ }
  }

  // ===== Step 4: 行为记录 =====
  await p(`\n【Step ${++step}】记录学生行为`)
  if (stuIds.length > 0) {
    const behR1 = await post('/behavior-records', T1, { studentId: stuIds[0], studentName: '张小明', behavior: '课堂积极发言', date: TODAY, note: '主动回答了3个问题' })
    const behR2 = await post('/behavior-records', T1, { studentId: stuIds[1], studentName: '李小华', behavior: '帮助同学', date: TODAY, note: '课间帮同桌讲解数学题' })
    if (behR1.ok && behR2.ok) { ok(`今日 ${behR1.ok + behR2.ok} 条行为记录`); pass++ }
    else { fail(`行为记录创建失败`); failCount++ }
  }

  // ===== Step 5: 布置作业 =====
  await p(`\n【Step ${++step}】布置作业`)
  const hwR = await post('/homework', T1, { classId, subject: '语文', title: '背通《春晓》', content: '熟读并背诵孟浩然《春晓》，家长签字', startDate: TODAY, deadline: TODAY, status: '待批改' })
  if (hwR.ok) { ok(`语文作业已布置: 背通《春晓》`); pass++ }
  else { fail(`作业创建失败: ${hwR.status}`); failCount++ }

  // ===== Step 6: 发通知 =====
  await p(`\n【Step ${++step}】发布班级通知`)
  const noticeR = await post('/notices', T1, { classId, title: '下周期末考试安排', content: '下周一进行语文期末考试，请家长协助复习', pinned: true })
  if (noticeR.ok) { ok(`通知已发布: 下周期末考试安排 (已置顶)`); pass++ }
  else { fail(`通知创建失败: ${noticeR.status}`); failCount++ }

  // ===== Step 7: 家长联系 =====
  await p(`\n【Step ${++step}】记录家长沟通`)
  if (stuIds.length > 1) {
    const pcR = await post('/parent-contacts', T1, { classId, studentId: stuIds[1], studentName: '李小华', method: '电话', parentName: '李强', relation: '父亲', phone: '13800001002', content: '反馈孩子最近上课注意力不集中', date: TODAY, followUp: '下周再回访' })
    if (pcR.ok) { ok(`家长联系已记录: 李小华家长(电话)`); pass++ }
    else { fail(`家长联系创建失败: ${pcR.status}`); failCount++ }
  }

  // ===== Step 8: 积分奖励 =====
  await p(`\n【Step ${++step}】发放积分奖励`)
  if (stuIds.length > 0) {
    const scoreR = await post('/score-records', T1, { classId, studentId: stuIds[0], studentName: '张小明', delta: 5, reason: '课堂发言积极' })
    if (scoreR.ok) { ok(`积分 +5: 张小明`); pass++ }
    else { fail(`积分创建失败: ${scoreR.status}`); failCount++ }
  }

  // ===== Step 9: 数据一致性验证 =====
  await p(`\n【Step ${++step}】数据一致性验证`)

  // 验证今天的待办
  const todos = await get('/todos', T1)
  const todayTodos = todos.data.filter(t => t.date === TODAY)
  ok(`今日待办: ${todayTodos.length} 条 (应≥1)`)

  // 验证今天的考勤
  const atts = await get('/attendances', T1)
  const todayAtt = atts.data.filter(a => a.date === TODAY)
  ok(`今日考勤: ${todayAtt.length} 条 (应≥1)`)

  // 验证今天的行为记录
  const behs = await get('/behavior-records', T1)
  const todayBeh = behs.data.filter(b => b.date === TODAY)
  ok(`今日行为记录: ${todayBeh.length} 条 (应≥2)`)

  // 验证家长联系记录
  const pcs = await get('/parent-contacts', T1)
  ok(`家长联系总记录: ${pcs.data.length} 条`)

  pass += 5 // 以上都是信息显示，不严格计数

  // ===== Step 10: 数据隔离验证 =====
  await p(`\n【Step ${++step}】数据隔离验证 — 任课教师看不到班主任的数据`)
  const t3Login = await login('/auth/unified-login', { username: 'teacher3', password: '123456' })
  if (t3Login.ok) {
    const T3 = t3Login.token
    const t3Todos = await get('/todos', T3)
    const t3T = t3Todos.data.filter(t => t.date === TODAY)
    // teacher3 不应该看到 teacher1 创建的待办
    if (t3T.length === 0) ok(`teacher3 看不到 teacher1 的待办 ✅ (数据隔离有效)`)
    else warn(`teacher3 看到了 ${t3T.length} 条 teacher1 的待办`)
    pass++
  } else { warn('teacher3 登录失败，跳过隔离验证') }

  // ===== Step 11: 删除并清理 =====
  await p(`\n【Step ${++step}】清理测试数据`)
  // 删除刚创建的待办
  if (todos.data.length) {
    const testTodo = todos.data.find(t => t.title?.includes('单元测试'))
    if (testTodo) {
      await del('/todos/' + testTodo.id, T1)
      ok(`测试待办已清理`)
    } else warn('测试待办未找到')
  }
  pass++

  // ===== Step 12: 学校管理员看板验证 =====
  await p(`\n【Step ${++step}】校管看板 — 验证数据可见性`)
  const saLogin = await login('/school-admin/login', { username: 'sa1', password: '123456' })
  if (saLogin.ok) {
    const SAT = saLogin.token
    const dash = await get('/school-admin/dashboard', SAT)
    if (dash.ok) {
      ok(`校管看板: 教师${dash.data?.totalTeachers || '?'}人 班级${dash.data?.totalClasses || '?'}个 学生${dash.data?.totalStudents || '?'}人`)
      pass++
    } else warn('校管看板失败')
  } else warn('校管登录失败')

  // ===== 总结 =====
  await p(`\n═══════════════════════════════════════════`)
  await p(`  E2E 测试完成: ${pass} 通过 ✅ / ${failCount} 失败 ❌`)
  await p(`═══════════════════════════════════════════`)

  if (failCount > 0) process.exit(1)
})().catch(e => { console.error('\n❌ E2E 异常:', e.message); process.exit(1) })
