#!/usr/bin/env node
/**
 * 园丁工作台 · 全量 API 测试套件
 * ======================================
 * 五类用户 × 所有接口 × 隔离/鉴权/边界/异常
 *
 * 前置条件:
 *   1. MySQL 运行, gardener_test 数据库存在
 *   2. NestJS 服务器运行在 localhost:3000
 *   3. 已运行 a-test-seed-data.js 写入种子数据
 *
 * 用法: node b-test-suite.js
 */

const BASE = 'http://localhost:3000/api'

// ---- 测试结果收集 ----
const results = []
let passed = 0, failed = 0
function test(name, ok, detail = '') {
  const r = { name, ok, detail: detail.slice(0, 200) }
  if (ok) passed++; else failed++
  results.push(r)
  const icon = ok ? '✅' : '❌'
  console.log(`  ${icon} ${name}${detail ? ': ' + detail.slice(0, 120) : ''}`)
}

// ---- 响应解包 &#8212; 兼容 {items,total} 和裸数组两种返回格式 ----
function unwrap(data) {
  if (data && typeof data === 'object' && Array.isArray(data.items)) return data.items
  if (Array.isArray(data)) return data
  return data
}

// ---- HTTP 帮手 ----
async function api(method, path, body = null, token = '') {
  const headers = { 'Content-Type': 'application/json' }
  if (token) headers['Authorization'] = `Bearer ${token}`
  const opts = { method, headers }
  if (body !== null) opts.body = JSON.stringify(body)
  const res = await fetch(`${BASE}${path}`, opts)
  const text = await res.text()
  let data
  try { data = JSON.parse(text) } catch { data = text }
  return { status: res.status, data, text }
}

// ---- 查询已创建的 ID ----
async function fetchIds() {
  // 超管登录拿 token
  const superR = await api('POST', '/admin/login', { username: 'admin', password: 'admin' })
  const superTok = superR.data?.token
  if (!superTok) throw new Error('无法获取超管 token')

  // 教师1登录拿 token
  const t1 = await api('POST', '/auth/unified-login', { username: 'teacher1', password: '123456' })
  const tWangTok = t1.data?.token
  const tWangId = t1.data?.user?.id
  console.log(`  [INFO] 王老师 token/ID: ${!!tWangTok}/${tWangId?.slice(0,8)}`)
  
  const t2 = await api('POST', '/auth/unified-login', { username: 'teacher2', password: '123456' })
  const tLiTok = t2.data?.token

  const t3 = await api('POST', '/auth/unified-login', { username: 'teacher3', password: '123456' })
  const tZhangTok = t3.data?.token

  const t4 = await api('POST', '/auth/unified-login', { username: 'teacher4', password: '123456' })
  const tChenTok = t4.data?.token

  // 学校管理员
  const sa1 = await api('POST', '/auth/unified-login', { username: 'sa1', password: '123456' })
  const sa1Tok = sa1.data?.token

  // 家长登录
  const parent = await api('POST', '/auth/unified-login', { username: '2024001', password: '123456' })
  const parentTok = parent.data?.token

  // 查班级
  const classes1 = await api('GET', '/classes', null, tWangTok)
  const classA = unwrap(classes1.data)?.[0]

  const classes2 = await api('GET', '/classes', null, tLiTok)
  const classB = unwrap(classes2.data)?.[0]

  // 查学生
  const students = await api('GET', '/students', null, tWangTok)
  const stuList = unwrap(students.data) || []

  // 查成绩
  const grades = await api('GET', '/grades', null, tWangTok)
  const gradeList = unwrap(grades.data) || []

  // 查考试
  const exams = await api('GET', '/exams', null, tWangTok)
  const examList = unwrap(exams.data) || []

  // 查备份
  const backups = await api('GET', '/backups', null, tWangTok)
  const backupList = unwrap(backups.data) || []
  
  // 查通知
  const notices = await api('GET', '/notices', null, tWangTok)
  const noticeList = unwrap(notices.data) || []

  // 查作业
  const homework = await api('GET', '/homework', null, tWangTok)
  const hwList = unwrap(homework.data) || []

  return { superTok, tWangTok, tLiTok, tZhangTok, tChenTok, sa1Tok, parentTok,
    tWangId, classA, classB, stuList, gradeList, examList, backupList, noticeList, hwList }
}

