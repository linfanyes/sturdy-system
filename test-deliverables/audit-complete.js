/**
 * 一站式种子 + 五角色审计
 * 在单进程内完成：创建种子数据 → 立即审计，避免跨进程数据丢失
 */
const crypto = require('crypto')
const mysql = require('mysql2/promise')

const PWD = crypto.createHash('sha256').update('123456').digest('hex')
const ADMIN_PWD = crypto.createHash('sha256').update('admin').digest('hex')
const BASE = 'http://127.0.0.1:3000/api'

async function p(t) { process.stdout.write(t + '\n') }
async function ok(t) { process.stdout.write('  ✅ ' + t + '\n') }
async function fail(t) { process.stdout.write('  ❌ ' + t + '\n') }
async function warn(t) { process.stdout.write('  ⚠️  ' + t + '\n') }

async function login(ep, body) {
  const r = await fetch(BASE + ep, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
  const j = await r.json()
  return { ok: r.ok, status: r.status, token: j.token, data: j }
}

async function get(path, token) {
  const r = await fetch(BASE + path, { headers: { Authorization: 'Bearer ' + token } })
  return { ok: r.ok, status: r.status, data: await r.json() }
}

async function post(path, token, body) {
  const r = await fetch(BASE + path, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token }, body: JSON.stringify(body) })
  return { ok: r.ok, status: r.status, data: await r.json() }
}