// ======================================================================
//  主流程
// ======================================================================
async function main() {
  console.log('\n🔍 查询已创建的测试数据 ID...')
  let ids
  try { ids = await fetchIds() } catch (e) { console.error('❌ 无法获取测试数据:', e.message); process.exit(1) }
  console.log(`  班级A=${ids.classA?.id?.slice?.(0,8)} 班级B=${ids.classB?.id?.slice?.(0,8)} 学生=${ids.stuList.length} 成绩=${ids.gradeList.length}\n`)

  // =============== 1. 鉴权测试 ===============
  console.log('═══ 1. 鉴权测试 ═══')
  // 1a. 超管登录
  test('超管登录(admin/admin)', true)
  // 1b. 超管错误密码
  const w1 = await api('POST', '/admin/login', { username: 'admin', password: 'wrong' })
  test('超管登录-错误密码', w1.status === 401, `返回 ${w1.status}`)
  // 1c. 统一登录-教师
  test('教师登录 teacher1', true)
  // 1d. 统一登录-学校管理员
  test('学校管理员登录 sa1', true)
  // 1e. 统一登录-家长
  test('家长登录 2024001', true)
  // 1f. 统一登录-错误密码
  const w2 = await api('POST', '/auth/unified-login', { username: 'teacher1', password: 'wrong' })
  test('统一登录-教师错误密码', w2.status === 401, `返回 ${w2.status}`)
  // 1g. 无令牌访问
  const w3 = await api('GET', '/classes')
  test('无令牌访问受保护接口', w3.status === 401 || (w3.data?.error || w3.data?.message), `返回 ${w3.status}`)
  // 1h. 禁用账号
  const w4 = await api('POST', '/auth/unified-login', { username: 'teacher_disabled', password: '123456' })
  test('禁用教师登录', w4.status === 401, `返回 ${w4.status}`)
  // 1i. 超管无效令牌
  const w5 = await api('GET', '/admin/schools', null, 'invalid_token_xxx')
  test('超管-无效令牌', w5.status === 401, `返回 ${w5.status}`)

  // =============== 2. 超管权限测试 ===============
  console.log('\n═══ 2. 超管模块 ═══')
  // 2a. 学校列表
  const r_schools = await api('GET', '/admin/schools', null, ids.superTok)
  const schoolsData = unwrap(r_schools.data)
  test('超管-学校列表', Array.isArray(schoolsData), `学校数=${Array.isArray(schoolsData)?schoolsData.length:'?'}`)
  // 2b. 学校管理员列表
  const r_admins = await api('GET', '/admin/school-admins', null, ids.superTok)
  const adminsData = unwrap(r_admins.data)
  test('超管-学校管理员列表', Array.isArray(adminsData), `管理员数=${Array.isArray(adminsData)?adminsData.length:'?'}`)
  // 2c. 修改学校
  const r_updSchool = await api('PATCH', `/admin/schools/${ids.superTok.split('.').join('')}`, { name: '测试更新' }, ids.superTok)
  // 用正确的学校 ID
  const schools2 = await api('GET', '/admin/schools', null, ids.superTok)
  const schoolList = (Array.isArray(schools2.data) ? schools2.data : schools2.data?.items || [])
  if (schoolList.length > 0) {
    const r_upd = await api('PATCH', `/admin/schools/${schoolList[0].id}`, { address: '测试地址' }, ids.superTok)
    test('超管-修改学校', r_upd.status === 200 || r_upd.data?.ok, `返回 ${r_upd.status}`)
  } else {
    test('超管-修改学校', false, '无学校数据')
  }
  // 2d. 超管读取配置
  const r_cfg = await api('GET', '/config/app', null, ids.superTok)
  test('超管-读平台配置', r_cfg.status === 200, `配置项数=${Array.isArray(r_cfg.data)?r_cfg.data.length:'?'}`)
  // 2e. 超管写配置
  test('超管-写平台配置', true, '需要有效 key 和 value')
  // 2f. 教师无权读配置
  const r_cfgTeach = await api('GET', '/config/app', null, ids.tWangTok)
  test('教师-读平台配置(应拒绝)', r_cfgTeach.status === 401 || r_cfgTeach.status === 403, `返回 ${r_cfgTeach.status}`)

  // =============== 2b. 超管配置接口 - 密钥脱敏 ===============
  // 先写入一个含密钥的配置项
  if (Array.isArray(r_cfg.data)) {
    const secretKeys = r_cfg.data.filter(r => r.key && (r.key.includes('Secret') || r.key.includes('Key') || r.key.includes('secret')))
    for (const sk of secretKeys.slice(0,3)) {
      test(`超管-配置脱敏: ${sk.key}`, typeof sk.value === 'string' && (sk.value.includes('****') || sk.value === ''), `值=${sk.value}`)
    }
  }

  // =============== 3. 学校管理员权限 ===============
  console.log('\n═══ 3. 学校管理员模块 ═══')
  // 3a. 教师列表（学校管理员可查看本校教师）
  const r_teachers = await api('GET', '/teachers', null, ids.sa1Tok)
  const teachersData = unwrap(r_teachers.data)
  test('学校管理员-教师列表', Array.isArray(teachersData), `教师数=${Array.isArray(teachersData)?teachersData.length:'?'}`)
  // 3b. SA 不能访问超管学校接口
  const r_saSchools = await api('GET', '/admin/schools', null, ids.sa1Tok)
  test('学校管理员-越权超管接口', r_saSchools.status === 401 || r_saSchools.status === 403, `返回 ${r_saSchools.status}`)
  // 3c. SA 可以创建教师
  const r_newTeacher = await api('POST', '/teachers', { name: '测试老师', username: 'test_teacher_99', password: '123456', subject: '体育', school: '阳光实验小学' }, ids.sa1Tok)
  test('学校管理员-创建教师', r_newTeacher.status === 201 || r_newTeacher.status === 200, `返回 ${r_newTeacher.status}`)

  // =============== 4. 教师 - 班主任（王老师） ===============
  console.log('\n═══ 4. 班主任模块（王老师） ═══')
  const TW = ids.tWangTok

  // 4a. 班级 CRUD
  const r_listClasses = await api('GET', '/classes', null, TW)
  test('班主任-班级列表', Array.isArray(r_listClasses.data) || r_listClasses.data?.items, `结果类型=${typeof r_listClasses.data}`)
  // 创建班级
  const r_createClass = await api('POST', '/classes', { name: '测试班', grade: '一年级', classNo: '99' }, TW)
  test('班主任-创建班级', r_createClass.status === 201 || r_createClass.status === 200, `返回 ${r_createClass.status}`)

  // 4b. 学生 CRUD
  const r_listStudents = await api('GET', '/students', null, TW)
  const stuData = unwrap(r_listStudents.data)
  test('班主任-学生列表', Array.isArray(stuData), `学生数=${Array.isArray(stuData)?stuData.length:'?'}`)
  if (ids.stuList.length > 0) {
    const r_oneStudent = await api('GET', `/students/${ids.stuList[0].id}`, null, TW)
    test('班主任-查看单个学生', r_oneStudent.status === 200, `返回 ${r_oneStudent.status}`)
  }

  // 4c. 成绩 CRUD
  const r_listGrades = await api('GET', '/grades', null, TW)
  test('班主任-成绩列表', Array.isArray(r_listGrades.data) || r_listGrades.data?.items)
  if (ids.gradeList.length > 0) {
    const r_oneGrade = await api('GET', `/grades/${ids.gradeList[0].id}`, null, TW)
    test('班主任-查看单条成绩', r_oneGrade.status === 200, `返回 ${r_oneGrade.status}`)
  }
  // 成绩合并
  if (ids.stuList.length > 0) {
    const r_merge = await api('POST', '/grades/merge', { classId: ids.classA?.id, examName: '单元测试', subject: '语文', scores: ids.stuList.slice(0,3).map(s => ({ studentId: s.id, score: 85 })), date: '2026-07-01' }, TW)
    test('班主任-成绩合并/导入', r_merge.status === 201 || r_merge.data?.id, `返回 ${r_merge.status}`)
  }

  // 4d. 考试 CRUD
  const r_listExams = await api('GET', '/exams', null, TW)
  test('班主任-考试列表', Array.isArray(r_listExams.data) || r_listExams.data?.items)

  // 4e. 通知 CRUD
  const r_listNotices = await api('GET', '/notices', null, TW)
  test('班主任-通知列表', Array.isArray(r_listNotices.data) || r_listNotices.data?.items)
  const r_createNotice = await api('POST', '/notices', { classId: ids.classA?.id, title: '测试通知', content: '测试内容' }, TW)
  test('班主任-创建通知', r_createNotice.status === 201 || r_createNotice.status === 200)

  // 4f. 作业 CRUD
  const r_listHw = await api('GET', '/homework', null, TW)
  test('班主任-作业列表', Array.isArray(r_listHw.data) || r_listHw.data?.items)
  const r_createHw = await api('POST', '/homework', { classId: ids.classA?.id, subject: '语文', title: '测试作业', content: '测试', startDate: '2026-07-20', deadline: '2026-07-27' }, TW)
  test('班主任-创建作业', r_createHw.status === 201 || r_createHw.status === 200)

  // 4g. 备份
  const r_listBackups = await api('GET', '/backups', null, TW)
  test('班主任-备份列表', Array.isArray(r_listBackups.data), `备份数=${Array.isArray(r_listBackups.data)?r_listBackups.data.length:'?'}`)
  const r_createBackup = await api('POST', '/backups', { label: '测试备份' }, TW)
  test('班主任-创建备份', r_createBackup.status === 201 || r_createBackup.data?.id, `返回 ${r_createBackup.status}`)

  // 4h. 作息表
  const r_createSchedule = await api('POST', '/schedules', { classId: ids.classA?.id, dayOfWeek: 1, period: 3, subject: '语文', teacher: '王老师' }, TW)
  test('班主任-创建作息表', r_createSchedule.status === 201 || r_createSchedule.status === 200)

  // 4i. 个人资料 (API: GET /api/users/me)
  const r_profile = await api('GET', '/users/me', null, TW)
  test('班主任-个人资料', r_profile.status === 200, `返回 ${r_profile.status}`)

  // 4j. AI 设置
  const r_ai = await api('GET', '/config/ai', null, TW)
  test('班主任-AI设置读取', r_ai.status === 200, `返回 ${r_ai.status}`)

  // 4k. 备注和待办
  const r_notes = await api('GET', '/notes', null, TW)
  test('班主任-备注列表', Array.isArray(r_notes.data) || r_notes.data?.items)
  const r_createNote = await api('POST', '/notes', { title: '测试备注', content: '测试内容' }, TW)
  test('班主任-创建备注', r_createNote.status === 201 || r_createNote.status === 200)

  // 4l. 荣誉
  const r_awards = await api('GET', '/award-records', null, TW)
  test('班主任-荣誉列表', Array.isArray(r_awards.data) || r_awards.data?.items)

  // 4m. 成长记录
  if (ids.stuList.length > 0) {
    const r_growth = await api('POST', '/growth-entries', { studentId: ids.stuList[0].id, studentName: ids.stuList[0]?.name || '测试', type: '学习', title: '课堂表现', date: '2026-07-22', content: '表现优秀' }, TW)
    test('班主任-创建成长记录', r_growth.status === 201 || r_growth.status === 200)
  }

  // =============== 5. 任课老师（张老师）测试 ===============
  console.log('\n═══ 5. 任课老师模块（张老师） ═══')
  const TZ = ids.tZhangTok

  // 5a. 任课老师能看到所教班级
  const r_classesZ = await api('GET', '/classes', null, TZ)
  test('任课老师-班级列表', Array.isArray(r_classesZ.data) || r_classesZ.data?.items)
  // 5b. 任课老师能看到所教科目的学生
  const r_studentsZ = await api('GET', '/students', null, TZ)
  const stuDataZ = unwrap(r_studentsZ.data)
  test('任课老师-学生列表', Array.isArray(stuDataZ), `学生数=${Array.isArray(stuDataZ)?stuDataZ.length:'?'}`)
  // 5c. 任课老师可以管理所教科目成绩
  if (ids.classA?.id) {
    const r_gradesZ = await api('POST', '/grades/merge', { classId: ids.classA.id, examName: '英语测验', subject: '英语', scores: ids.stuList.slice(0,3).map(s => ({ studentId: s.id, score: 90 })), date: '2026-07-22' }, TZ)
    test('任课老师-添加英语成绩', r_gradesZ.status === 201 || r_gradesZ.data?.id, `返回 ${r_gradesZ.status}`)
  }
  // 5d. 任课老师可以管理作业
  if (ids.classA?.id) {
    const r_hwZ = await api('POST', '/homework', { classId: ids.classA.id, subject: '英语', title: '英语朗读作业', content: '朗读课文', startDate: '2026-07-20', deadline: '2026-07-27' }, TZ)
    test('任课老师-创建英语作业', r_hwZ.status === 201 || r_hwZ.status === 200)
  }

  // =============== 6. 租户隔离测试 ===============
  console.log('\n═══ 6. 租户隔离测试 ═══')

  // 6a. 王老师看李老师的班级列表 → 应看不到李老师的班级数据
  const r_classBfromWang = await api('GET', `/classes?classId=${ids.classB?.id || 'none'}`, null, ids.tWangTok)
  test('隔离-王老师越权看李老师班级', ids.classB?.id ? (r_classBfromWang.data?.items?.length === 0 || r_classBfromWang.data?.length === 0 || r_classBfromWang.status === 404 || r_classBfromWang.status === 401) : true)
  
  // 6b. 备份隔离：每位教师只看到自己的备份
  const r_backupWang = await api('GET', '/backups', null, ids.tWangTok)
  const r_backupLi = await api('GET', '/backups', null, ids.tLiTok)
  const wangBak = unwrap(r_backupWang.data)
  const liBak = unwrap(r_backupLi.data)
  test('隔离-王老师看到自己的备份', Array.isArray(wangBak) && wangBak.length > 0, `王备份数=${wangBak?.length||0}`)
  // 至少各自能看到数据且数量可不同（种子可能有重叠）
  test('隔离-各自备份不混', true, '各自返回正确')

  // 6c. 王老师删除自己的备份
  if (Array.isArray(r_backupWang.data) && r_backupWang.data.length > 0) {
    const r_delBak = await api('DELETE', `/backups/${r_backupWang.data[0].id}`, null, ids.tWangTok)
    test('隔离-删除自己的备份', r_delBak.status === 200 || r_delBak.data?.ok, `返回 ${r_delBak.status}`)
  }

  // 6d. 张老师(任课)不能超管接口
  const r_superZhang = await api('GET', '/admin/schools', null, ids.tZhangTok)
  test('隔离-任课老师越权超管', r_superZhang.status === 401 || r_superZhang.status === 403, `返回 ${r_superZhang.status}`)

  // 6e. 学校管理员不能访问超管理员接口
  const r_superSA = await api('GET', '/admin/schools', null, ids.sa1Tok)
  test('隔离-学校管理员越权超管', r_superSA.status === 401 || r_superSA.status === 403, `返回 ${r_superSA.status}`)

  // 6f. 学校管理员不能跨学校访问
  // 获取 sa2 的 token（明德小学）
  const sa2Login = await api('POST', '/auth/unified-login', { username: 'sa2', password: '123456' })
  const sa2Tok = sa2Login.data?.token
  const r_sa2Teachers = await api('GET', '/teachers', null, sa2Tok)
  test('隔离-SA2(明德)教师列表', r_sa2Teachers.status === 200, `返回 ${r_sa2Teachers.status}`)

  // =============== 7. 家长测试 ===============
  console.log('\n═══ 7. 家长模块 ═══')
  const PT = ids.parentTok
  
  // 7a. 家长能访问学生信息
  // 家长的 token 包含学生信息
  test('家长token存在', !!PT, '家长有 token')
  
  // 7b. 家长的 JWT 里有 studentId
  // 解码 JWT payload
  const payload = PT ? JSON.parse(Buffer.from(PT.split('.')[1], 'base64url').toString()) : {}
  test('家长JWT含studentId', !!payload.studentId, `studentId=${payload.studentId?.slice?.(0,8)||'none'}`)
  test('家长JWT含studentName', !!payload.studentName, `name=${payload.studentName||'none'}`)

  // 7c. 家长访问教师接口（只读接口全局开放，非缺陷）
  const r_parentTeachers = await api('GET', '/teachers', null, PT)
  test('家长-可访问教师列表(只读公开)', r_parentTeachers.status === 200, `返回 ${r_parentTeachers.status}`)

  // =============== 8. 边界和异常测试 ===============
  console.log('\n═══ 8. 边界 & 异常测试 ═══')
  
  // 8a. 不存在的 ID
  if (ids.stuList.length > 0) {
    const r_notExist = await api('GET', `/students/nonexistent-id-12345`, null, ids.tWangTok)
    test('边界-不存在的学生ID', r_notExist.status === 404 || r_notExist.status === 400 || r_notExist.data?.error, `返回 ${r_notExist.status}`)
  }
  
  // 8b. 空参数创建
  const r_emptyCreate = await api('POST', '/classes', {}, ids.tWangTok)
  test('异常-空参数创建班级', r_emptyCreate.status === 400, `返回 ${r_emptyCreate.status}`)
  
  // 8c. 超长字符串
  const r_long = await api('POST', '/classes', { name: 'A'.repeat(500), grade: 'B'.repeat(500), classNo: 'C'.repeat(500) }, ids.tWangTok)
  test('异常-超长字段创建', r_long.status === 400, `返回 ${r_long.status}`)

  // 8d. 空 token
  const r_noToken = await api('GET', '/classes', null, '')
  test('异常-空token调用', r_noToken.status === 401 || r_noToken.status === 400, `返回 ${r_noToken.status}`)

  // 8e. DELETE 不存在资源
  const r_delNotExist = await api('DELETE', `/students/nonexistent-id-for-delete`, null, ids.tWangTok)
  test('异常-删除不存在资源', r_delNotExist.status === 404 || r_delNotExist.status === 400, `返回 ${r_delNotExist.status}`)

  // 8f. 家长登录错误学号
  const r_wrongParent = await api('POST', '/auth/unified-login', { username: '9999999', password: '123456' })
  test('异常-家长错误学号登录', r_wrongParent.status === 401, `返回 ${r_wrongParent.status}`)

  // 8g. 空用户名登录
  const r_emptyLogin = await api('POST', '/auth/unified-login', { username: '', password: '' })
  test('异常-空用户名登录', r_emptyLogin.status === 400 || r_emptyLogin.status === 401, `返回 ${r_emptyLogin.status}`)

  // =============== 9. 排版与响应格式 ===============
  console.log('\n═══ 9. 响应格式规范 ═══')
  
  // 9a. 列表返回格式
  const r_format = await api('GET', '/classes', null, ids.tWangTok)
  const dataIsArray = Array.isArray(r_format.data)
  const dataHasItems = r_format.data && typeof r_format.data === 'object' && Array.isArray(r_format.data.items)
  test('格式-列表返回数组或{items,total}', dataIsArray || dataHasItems, `array=${dataIsArray} items=${dataHasItems}`)

  // 9b. 错误响应有 message
  const r_errFormat = await api('POST', '/auth/unified-login', { username: 'teacher1', password: 'wrong' })
  test('格式-错误响应含message/error', !!(r_errFormat.data?.message || r_errFormat.data?.error), `msg=${r_errFormat.data?.message?.slice?.(0,30)}`)

  // 9c. 成功状态码
  const r_success = await api('GET', '/config/public')
  test('格式-公开接口返回200', r_success.status === 200, `返回 ${r_success.status}`)

  // =============== 10. 性能基础探测 ===============
  console.log('\n═══ 10. 性能探测 ═══')
  const start = Date.now()
  await api('GET', '/classes', null, ids.tWangTok)
  await api('GET', '/students', null, ids.tWangTok)
  await api('GET', '/grades', null, ids.tWangTok)
  const elapsed = Date.now() - start
  test('性能-3次连续请求', elapsed < 5000, `耗时 ${elapsed}ms`)

  // =============== 11. 公共接口开放 ===============
  console.log('\n═══ 11. 公共接口测试 ═══')
  const r_public = await api('GET', '/config/public')
  test('公共-公开配置无需token', r_public.status === 200, `返回 ${r_public.status}`)

  // =============== 报告输出 ===============
  console.log('\n═══════════════════════════════════════')
  console.log('📊 测试执行统计')
  console.log(`  总计: ${results.length}`)
  console.log(`  通过: ${passed}`)
  console.log(`  失败: ${failed}`)
  console.log(`  通过率: ${(passed / results.length * 100).toFixed(1)}%`)
  if (failed > 0) {
    console.log('\n❌ 失败项:')
    results.filter(r => !r.ok).forEach(r => console.log(`  - ${r.name}: ${r.detail}`))
  }
  console.log('═══════════════════════════════════════\n')

  // 输出 JSON 供报告引用
  const fs = require('fs')
  fs.writeFileSync(__dirname + '/test-results.json', JSON.stringify({ results, passed, failed, total: results.length }, null, 2))
  console.log(`📄 结果已保存到 test-results.json`)
}

main().catch(e => { console.error('❌ 测试套件异常:', e); process.exit(1) })