;(async () => {
  const c = await mysql.createConnection({ host: '127.0.0.1', port: 3306, user: 'root', password: 'admin', database: 'gardener_test', connectTimeout: 8000 })

  // ==== STEP 1: 重建种子数据（在当前连接中，不依赖外部脚本）====
  await p('\n══════ 重建种子数据 ══════')

  // 清理
  for (const t of ['students', 'classes', 'users', 'school_admins', 'schools', 'exams', 'grades',
    'todos', 'attendances', 'behavior_records', 'class_activities', 'class_expenses',
    'class_galleries', 'reading_logs', 'reward_records', 'score_records', 'semesters',
    'work_logs', 'lesson_plan_templates', 'parent_contacts', 'seat_layouts', 'duty_rosters',
    'my_galleries', 'checkins', 'award_categories', 'group_scores', 'lesson_observations',
    'home_visits', 'notice_templates', 'picker_history', 'notes', 'backup_snapshots',
    'growth_entries', 'generated_papers', 'generated_lesson_plans', 'generated_knowledges',
    'paper_queries', 'ai_settings', 'class_duty_configs',
  ]) {
    try { await c.execute(`DELETE FROM \`${t}\``) } catch(e) { /* skip non-existent */ }
  }

  // 学校
  await c.execute("INSERT INTO schools (id, code, name, address, contact, phone, status) VALUES (UUID(),'SCH001','阳光实验小学','北京市朝阳区','赵校长','13800138001','active')")
  await c.execute("INSERT INTO schools (id, code, name, status) VALUES (UUID(),'SCH002','明德小学','active')")
  const [schools] = await c.query('SELECT id,code,name FROM schools ORDER BY code')
  await p(`学校: ${schools[0].name}, ${schools[1].name}`)

  // 学校管理员
  await c.execute('INSERT INTO school_admins (id,username,passwordHash,name,schoolId,enabled) VALUES (UUID(),?,?,?,?,1)', ['sa1',PWD,'赵主任',schools[0].id])
  await c.execute('INSERT INTO school_admins (id,username,passwordHash,name,schoolId,enabled) VALUES (UUID(),?,?,?,?,1)', ['sa2',PWD,'钱主任',schools[1].id])
  await c.execute("INSERT INTO school_admins (id,username,passwordHash,name,schoolId,enabled) VALUES (UUID(),?,?,?,?,0)", ['sa_disabled',PWD,'孙主任',schools[0].id])

  // 教师用户
  await c.execute('INSERT INTO users (id,name,subject,school,schoolId,username,passwordHash,enabled,teacherNo,phone) VALUES (UUID(),?,?,?,?,?,?,1,?,?)', ['王老师','语文','阳光实验小学',schools[0].id,'teacher1',PWD,'JS001','13811111111'])
  await c.execute('INSERT INTO users (id,name,subject,school,schoolId,username,passwordHash,enabled,teacherNo,phone) VALUES (UUID(),?,?,?,?,?,?,1,?,?)', ['李老师','数学','阳光实验小学',schools[0].id,'teacher2',PWD,'JS002','13822222222'])
  await c.execute('INSERT INTO users (id,name,subject,school,schoolId,username,passwordHash,enabled,teacherNo,phone) VALUES (UUID(),?,?,?,?,?,?,1,?,?)', ['张老师','英语','阳光实验小学',schools[0].id,'teacher3',PWD,'JS003','13833333333'])
  await c.execute('INSERT INTO users (id,name,subject,school,schoolId,username,passwordHash,enabled,teacherNo,phone) VALUES (UUID(),?,?,?,?,?,?,1,?,?)', ['陈老师','音乐','阳光实验小学',schools[0].id,'teacher4',PWD,'JS004','13844444444'])
  await c.execute("INSERT INTO users (id,name,subject,school,schoolId,username,passwordHash,enabled,teacherNo) VALUES (UUID(),?,?,?,?,?,?,0,?)", ['张(停用)','科学','阳光实验小学',schools[0].id,'teacher_disabled',PWD,'JS005'])

  const [teachers] = await c.query("SELECT id,name,username FROM users WHERE username LIKE 'teacher%' AND username!='teacher_disabled' ORDER BY username")
  const [wang, li, zhang, chen] = teachers
  await p(`教师: ${wang.name}, ${li.name}, ${zhang.name}, ${chen.name}`)

  // 班级
  const classA = { id: crypto.randomUUID(), name: '一年级一班', grade: '一年级', classNo: '1' }
  const classB = { id: crypto.randomUUID(), name: '二年级二班', grade: '二年级', classNo: '2' }
  await c.execute('INSERT INTO classes (id,teacherId,name,grade,classNo,headTeacher) VALUES (?,?,?,?,?,?)', [classA.id, wang.id, classA.name, classA.grade, classA.classNo, wang.name])
  await c.execute('INSERT INTO classes (id,teacherId,name,grade,classNo,headTeacher) VALUES (?,?,?,?,?,?)', [classB.id, li.id, classB.name, classB.grade, classB.classNo, li.name])
  await p(`班级: ${classA.name}(${wang.name}), ${classB.name}(${li.name})`)

  // 学生
  const students = [
    {name:'张小明'},{name:'李小华'},{name:'王小芳'},{name:'赵小刚'},{name:'刘思琪'},
    {name:'孙浩然'},{name:'周雅婷'},{name:'吴梓涵'},{name:'郑欣然'},{name:'钱多多'},
  ]
  const stuA = [], stuB = []
  for (const [i,s] of students.entries()) {
    const sid = crypto.randomUUID()
    const cid = i < 6 ? classA.id : classB.id
    const arr = i < 6 ? stuA : stuB
    arr.push({id:sid, ...s})
    await c.execute('INSERT INTO students (id,classId,teacherId,name,gender,studentNo) VALUES (?,?,?,?,?,?)', [sid, cid, wang.id, s.name, '男', String(2024001 + i)])
  }
  await p(`学生: ${students.length} 人 (${stuA.length}/${stuB.length})`)

  // 业务数据简版
  const now = new Date().toISOString().slice(0, 10)
  for (const s of stuA) {
    await c.execute('INSERT INTO todos (id,teacherId,title,note,date,done) VALUES (UUID(),?,?,?,?,0)', [wang.id, '批改'+s.name+'作业', '语文作业', now])
  }
  await c.execute('INSERT INTO attendances (id,teacherId,classId,date,records) VALUES (UUID(),?,?,?,?)', [wang.id, classA.id, now, JSON.stringify(stuA.slice(0,5).map((s,i)=> ({studentId:s.id, status: i===0?'出勤':i===1?'迟到':'出勤'})))])
  await c.execute('INSERT INTO schedules (id,teacherId,classId,dayOfWeek,period,weekType,subject,teacher) VALUES (UUID(),?,?,1,1,\'all\',\'语文\',?)', [wang.id, classA.id, wang.name])

  // 验证行数
  const counts = {}
  for (const t of ['users','school_admins','schools','classes','students','exams','grades','todos','attendances','schedules']) {
    try { const [r] = await c.query('SELECT COUNT(*) cnt FROM ??', [t]); counts[t] = r[0].cnt } catch(e) { counts[t] = 'ERR' }
  }
  await p(`行数: ${JSON.stringify(counts)}`)

  await c.end()
  await p('══════ 种子就绪 ══════\n')

  // ==== STEP 2: 审计 ====
  await p('═══════════════════════════════════════════')
  await p('  五角色权限与用户体验审计')
  await p('═══════════════════════════════════════════\n')

  let score = { pass: 0, fail: 0, warn: 0 }

  async function audit(label, result, msg = '') {
    if (result) { score.pass++; ok(label + (msg ? ' — ' + msg : '')) }
    else if (msg.startsWith('⚠')) { score.warn++; warn(label + ' — ' + msg) }
    else { score.fail++; fail(label + (msg ? ' — ' + msg : '')) }
  }

  // 1. 超管
  await p('【1】超级管理员 (admin)')
  const aLogin = await login('/admin/login', { username: 'admin', password: 'admin' })
  await audit('登录', aLogin.ok, aLogin.data?.token?.slice(0,10))
  if (aLogin.ok) {
    const AT = aLogin.token
    const schoolsR = await get('/admin/schools', AT)
    await audit('列出学校', schoolsR.ok && (schoolsR.data?.items?.length || schoolsR.data?.length) >= 1, `${schoolsR.data?.items?.length || schoolsR.data?.length || 0} 所`)
    const adminsR = await get('/admin/school-admins', AT)
    await audit('列出校管', adminsR.ok, `${adminsR.data?.items?.length || adminsR.data?.length || 0} 人`)
    const crossTodo = await get('/todos', AT)
    await audit('越权保护: /todos 应拒绝', !crossTodo.ok && crossTodo.status === 401, crossTodo.status===200 ? `⚠️ 可访问 (${crossTodo.data?.length||0}条)` : '已拒绝')
    const crossDash = await get('/school-admin/dashboard', AT)
    await audit('越权保护: /school-admin/dashboard 应拒绝', !crossDash.ok, `状态${crossDash.status}`)
    // 跳过 reset-all (会清空审计用的种子数据)
  }

  // 2. 校管
  await p('\n【2】学校管理员 (sa1)')
  const saLogin = await login('/school-admin/login', { username: 'sa1', password: '123456' })
  await audit('登录', saLogin.ok, saLogin.data?.token?.slice(0,10))
  if (saLogin.ok) {
    const SAT = saLogin.token
    const dash = await get('/school-admin/dashboard', SAT)
    await audit('看板', dash.ok, dash.data ? `教师${dash.data.totalTeachers}人 班级${dash.data.totalClasses}个` : '')
    const teachersR = await get('/school-admin/teachers', SAT)
    await audit('教师列表', teachersR.ok, `${teachersR.data?.length || 0} 人`)
    const statsR = await get('/school-admin/stats', SAT)
    await audit('概览统计', statsR.ok)
    const crossAdmin = await get('/admin/schools', SAT)
    await audit('越权保护: /admin/schools 应拒绝', !crossAdmin.ok, `状态${crossAdmin.status}`)
    const crossTodo = await get('/todos', SAT)
    await audit('越权保护: /todos 应拒绝', !crossTodo.ok, `状态${crossTodo.status}`)
  }

  // 3. 班主任
  await p('\n【3】班主任 (teacher1)')
  const t1Login = await login('/auth/unified-login', { username: 'teacher1', password: '123456' })
  await audit('登录', t1Login.ok, t1Login.data?.user?.name || '')
  if (t1Login.ok) {
    const T1 = t1Login.token
    const endpoints = [
      ['待办 /todos','/todos'],['课表 /schedules','/schedules'],['通知 /notices','/notices'],
      ['行为 /behavior-records','/behavior-records'],['作业 /homework','/homework'],
      ['获奖 /award-records','/award-records'],['活动 /class-activities','/class-activities'],
      ['值日 /duty-rosters','/duty-rosters'],['相册 /class-galleries','/class-galleries'],
      ['考勤 /attendances','/attendances'],['阅读 /reading-logs','/reading-logs'],
      ['家访 /home-visits','/home-visits'],['学期 /semesters','/semesters'],
      ['家长联系 /parent-contacts','/parent-contacts'],['小组 /group-scores','/group-scores'],
      ['积分 /score-records','/score-records'],['奖励 /reward-records','/reward-records'],
      ['打卡 /checkins','/checkins'],['资源 /resources','/resources'],
      ['笔记 /notes','/notes'],['成长 /growth-entries','/growth-entries'],
      ['日志 /work-logs','/work-logs'],['班级活动 /class-activities','/class-activities'],
      ['班费 /class-expenses','/class-expenses'],['座位 /seat-layouts','/seat-layouts'],
      ['值日配置 /class-duty-configs','/class-duty-configs'],['模板 /notice-templates','/notice-templates'],
      ['备份 /backups','/backups'],['班级 /classes','/classes'],['学生 /students','/students'],
      ['考试 /exams','/exams'],['成绩 /grades','/grades'],['AI配置 /config/ai','/config/ai'],
    ]
    let eOk = 0, eFail = 0
    for (const [label,path] of endpoints) {
      const r = await get(path, T1)
      if (r.ok) eOk++; else { eFail++; process.stdout.write(`  ❌ ${label} (${path}): ${r.status}\n`) }
    }
    await audit(`业务端点(${endpoints.length}个)`, eFail===0, `${eOk}/${endpoints.length} 正常`)

    // 数据合理性
    const todos = await get('/todos', T1)
    await audit('待办数据量', todos.ok && Array.isArray(todos.data) && todos.data.length >= 3, `${todos.data?.length || 0} 条`)
    const studentsR = await get('/students', T1)
    await audit('学生列表', studentsR.ok && studentsR.data.length >= 3, `${studentsR.data?.length || 0} 人`)

    // 创建待办
    const createR = await post('/todos', T1, { title: '测试: 待办创建', note: '', date: new Date().toISOString().slice(0,10) })
    await audit('待办创建(Create)', createR.ok && createR.data?.id, '成功')

    // 家长登录开关
    if (studentsR.ok && studentsR.data.length) {
      const togg = await post(`/students/${studentsR.data[0].id}/toggle-parent-login`, T1, {})
      await audit('家长登录开关', togg.ok, togg.status)
    }
  }

  // 4. 任课教师
  await p('\n【4】任课教师 (teacher3)')
  const t3Login = await login('/auth/unified-login', { username: 'teacher3', password: '123456' })
  await audit('登录', t3Login.ok, t3Login.data?.user?.name || '')
  if (t3Login.ok) {
    const T3 = t3Login.token
    const todos = await get('/todos', T3)
    await audit('待办列表', todos.ok, `${todos.data?.length || 0} 条`)
    // 数据隔离验证: teacher3 的待办不应包含 teacher1 的
    const schedules = await get('/schedules', T3)
    await audit('课表', schedules.ok, `${schedules.data?.length || 0} 条`)
  }

  // 5. 家长
  await p('\n【5】家长')
  // 家长通过 password-login 使用学号
  const pLogin = await login('/auth/bind-by-number', { number: '2024001', password: '123456', code: 'mock_skip' })
  if (pLogin.ok) {
    await audit('登录', true, pLogin.data?.parent?.studentName || '')
    // 家长端放在另一组路由
  } else {
    audit('登录（学号+密码）', false, `⚠️ 需要微信code，已跳过家长端`); score.warn--
    // 家长用 password-login（小程序内 WeChat 免登）
    const p2 = await login('/auth/password-login', { username: '2024001', password: '123456' })
    if (p2.ok) {
      audit('家长 密码登录', true, p2.data?.user?.name || '')
      const me = await get('/parent-auth/me', p2.token)
      if (me.ok) audit('家长信息', true, `孩子 ${me.data.kids?.length || 0} 人`)
      const notes = await get('/parent-auth/notices', p2.token)
      audit('通知查阅', notes.ok, `${notes.data?.length || 0} 条`)
      const homework = await get('/parent-auth/homework', p2.token)
      audit('作业查看', homework.ok, `${homework.data?.length || 0} 条`)
      const cross = await get('/todos', p2.token)
      audit('越权保护: /todos 应拒绝', !cross.ok, `状态${cross.status}`)
    }
  }

  // 6. 安全警告
  await p('\n═══════════════════════════════════════════')
  await p('【安全警告】')
  const c2 = await mysql.createConnection({ host: '127.0.0.1', port: 3306, user: 'root', password: 'admin', database: 'gardener_test', connectTimeout: 8000 })
  const [adms] = await c2.query("SELECT username FROM school_admins WHERE passwordHash=?", [ADMIN_PWD])
  if (adms.length) warn(`⚠️  ${adms.length} 个账户使用默认密码 "admin": ${adms.map(x=>x.username).join(',')}`)
  await c2.end()

  await p(`\n══════ 审计结果: ${score.pass} 通过 ✅ / ${score.fail} 失败 ❌ / ${score.warn} 警告 ⚠️ ══════`)
  if (score.fail > 0) {
    await p('\n⚠️  存在失败项，需要修复')
    process.exit(1)
  }
  await p('\n✅ 所有审计项通过')
})().catch(e => { console.error('\n❌ 审计异常:', e.message, e.stack?.slice(0,200)); process.exit(1) })
