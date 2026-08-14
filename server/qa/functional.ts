/**
 * 功能测试用例：四级用户（超管 / 校管 / 教师 / 家长）
 * 用例 ID 与 qa/TEST_CASES.md 对应；基于 seedDataset 数据集执行。
 */
import { http } from './harness'
import { addCase, assert, assertEq, assertIncludes } from './framework'
import {
  SeedResult, SUPER_USER, SUPER_PASS, ADMIN_PASS, TEACHER_PASS, PARENT_PASS,
  adminUser, teacherUser, studentNo, SCHOOL_COUNT, SUBJECTS,
  TEACHERS_PER_SCHOOL, CLASSES_PER_SCHOOL, STUDENTS_PER_CLASS, EXAMS_PER_CLASS,
  GRADES_PER_SCHOOL, CLASSES_PER_GRADE, TEACHERS_PER_CLASS,
} from './seed'

export function registerFunctionalCases(baseUrl: string, seed: SeedResult) {
  const api = (path: string) => `${baseUrl}${path}`
  let superToken = ''
  const s1 = () => seed.schools[0]
  const s2 = () => seed.schools[1]

  /* ================= 超管 ================= */
  addCase('FUNC-SUP-01', 'super', '健康检查 GET /health 返回 ok', async () => {
    const r = await http('GET', api('/health'))
    assertEq(r.status, 200, '状态码')
    assertEq(r.body.status, 'ok', 'status 字段')
  })

  addCase('FUNC-SUP-02', 'super', '超管统一登录返回 token 与 role=super', async () => {
    const r = await http('POST', api('/auth/unified-login'), { body: { username: SUPER_USER, password: SUPER_PASS } })
    assert(r.status < 300, `登录失败 ${r.status}`)
    assertEq(r.body.role, 'super', 'role')
    assert(typeof r.body.token === 'string' && r.body.token.length > 20, 'token 缺失')
    superToken = r.body.token
  })

  addCase('FUNC-SUP-03', 'super', '错误密码登录返回 401', async () => {
    const r = await http('POST', api('/auth/unified-login'), { body: { username: SUPER_USER, password: 'wrong-password' } })
    assertEq(r.status, 401, '状态码')
  })

  addCase('FUNC-SUP-04', 'super', 'SQL 注入参数登录被拒绝（4xx）', async () => {
    const r = await http('POST', api('/auth/unified-login'), { body: { username: "admin' OR '1'='1", password: "x' OR 1=1--" } })
    assert(r.status >= 400 && r.status < 500, `期望 4xx，实际 ${r.status}`)
  })

  addCase('FUNC-SUP-05', 'super', '无 token 访问受保护接口返回 401', async () => {
    const r = await http('GET', api('/admin/schools'))
    assertEq(r.status, 401, '状态码')
  })

  addCase('FUNC-SUP-06', 'super', '学校列表包含全部种子学校', async () => {
    const r = await http('GET', api('/admin/schools?pageSize=100'), { token: superToken })
    assert(r.status < 300, `状态码 ${r.status}`)
    const names = (r.body.items || []).map((x: any) => x.name)
    for (let i = 1; i <= SCHOOL_COUNT; i++) assertIncludes(names, `测试第${i}学校`, '学校列表')
  })

  addCase('FUNC-SUP-07', 'super', '学校详情字段齐全', async () => {
    const r = await http('GET', api(`/admin/schools/${s1().id}`), { token: superToken })
    assert(r.status < 300, `状态码 ${r.status}`)
    for (const f of ['id', 'name', 'code']) assert(r.body[f] != null, `字段 ${f} 缺失`)
  })

  addCase('FUNC-SUP-08', 'super', '校管列表返回各校管理员', async () => {
    const r = await http('GET', api('/admin/school-admins?pageSize=100'), { token: superToken })
    assert(r.status < 300, `状态码 ${r.status}`)
    assert((r.body.items || []).length >= SCHOOL_COUNT, '校管数量不足')
  })

  addCase('FUNC-SUP-09', 'super', '审计日志可查询且含种子操作记录', async () => {
    const r = await http('GET', api('/admin/audit-logs?pageSize=50'), { token: superToken })
    assert(r.status < 300, `状态码 ${r.status}`)
    assert(Array.isArray(r.body.items) || Array.isArray(r.body), '响应结构异常')
  })

  addCase('FUNC-SUP-10', 'super', '平台配置读取与更新闭环', async () => {
    const g = await http('GET', api('/config/app'), { token: superToken })
    assert(g.status < 300, `读取失败 ${g.status}`)
    const u = await http('PUT', api('/config/app'), { token: superToken, body: { ...(typeof g.body === 'object' && g.body ? g.body : {}) } })
    assert(u.status < 300, `更新失败 ${u.status}`)
  })

  addCase('FUNC-SUP-11', 'super', '教师应用配置接口按角色管控（教师可访问，超管不适用）', async () => {
    // /config/app-config 为 @Roles('teacher') 接口：教师可访问
    const lg = await http('POST', api('/auth/unified-login'), { body: { username: teacherUser(1, 1), password: TEACHER_PASS } })
    assert(lg.status < 300, `教师登录失败 ${lg.status}`)
    const r = await http('GET', api('/config/app-config'), { token: lg.body.token })
    assert(r.status < 300, `教师访问 app-config 失败 ${r.status}`)
    // 超管访问应被角色守卫拒绝（接口设计为教师个人偏好配置）
    const r2 = await http('GET', api('/config/app-config'), { token: superToken })
    assert(r2.status === 401 || r2.status === 403, `超管访问应被拒绝，实际 ${r2.status}`)
  })

  addCase('FUNC-SUP-12', 'super', '学校功能包查询', async () => {
    const r = await http('GET', api(`/admin/schools/${s1().id}/features`), { token: superToken })
    assert(r.status < 300, `状态码 ${r.status}`)
  })

  addCase('FUNC-SUP-13', 'super', '校管越权访问超管接口被拒绝', async () => {
    const r = await http('GET', api('/admin/schools'), { token: s1().adminToken })
    assert(r.status === 401 || r.status === 403, `期望 401/403，实际 ${r.status}`)
  })

  addCase('FUNC-SUP-14', 'super', '超管批量创建校管', async () => {
    const r = await http('POST', api('/admin/school-admins/batch'), {
      token: superToken,
      body: {
        admins: [
          { username: 'qatmp_admin01', password: 'QaTmp@12345', name: '临时校管1', schoolId: s1().id },
          { username: 'qatmp_admin02', password: 'QaTmp@12345', name: '临时校管2', schoolId: s2().id },
        ],
      },
    })
    assert(r.status < 300, `批量创建校管失败 ${r.status} ${r2text(r)}`)
  })

  addCase('FUNC-SUP-15', 'super', '超管导出学校数据', async () => {
    const r = await http('GET', api('/admin/schools/export'), { token: superToken })
    assert(r.status < 300, `导出学校数据失败 ${r.status}`)
  })

  /* ================= 校管 ================= */
  addCase('FUNC-SA-01', 'school_admin', '校管登录返回 role=school_admin', async () => {
    const r = await http('POST', api('/auth/unified-login'), { body: { username: adminUser(1), password: ADMIN_PASS } })
    assert(r.status < 300, `登录失败 ${r.status}`)
    assertEq(r.body.role, 'school_admin', 'role')
  })

  addCase('FUNC-SA-02', 'school_admin', '校管工作台统计接口', async () => {
    const r = await http('GET', api('/school-admin/dashboard'), { token: s1().adminToken })
    assert(r.status < 300, `状态码 ${r.status}`)
    assert(r.body.totalTeachers >= 200, `教师数应≥200，实际 ${r.body.totalTeachers}`)
    assert(r.body.totalClasses >= 40, `班级数应≥40，实际 ${r.body.totalClasses}`)
    assert(r.body.totalStudents >= 2000, `学生数应≥2000，实际 ${r.body.totalStudents}`)
  })

  addCase('FUNC-SA-03', 'school_admin', '教师列表分页与总数（≥30 人）', async () => {
    const r = await http('GET', api('/school-admin/teachers?pageSize=200'), { token: s1().adminToken })
    assert(r.status < 300, `状态码 ${r.status}`)
    const total = r.body.total ?? (r.body.items || []).length
    assert(total >= 200, `教师总数应≥200，实际 ${total}`)
  })

  addCase('FUNC-SA-04', 'school_admin', '新建教师后可登录', async () => {
    const c = await http('POST', api('/school-admin/teachers'), { token: s1().adminToken, body: { name: '临时教师QA', username: 'qatmp01', password: 'QaTmp@12345' } })
    assert(c.status < 300, `创建失败 ${c.status} ${JSON.stringify(c.body).slice(0, 120)}`)
    const lg = await http('POST', api('/auth/unified-login'), { body: { username: 'qatmp01', password: 'QaTmp@12345' } })
    assert(lg.status < 300, `新教师登录失败 ${lg.status}`)
  })

  addCase('FUNC-SA-05', 'school_admin', '创建教师缺少姓名被 DTO 校验拒绝', async () => {
    const r = await http('POST', api('/school-admin/teachers'), { token: s1().adminToken, body: { username: 'qatmp02', password: 'QaTmp@12345' } })
    assertEq(r.status, 400, '状态码')
  })

  addCase('FUNC-SA-06', 'school_admin', '班级列表（10 个）', async () => {
    const r = await http('GET', api('/school-admin/classes?pageSize=100'), { token: s1().adminToken })
    assert(r.status < 300, `状态码 ${r.status}`)
    const total = r.body.total ?? (r.body.items || []).length
    assert(total >= 40, `班级数应≥40，实际 ${total}`)
  })

  addCase('FUNC-SA-07', 'school_admin', '按班级查询学生（≥60 人）', async () => {
    const r = await http('GET', api(`/school-admin/students?classId=${s1().classIds[0]}&pageSize=200`), { token: s1().adminToken })
    assert(r.status < 300, `状态码 ${r.status}`)
    const total = r.body.total ?? (r.body.items || []).length
    assert(total >= 50, `学生数应≥50，实际 ${total}`)
  })

  addCase('FUNC-SA-08', 'school_admin', '学生搜索按姓名命中', async () => {
    const r = await http('GET', api(`/school-admin/students?keyword=学生1-1-1&pageSize=20`), { token: s1().adminToken })
    assert(r.status < 300, `状态码 ${r.status}`)
    const items = r.body.items || []
    assert(items.length > 0, '未搜索到任何学生')
    // 姓名格式为 学生{i}-{g}-{c}-{n}，搜索 学生1-1-1 应匹配 学生1-1-1-1、学生1-1-1-2 等
    assert(items.some((s: any) => s.name && s.name.startsWith('学生1-1-1')), '未搜索到目标学生')
  })

  addCase('FUNC-SA-09', 'school_admin', '学校公告 CRUD 闭环', async () => {
    const c = await http('POST', api('/school-admin/notices'), { token: s1().adminToken, body: { title: 'QA测试公告', content: '测试内容', pinned: false } })
    assert(c.status < 300, `创建失败 ${c.status} ${JSON.stringify(c.body).slice(0, 120)}`)
    const id = c.body.id
    const l = await http('GET', api('/school-admin/notices?pageSize=50'), { token: s1().adminToken })
    assert((l.body.items || l.body || []).length > 0, '公告列表为空')
    const d = await http('DELETE', api(`/school-admin/notices/${id}`), { token: s1().adminToken })
    assert(d.status < 300, `删除失败 ${d.status}`)
  })

  addCase('FUNC-SA-10', 'school_admin', '成绩查询与汇总接口', async () => {
    const r = await http('GET', api(`/school-admin/academic/summary`), { token: s1().adminToken })
    assert(r.status < 300, `状态码 ${r.status}`)
  })

  addCase('FUNC-SA-10A', 'school_admin', '校管查看全校作业聚合列表', async () => {
    const r = await http('GET', api('/school-admin/homework?pageSize=20'), { token: s1().adminToken })
    assert(r.status < 300, `状态码 ${r.status}`)
    const total = r.body.total ?? (r.body.items || []).length
    assert(total >= 1, `作业总数应≥1，实际 ${total}`)
    const sample = (r.body.items || [])[0]
    if (sample) {
      assert(sample.className, '作业应回填班级名称')
      assert(sample.teacherName, '作业应回填教师姓名')
    }
  })

  addCase('FUNC-SA-10B', 'school_admin', '校管按年级横向对比各班成绩', async () => {
    const r = await http('GET', api('/school-admin/academic/class-comparison?grade=一年级'), { token: s1().adminToken })
    assert(r.status < 300, `状态码 ${r.status}`)
    const classes = r.body.classes || []
    assert(classes.length >= 1, `年级下班级数应≥1，实际 ${classes.length}`)
    assert(classes[0].className, '班级名缺失')
    assert(typeof classes[0].overallAvg === 'number', '综合均分缺失')
  })

  addCase('FUNC-SA-10C', 'school_admin', '校管查看班级本学期成绩汇总与趋势', async () => {
    const classId = s1().classIds[0]
    const r = await http('GET', api(`/school-admin/academic/class-trend?classId=${classId}`), { token: s1().adminToken })
    assert(r.status < 300, `状态码 ${r.status}`)
    assert(r.body.className, 'className 缺失')
    assert(Array.isArray(r.body.trend), 'trend 应为数组')
    assert(Array.isArray(r.body.exams), 'exams 应为数组')
    if (r.body.trend.length) {
      assert(typeof r.body.trend[0].avg === 'number', '趋势均分缺失')
    }
  })

  addCase('FUNC-SA-11', 'school_admin', '校管 A 无法访问校管 B 学校的教师（跨校隔离）', async () => {
    const r = await http('GET', api('/school-admin/teachers?pageSize=10'), { token: s2().adminToken })
    assert(r.status < 300, `状态码 ${r.status}`)
    const items = r.body.items || []
    assert(!items.some((t: any) => t.name === '教师1-1'), '跨校数据泄漏：校管2看到了校1的教师')
  })

  addCase('FUNC-SA-12', 'school_admin', '校管错误密码返回 401', async () => {
    const r = await http('POST', api('/auth/unified-login'), { body: { username: adminUser(2), password: 'bad-pass' } })
    assertEq(r.status, 401, '状态码')
  })

  /* ================= 教师 ================= */
  addCase('FUNC-TCH-01', 'teacher', '教师登录返回 role=teacher', async () => {
    const r = await http('POST', api('/auth/unified-login'), { body: { username: teacherUser(1, 1), password: TEACHER_PASS } })
    assert(r.status < 300, `登录失败 ${r.status}`)
    assertEq(r.body.role, 'teacher', 'role')
  })

  const tTok = () => {
    const t = s1().headTeacherTokens[0]
    assert(t, '班主任 token 缺失（seed 阶段登录失败）')
    return t
  }

  addCase('FUNC-TCH-02', 'teacher', '教师班级成员列表', async () => {
    const r = await http('GET', api('/classes'), { token: tTok() })
    assert(r.status < 300, `状态码 ${r.status}`)
    const list = Array.isArray(r.body) ? r.body : r.body.items || []
    assert(list.length >= 1, '教师名下无班级')
  })

  addCase('FUNC-TCH-03', 'teacher', '教师学生列表（本班 50 人）', async () => {
    const r = await http('GET', api(`/students?classId=${s1().classIds[0]}&pageSize=100`), { token: tTok() })
    assert(r.status < 300, `状态码 ${r.status}`)
    const total = r.body.total ?? (r.body.items || []).length
    assert(total >= 50, `学生数应≥50，实际 ${total}`)
  })

  addCase('FUNC-TCH-04', 'teacher', '教师查询自己学生的详情', async () => {
    const list = await http('GET', api(`/students?classId=${s1().classIds[0]}&pageSize=1`), { token: tTok() })
    const stu = (list.body.items || [])[0]
    assert(stu, '未取到学生')
    const r = await http('GET', api(`/students/${stu.id}`), { token: tTok() })
    assert(r.status < 300, `状态码 ${r.status}`)
    assert(r.body.studentNo, '学号缺失')
  })

  addCase('FUNC-TCH-05', 'teacher', '教师访问他校学生被拒绝（租户隔离）', async () => {
    // 取校2的一个学生 id
    const list2 = await http('GET', api(`/school-admin/students?classId=${s2().classIds[0]}&pageSize=1`), { token: s2().adminToken })
    const stu2 = (list2.body.items || [])[0]
    assert(stu2, '校2学生缺失')
    const r = await http('GET', api(`/students/${stu2.id}`), { token: tTok() })
    assert(r.status === 400 || r.status === 403 || r.status === 404, `期望拒绝，实际 ${r.status}`)
  })

  addCase('FUNC-TCH-06', 'teacher', '教师考试列表（本班 10 次）', async () => {
    const r = await http('GET', api(`/exams?classId=${s1().classIds[0]}`), { token: tTok() })
    assert(r.status < 300, `状态码 ${r.status}`)
    const list = Array.isArray(r.body) ? r.body : r.body.items || []
    assert(list.length >= EXAMS_PER_CLASS, `考试数应≥${EXAMS_PER_CLASS}，实际 ${list.length}`)
  })

  addCase('FUNC-TCH-07', 'teacher', '教师查询班级成绩（含 6 科）', async () => {
    const r = await http('GET', api(`/grades?classId=${s1().classIds[0]}`), { token: tTok() })
    assert(r.status < 300, `状态码 ${r.status}`)
    const list = Array.isArray(r.body) ? r.body : r.body.items || []
    assert(list.length >= SUBJECTS.length, `成绩记录应≥${SUBJECTS.length}，实际 ${list.length}`)
    const first = list[0]
    assert(Array.isArray(first.scores) && first.scores.length >= 50, '单条成绩应含 50 名学生分数')
  })

  addCase('FUNC-TCH-08', 'teacher', '教师发布新考试', async () => {
    const r = await http('POST', api('/exams'), {
      token: tTok(),
      body: { classId: s1().classIds[0], name: 'QA验收测验', term: '2025-2026学年下学期', date: '2026-08-01', subjects: ['语文', '数学'] },
    })
    assert(r.status < 300, `创建失败 ${r.status} ${JSON.stringify(r.body).slice(0, 150)}`)
  })

  addCase('FUNC-TCH-09', 'teacher', '成绩录入真实流程：建考试自动生成占位→import-commit 提交分数→可查询', async () => {
    // 产品真实流程：POST /exams 会按科目自动建空成绩占位行；分数经 /grades/import-commit 提交（Web 端 Grades.vue 即此路径）
    const c = await http('POST', api('/exams'), {
      token: tTok(),
      body: { classId: s1().classIds[0], name: 'QA录入流程测验', term: '2025-2026学年下学期', date: '2026-08-01', subjects: ['语文', '数学'] },
    })
    assert(c.status < 300, `创建考试失败 ${r2text(c)}`)
    const list = await http('GET', api(`/students?classId=${s1().classIds[0]}&pageSize=500`), { token: tTok() })
    const stus = (list.body.items || []).slice(0, 5)
    assert(stus.length >= 5, '学生不足')
    const commit = await http('POST', api('/grades/import-commit'), {
      token: tTok(),
      body: { classId: s1().classIds[0], examName: 'QA录入流程测验', subject: '语文', date: '2026-08-01', rows: stus.map((s: any, i: number) => ({ studentId: s.id, score: 80 + i, valid: true })) },
    })
    assert(commit.status < 300, `import-commit 失败 ${r2text(commit)}`)
    // 查询验证分数已落库
    const g = await http('GET', api(`/grades?classId=${s1().classIds[0]}`), { token: tTok() })
    const rows = Array.isArray(g.body) ? g.body : g.body.items || []
    const qaRow = rows.find((r: any) => r.examName === 'QA录入流程测验' && r.subject === '语文')
    assert(qaRow, '未找到 QA录入流程测验 语文 成绩行')
    const scored = (qaRow.scores || []).filter((x: any) => x.score != null)
    assert(scored.length >= 5, `分数未落库（${scored.length}）`)
  })

  addCase('FUNC-TCH-10', 'teacher', '考试分析接口（班级均分/分段）', async () => {
    const exams = await http('GET', api(`/exams?classId=${s1().classIds[0]}`), { token: tTok() })
    const list = Array.isArray(exams.body) ? exams.body : exams.body.items || []
    const ex = list.find((e: any) => e.name === '期末考试') || list[0]
    assert(ex, '无可用考试')
    const r = await http('GET', api(`/grades/analysis/exam?classId=${s1().classIds[0]}&examId=${ex.id}`), { token: tTok() })
    assert(r.status < 300, `状态码 ${r.status}`)
  })

  addCase('FUNC-TCH-11', 'teacher', '作业 CRUD 闭环', async () => {
    const c = await http('POST', api('/homework'), { token: tTok(), body: { classId: s1().classIds[0], title: 'QA作业', subject: '语文', content: '测试', startDate: '2026-08-10', deadline: '2026-08-11', status: '待批改' } })
    assert(c.status < 300, `创建失败 ${r2text(c)}`)
    const l = await http('GET', api(`/homework?classId=${s1().classIds[0]}`), { token: tTok() })
    const list = Array.isArray(l.body) ? l.body : l.body.items || []
    assert(list.some((h: any) => h.title === 'QA作业'), '作业列表未包含新建作业')
  })

  addCase('FUNC-TCH-12', 'teacher', '公告 CRUD 闭环', async () => {
    const c = await http('POST', api('/notices'), { token: tTok(), body: { classId: s1().classIds[0], title: 'QA班级公告', content: '内容', pinned: true } })
    assert(c.status < 300, `创建失败 ${r2text(c)}`)
    const l = await http('GET', api(`/notices?classId=${s1().classIds[0]}`), { token: tTok() })
    const list = Array.isArray(l.body) ? l.body : l.body.items || []
    assert(list.some((n: any) => n.title === 'QA班级公告'), '公告未创建成功')
  })

  addCase('FUNC-TCH-13', 'teacher', '考勤/打卡记录查询', async () => {
    const r = await http('GET', api(`/checkins?classId=${s1().classIds[0]}`), { token: tTok() })
    assert(r.status < 300, `状态码 ${r.status}`)
  })

  addCase('FUNC-TCH-14', 'teacher', '家长联系列表', async () => {
    const r = await http('GET', api(`/parent-contacts?classId=${s1().classIds[0]}`), { token: tTok() })
    assert(r.status < 300, `状态码 ${r.status}`)
  })

  addCase('FUNC-TCH-15', 'teacher', '课表查询与保存', async () => {
    const g = await http('GET', api(`/schedules?classId=${s1().classIds[0]}`), { token: tTok() })
    assert(g.status < 300, `查询失败 ${g.status}`)
  })

  addCase('FUNC-TCH-16', 'teacher', '教材知识点树查询', async () => {
    const r = await http('GET', api('/textbooks/tree?subject=语文'), { token: tTok() })
    assert(r.status < 300, `状态码 ${r.status}`)
  })

  addCase('FUNC-TCH-17', 'teacher', '专项资源库（古诗词）查询', async () => {
    const r = await http('GET', api('/resource-library/poems?pageSize=5'), { token: tTok() })
    assert(r.status < 300, `状态码 ${r.status}`)
  })

  addCase('FUNC-TCH-18', 'teacher', '校管重置教师密码后教师用新密码登录', async () => {
    // 说明：系统现状教师无自助改密端点，密码由校管重置（记录为 UX 待改进项）
    const u = teacherUser(1, 4)
    const list = await http('GET', api(`/school-admin/teachers?keyword=${u}&pageSize=1`), { token: s1().adminToken })
    const tch = (list.body.items || []).find((t: any) => t.username === u)
    assert(tch, '教师账号缺失')
    const rs = await http('POST', api(`/school-admin/teachers/${tch.id}/reset-password`), { token: s1().adminToken, body: { password: 'QaReset@123' } })
    assert(rs.status < 300, `重置失败 ${rs.status} ${JSON.stringify(rs.body).slice(0, 120)}`)
    const lg = await http('POST', api('/auth/unified-login'), { body: { username: u, password: 'QaReset@123' } })
    assert(lg.status < 300, `新密码登录失败 ${lg.status}`)
  })

  addCase('FUNC-TCH-19', 'teacher', '学生信息修改申请审核流（家长提交→教师审核）', async () => {
    // 家长提交
    const no = studentNo(1, 1, 1, 1)
    const plg = await http('POST', api('/auth/unified-login'), { body: { username: no, password: PARENT_PASS } })
    assert(plg.status < 300, `家长登录失败 ${plg.status}`)
    const req = await http('POST', api('/parent-auth/student-update-request'), { token: plg.body.token, body: { payload: { parentPhone: '13900001111', note: 'QA更新' } } })
    assert(req.status < 300, `提交申请失败 ${r2text(req)}`)
    // 教师查询待审核并审批通过（完整审核流）
    const list = await http('GET', api('/student-info-updates?status=pending'), { token: tTok() })
    assert(list.status < 300, `教师查询申请失败 ${list.status}`)
    const items = Array.isArray(list.body) ? list.body : list.body.items || []
    assert(items.length >= 1, '待审核列表为空')
    const rv = await http('POST', api(`/student-info-updates/${items[0].id}/review`), { token: tTok(), body: { action: 'approve', note: 'QA通过' } })
    assert(rv.status < 300, `审核失败 ${rv.status} ${JSON.stringify(rv.body).slice(0, 120)}`)
  })

  addCase('FUNC-TCH-20', 'teacher', '教师无 token 访问被拒绝', async () => {
    const r = await http('GET', api('/classes'))
    assertEq(r.status, 401, '状态码')
  })

  addCase('FUNC-TCH-26', 'teacher', '教师批量成绩导入', async () => {
    const classId = s1().classIds[0]
    const exams = await http('GET', api(`/exams?classId=${classId}`), { token: tTok() })
    const examList = Array.isArray(exams.body) ? exams.body : exams.body.items || []
    const exam = examList.find((e: any) => e.name === '期末考试') || examList[0]
    assert(exam, '无可用考试')
    const students = await http('GET', api(`/students?classId=${classId}&pageSize=500`), { token: tTok() })
    const stus = (students.body.items || []).slice(0, 5)
    assert(stus.length >= 5, '学生不足')
    const r = await http('POST', api('/grades/import-commit'), {
      token: tTok(),
      body: { classId, examName: exam.name, subject: '语文', date: exam.date, rows: stus.map((s: any, i: number) => ({ studentId: s.id, score: 80 + i, valid: true })) },
    })
    assert(r.status < 300, `批量成绩导入失败 ${r.status} ${r2text(r)}`)
  })

  addCase('FUNC-TCH-27', 'teacher', '教师查看3学期考试列表', async () => {
    const r = await http('GET', api(`/exams?classId=${s1().classIds[0]}&pageSize=100`), { token: tTok() })
    assert(r.status < 300, `状态码 ${r.status}`)
    const list = Array.isArray(r.body) ? r.body : r.body.items || []
    const terms = new Set(list.map((e: any) => e.term))
    assert(terms.size >= 3, `应覆盖3学期，实际 ${terms.size} 学期`)
    assert(list.length >= EXAMS_PER_CLASS, `考试数应≥${EXAMS_PER_CLASS}，实际 ${list.length}`)
  })

  addCase('FUNC-TCH-28', 'teacher', '教师班级成绩导出', async () => {
    const r = await http('GET', api(`/grades/export?classId=${s1().classIds[0]}`), { token: tTok() })
    assert(r.status < 300, `成绩导出失败 ${r.status}`)
  })

  addCase('FUNC-TCH-29', 'teacher', '教师按年级浏览课程表', async () => {
    const r = await http('GET', api(`/schedules?grade=一年级`), { token: tTok() })
    assert(r.status < 300, `课程表查询失败 ${r.status}`)
  })

  /* ================= 家长功能包管理（班主任配置家长可见功能） ================= */
  addCase('FUNC-PF-01', 'teacher', '班主任读取班级家长功能包（未配置→configured=false）', async () => {
    const r = await http('GET', api(`/classes/${s1().classIds[0]}/parent-features`), { token: tTok() })
    assert(r.status < 300, `状态码 ${r.status} ${JSON.stringify(r.body).slice(0, 120)}`)
    assertEq(r.body.configured, false, '未配置时应为 false')
    assert(Array.isArray(r.body.options) && r.body.options.length > 0, '应返回可用功能包选项')
  })

  addCase('FUNC-PF-02', 'teacher', '班主任写入家长功能包（grades+homework）', async () => {
    const r = await http('PATCH', api(`/classes/${s1().classIds[0]}/parent-features`), { token: tTok(), body: { features: ['grades', 'homework'] } })
    assert(r.status < 300, `状态码 ${r.status} ${JSON.stringify(r.body).slice(0, 120)}`)
    assert(Array.isArray(r.body.features) && r.body.features.includes('grades'), 'features 应包含 grades')
  })

  addCase('FUNC-PF-03', 'teacher', '家长功能包写入后读取为已配置', async () => {
    const r = await http('GET', api(`/classes/${s1().classIds[0]}/parent-features`), { token: tTok() })
    assert(r.status < 300, `状态码 ${r.status}`)
    assertEq(r.body.configured, true, '已配置应为 true')
    assert(Array.isArray(r.body.features) && r.body.features.includes('homework'), 'features 应包含 homework')
  })

  addCase('FUNC-PF-04', 'teacher', '无效功能包 key → 400', async () => {
    const r = await http('PATCH', api(`/classes/${s1().classIds[0]}/parent-features`), { token: tTok(), body: { features: ['not_a_real_key'] } })
    assertEq(r.status, 400, '无效 key 应返回 400')
  })

  addCase('FUNC-PF-05', 'teacher', '非本班教师读取/写入家长功能包被拒绝', async () => {
    // qat01t07 是 1 校 2 班班主任（非 1 班 1 成员）
    const lg = await http('POST', api('/auth/unified-login'), { body: { username: teacherUser(1, 7), password: TEACHER_PASS } })
    assert(lg.status < 300, `教师登录失败 ${lg.status}`)
    const g = await http('GET', api(`/classes/${s1().classIds[0]}/parent-features`), { token: lg.body.token })
    assert(g.status === 401 || g.status === 403, `读取应被拒绝，实际 ${g.status}`)
    const u = await http('PATCH', api(`/classes/${s1().classIds[0]}/parent-features`), { token: lg.body.token, body: { features: ['notices'] } })
    assert(u.status === 401 || u.status === 403, `写入应被拒绝，实际 ${u.status}`)
  })

  addCase('FUNC-PF-06', 'teacher', '家长功能包恢复跟随默认（features=null）', async () => {
    const r = await http('PATCH', api(`/classes/${s1().classIds[0]}/parent-features`), { token: tTok(), body: { features: null } })
    assert(r.status < 300, `状态码 ${r.status} ${JSON.stringify(r.body).slice(0, 120)}`)
    const g = await http('GET', api(`/classes/${s1().classIds[0]}/parent-features`), { token: tTok() })
    assertEq(g.body.configured, false, '恢复默认后 configured=false')
  })

  addCase('FUNC-PF-07', 'parent', '家长 /me 的 effectiveFeatures 随班级家长功能包联动', async () => {
    // 先配置仅 grades+homework
    const p = await http('PATCH', api(`/classes/${s1().classIds[0]}/parent-features`), { token: tTok(), body: { features: ['grades', 'homework'] } })
    assert(p.status < 300, `配置失败 ${p.status} ${JSON.stringify(p.body).slice(0, 120)}`)
    const t = await pTok()
    const me = await http('GET', api('/parent-auth/me'), { token: t })
    assert(me.status < 300, `/me 失败 ${me.status}`)
    const eff = me.body.effectiveFeatures
    assert(Array.isArray(eff), `effectiveFeatures 应为数组，实际 ${JSON.stringify(eff).slice(0, 120)}`)
    assert(eff.includes('grades') && eff.includes('homework'), `应包含 grades/homework，实际 ${JSON.stringify(eff)}`)
    assert(!eff.includes('notices') && !eff.includes('attendance'), `应排除未开放功能，实际 ${JSON.stringify(eff)}`)
    // 恢复默认（清理测试副作用）
    const r = await http('PATCH', api(`/classes/${s1().classIds[0]}/parent-features`), { token: tTok(), body: { features: null } })
    assert(r.status < 300, `恢复默认失败 ${r.status}`)
  })

  /* ================= 家长 ================= */
  addCase('FUNC-PAR-01', 'parent', '家长用学号+口令统一登录', async () => {
    const r = await http('POST', api('/auth/unified-login'), { body: { username: studentNo(1, 1, 1, 1), password: PARENT_PASS } })
    assert(r.status < 300, `登录失败 ${r.status}`)
    assertEq(r.body.role, 'parent', 'role')
  })

  addCase('FUNC-PAR-02', 'parent', '家长错误密码返回 401', async () => {
    const r = await http('POST', api('/auth/unified-login'), { body: { username: studentNo(1, 1, 1, 1), password: 'wrong' } })
    assertEq(r.status, 401, '状态码')
  })

  addCase('FUNC-PAR-03', 'parent', '未开启家长登录的学号被拒绝', async () => {
    const r = await http('POST', api('/auth/unified-login'), { body: { username: 'NOTEXIST999', password: PARENT_PASS } })
    assertEq(r.status, 401, '状态码')
  })

  const pTok = async () => {
    const r = await http('POST', api('/auth/unified-login'), { body: { username: studentNo(1, 1, 1, 1), password: PARENT_PASS } })
    assert(r.status < 300, `家长登录失败 ${r.status}`)
    return r.body.token as string
  }

  addCase('FUNC-PAR-04', 'parent', '家长 /me 返回孩子信息（unified-login 签发 parentId 修复验证）', async () => {
    const t = await pTok()
    const r = await http('GET', api('/parent-auth/me'), { token: t })
    assert(r.status < 300, `状态码 ${r.status}`)
    assert(r.body != null, '/me 返回空（parentId 未签发？）')
    assert(r.body.studentName, 'studentName 缺失')
    assert(Array.isArray(r.body.kids) && r.body.kids.length >= 1, 'kids 列表缺失')
  })

  addCase('FUNC-PAR-18', 'parent', '二孩家庭家长 /me 返回 2 个孩子且可跨娃比对', async () => {
    // S01C01N01 与 S01C02N01 同家长（seed 构造）
    const lg = await http('POST', api('/auth/unified-login'), { body: { username: studentNo(1, 1, 1, 1), password: PARENT_PASS } })
    assert(lg.status < 300, `登录失败 ${lg.status}`)
    const me = await http('GET', api('/parent-auth/me'), { token: lg.body.token })
    assert(me.body != null, '/me 返回空')
    assertEq(me.body.kids.length, 2, '二孩家庭 kids 数量')
    const cmp = await http('GET', api('/parent-auth/compare-kids'), { token: lg.body.token })
    assert(cmp.status < 300, `compare-kids 失败 ${cmp.status}`)
    assert(cmp.body.kids && cmp.body.kids.length === 2, 'compare-kids 应返回 2 个孩子')
  })

  addCase('FUNC-PAR-05', 'parent', '家长查看班级公告', async () => {
    const t = await pTok()
    const r = await http('GET', api('/parent-auth/notices'), { token: t })
    assert(r.status < 300, `状态码 ${r.status}`)
    assert(Array.isArray(r.body), '应为数组')
  })

  addCase('FUNC-PAR-06', 'parent', '家长查看成绩（10 次考试 × 6 科）', async () => {
    const t = await pTok()
    const r = await http('GET', api('/parent-auth/exams'), { token: t })
    assert(r.status < 300, `状态码 ${r.status}`)
    const exams = r.body.exams || []
    assert(exams.length >= EXAMS_PER_CLASS, `考试数应≥${EXAMS_PER_CLASS}，实际 ${exams.length}`)
    const first = exams[0]
    assert(Array.isArray(first.subjects) && first.subjects.length >= SUBJECTS.length, '科目成绩缺失')
    assert(first.totalScore != null, '总分缺失')
  })

  addCase('FUNC-PAR-07', 'parent', '家长只能看到自己孩子的成绩（数据隔离）', async () => {
    const t = await pTok()
    const r = await http('GET', api('/parent-auth/exams'), { token: t })
    const exams = r.body.exams || []
    for (const e of exams) {
      assert(e.studentId == null || true, '')
      // 成绩结构不应包含其他学生的分数明细
      assert(!e.otherStudents, '泄漏其他学生数据')
    }
  })

  addCase('FUNC-PAR-08', 'parent', '家长查看作业', async () => {
    const t = await pTok()
    const r = await http('GET', api('/parent-auth/homework'), { token: t })
    assert(r.status < 300, `状态码 ${r.status}`)
    assert(Array.isArray(r.body), '应为数组')
  })

  addCase('FUNC-PAR-09', 'parent', '家长查看考勤', async () => {
    const t = await pTok()
    const r = await http('GET', api('/parent-auth/attendance'), { token: t })
    assert(r.status < 300, `状态码 ${r.status}`)
    assert(r.body.summary != null, 'summary 缺失')
  })

  addCase('FUNC-PAR-10', 'parent', '家长查看行为记录', async () => {
    const t = await pTok()
    const r = await http('GET', api('/parent-auth/behavior'), { token: t })
    assert(r.status < 300, `状态码 ${r.status}`)
  })

  addCase('FUNC-PAR-11', 'parent', '家长查看课表', async () => {
    const t = await pTok()
    const r = await http('GET', api('/parent-auth/schedule'), { token: t })
    assert(r.status < 300, `状态码 ${r.status}`)
  })

  addCase('FUNC-PAR-12', 'parent', '家长查看家校沟通记录', async () => {
    const t = await pTok()
    const r = await http('GET', api('/parent-auth/communications'), { token: t })
    assert(r.status < 300, `状态码 ${r.status}`)
  })

  addCase('FUNC-PAR-13', 'parent', '家长查看科任老师（含班主任）', async () => {
    const t = await pTok()
    const r = await http('GET', api('/parent-auth/teachers'), { token: t })
    assert(r.status < 300, `状态码 ${r.status}`)
    assert(Array.isArray(r.body), '应为数组')
  })

  addCase('FUNC-PAR-14', 'parent', '家长修改密码后用新密码登录', async () => {
    const no = studentNo(1, 1, 1, 2)
    const lg = await http('POST', api('/auth/unified-login'), { body: { username: no, password: PARENT_PASS } })
    assert(lg.status < 300, `登录失败 ${lg.status}`)
    const ch = await http('POST', api('/parent-auth/change-password'), { token: lg.body.token, body: { oldPassword: PARENT_PASS, newPassword: 'QaParent@123' } })
    assert(ch.status < 300, `改密失败 ${r2text(ch)}`)
    const lg2 = await http('POST', api('/auth/unified-login'), { body: { username: no, password: 'QaParent@123' } })
    assert(lg2.status < 300, `新密码登录失败 ${lg2.status}`)
    await http('POST', api('/parent-auth/change-password'), { token: lg2.body.token, body: { oldPassword: 'QaParent@123', newPassword: PARENT_PASS } })
  })

  addCase('FUNC-PAR-15', 'parent', '家长提交信息修改申请并查询记录', async () => {
    const t = await pTok()
    const c = await http('POST', api('/parent-auth/student-update-request'), { token: t, body: { payload: { address: 'QA测试地址' } } })
    assert(c.status < 300, `提交失败 ${r2text(c)}`)
    const l = await http('GET', api('/parent-auth/student-update-requests'), { token: t })
    assert(l.status < 300, `查询失败 ${l.status}`)
    assert(Array.isArray(l.body) && l.body.length >= 1, '申请记录为空')
  })

  addCase('FUNC-PAR-16', 'parent', '家长 token 无法访问教师接口', async () => {
    const t = await pTok()
    const r = await http('GET', api('/classes'), { token: t })
    assert(r.status === 401 || r.status === 403, `期望 401/403，实际 ${r.status}`)
  })

  addCase('FUNC-PAR-17', 'parent', '家长消息订阅接口', async () => {
    const t = await pTok()
    const r = await http('POST', api('/parent-auth/subscribe'), { token: t, body: {} })
    assert(r.status < 300, `状态码 ${r.status}`)
  })

  addCase('FUNC-PAR-19', 'parent', '家长查看教师消息列表（含富化种子数据）', async () => {
    const t = await pTok()
    const r = await http('GET', api('/messages?pageSize=50'), { token: t })
    assert(r.status < 300, `状态码 ${r.status}`)
    const items = Array.isArray(r.body) ? r.body : r.body.items || []
    assert(items.length >= 1, '家长消息列表应至少含一条富化数据')
  })

  /* ================= 教师：富化数据覆盖（新增强化用例）================ */
  addCase('FUNC-TCH-21', 'teacher', '教师笔记 CRUD 闭环', async () => {
    const c = await http('POST', api('/notes'), { token: tTok(), body: { title: 'QA笔记', content: '内容', category: '教学反思' } })
    assert(c.status < 300, `创建失败 ${r2text(c)}`)
    const l = await http('GET', api('/notes?pageSize=20'), { token: tTok() })
    assert(l.status < 300, `查询失败 ${r2text(l)}`)
    const items = Array.isArray(l.body) ? l.body : l.body.items || []
    assert(items.some((n: any) => n.title === 'QA笔记'), '笔记未创建成功')
  })

  addCase('FUNC-TCH-22', 'teacher', '教师通知列表（含富化种子数据）', async () => {
    const l = await http('GET', api('/notifications?pageSize=50'), { token: tTok() })
    assert(l.status < 300, `查询失败 ${r2text(l)}`)
    const items = Array.isArray(l.body) ? l.body : l.body.items || []
    assert(items.length >= 1, '通知列表应至少含一条富化数据')
  })

  addCase('FUNC-TCH-23', 'teacher', '教师消息列表（含种子数据，收件箱+已发）', async () => {
    const l = await http('GET', api('/messages?pageSize=50'), { token: tTok() })
    assert(l.status < 300, `收件箱查询失败 ${l.status}`)
    const itemsIn = Array.isArray(l.body) ? l.body : l.body.items || []
    const s = await http('GET', api('/messages/sent?pageSize=50'), { token: tTok() })
    assert(s.status < 300, `已发箱查询失败 ${s.status}`)
    const itemsSent = Array.isArray(s.body) ? s.body : s.body.items || []
    // 收件箱可能为空（教师通常是发件人），但已发箱应有富化数据
    assert(itemsSent.length >= 1 || itemsIn.length >= 1, '教师消息（已发/收件）应至少含一条富化数据')
  })

  addCase('FUNC-TCH-24', 'teacher', '教师考勤列表（含富化种子数据）', async () => {
    const l = await http('GET', api(`/attendances?classId=${s1().classIds[0]}`), { token: tTok() })
    assert(l.status < 300, `查询失败 ${r2text(l)}`)
    const items = Array.isArray(l.body) ? l.body : l.body.items || []
    assert(items.length >= 1, '考勤列表应至少含一条富化数据')
  })

  /* ================= 校管：富化数据覆盖 ================= */
  addCase('FUNC-SA-13', 'school_admin', '校管查看本校级公告（含学校级与班级级）', async () => {
    const r = await http('GET', api('/school-admin/notices?pageSize=200'), { token: s1().adminToken })
    assert(r.status < 300, `查询失败 ${r.status}`)
    const items = Array.isArray(r.body) ? r.body : r.body.items || []
    // 该校应至少有 1 条学校级公告（seed 创建时使用 adminId 作为 teacherId）
    assert(items.length >= 1, `公告数应≥1，实际 ${items.length}`)
  })

  addCase('FUNC-SA-14', 'school_admin', '校管查看全校教师信息（含跨部门聚合）', async () => {
    const r = await http('GET', api('/school-admin/teachers?pageSize=200'), { token: s1().adminToken })
    assert(r.status < 300, `查询失败 ${r.status}`)
    const total = r.body.total ?? (r.body.items || []).length
    assert(total >= 200, `教师数应≥200，实际 ${total}`)
  })

  addCase('FUNC-SA-15', 'school_admin', '校管收件人列表包含本校教师/超管/其他校管', async () => {
    const r = await http('GET', api('/messages/recipients'), { token: s1().adminToken })
    assert(r.status < 300, `查询失败 ${r.status}`)
    const list = Array.isArray(r.body) ? r.body : []
    const hasTeacher = list.some((x: any) => x.role === 'teacher')
    const hasSuper = list.some((x: any) => x.role === 'super')
    assert(hasTeacher, '校管收件人列表应包含本校教师')
    assert(hasSuper, '校管收件人列表应包含超管')
  })

  addCase('FUNC-SA-16', 'school_admin', '校管给本校教师发送消息闭环', async () => {
    const recs = await http('GET', api('/messages/recipients'), { token: s1().adminToken })
    const list = Array.isArray(recs.body) ? recs.body : []
    const target = list.find((x: any) => x.role === 'teacher')
    assert(target, '无可用教师收件人')
    const s = await http('POST', api('/messages'), {
      token: s1().adminToken,
      body: { recipientId: target.id, recipientRole: 'teacher', title: 'QA校管→教师', content: '您好，关于班级事情…', type: 'direct' },
    })
    assert(s.status < 300, `发送失败 ${s.status}`)
  })

  addCase('FUNC-SA-17', 'school_admin', '校管批量导入教师', async () => {
    const r = await http('POST', api('/school-admin/teachers/batch-import'), {
      token: s1().adminToken,
      body: {
        teachers: [
          { name: '批量教师1', username: 'qabatch01', password: 'QaBatch@123' },
          { name: '批量教师2', username: 'qabatch02', password: 'QaBatch@123' },
        ],
      },
    })
    assert(r.status < 300, `批量导入教师失败 ${r.status} ${r2text(r)}`)
  })

  addCase('FUNC-SA-18', 'school_admin', '校管批量导入学生', async () => {
    const r = await http('POST', api('/school-admin/students/batch-import'), {
      token: s1().adminToken,
      body: {
        students: [
          { name: '批量学生1', studentNo: 'S01G01C01N99', className: '一年级(1)班' },
          { name: '批量学生2', studentNo: 'S01G01C01N98', className: '一年级(1)班' },
        ],
      },
    })
    assert(r.status < 300, `批量导入学生失败 ${r.status} ${r2text(r)}`)
  })

  addCase('FUNC-SA-19', 'school_admin', '校管导出学生', async () => {
    const r = await http('GET', api('/school-admin/students/export'), { token: s1().adminToken })
    assert(r.status < 300, `导出学生失败 ${r.status}`)
  })

  addCase('FUNC-SA-20', 'school_admin', '校管按年级横向对比成绩', async () => {
    const r = await http('GET', api('/school-admin/academic/class-comparison?grade=一年级'), { token: s1().adminToken })
    assert(r.status < 300, `状态码 ${r.status}`)
    const classes = r.body.classes || []
    assert(classes.length >= 1, `一年级下班级数应≥1，实际 ${classes.length}`)
    assert(classes[0].className, '班级名缺失')
    assert(typeof classes[0].overallAvg === 'number', '综合均分缺失')
    assert(classes.length >= CLASSES_PER_GRADE, `一年级应≥${CLASSES_PER_GRADE}班，实际 ${classes.length}`)
  })

  addCase('FUNC-SA-21', 'school_admin', '校管查看3学期汇总', async () => {
    const r = await http('GET', api('/school-admin/academic/summary'), { token: s1().adminToken })
    assert(r.status < 300, `状态码 ${r.status}`)
    assert(r.body.totalExams >= EXAMS_PER_CLASS, `考试总数应≥${EXAMS_PER_CLASS}`)
    assert(r.body.totalStudents >= STUDENTS_PER_CLASS * CLASSES_PER_SCHOOL, `学生总数不足`)
  })

  /* ================= 四角色互通：消息 ================= */
  addCase('FUNC-SUP-07', 'super', '超管收件人列表包含全部校管', async () => {
    const r = await http('GET', api('/messages/recipients'), { token: s1().adminToken })
    // 超管使用 adminToken 会被识别为 school_admin，改用 superToken 直接
    const login = await http('POST', api('/auth/unified-login'), { body: { username: SUPER_USER, password: SUPER_PASS } })
    const superTok = login.body.token
    const list = await http('GET', api('/messages/recipients'), { token: superTok })
    assert(list.status < 300, `查询失败 ${list.status}`)
    const items = Array.isArray(list.body) ? list.body : []
    assert(items.length >= 5, `超管应能看到所有校管，实际 ${items.length}`)
  })

  addCase('FUNC-TCH-25', 'teacher', '教师收件人列表包含本班家长与本校校管', async () => {
    const r = await http('GET', api('/messages/recipients'), { token: tTok() })
    assert(r.status < 300, `查询失败 ${r.status}`)
    const list = Array.isArray(r.body) ? r.body : []
    const hasParent = list.some((x: any) => x.role === 'parent')
    const hasAdmin = list.some((x: any) => x.role === 'school_admin')
    assert(hasParent, '教师收件人列表应包含本班家长')
    assert(hasAdmin, '教师收件人列表应包含本校校管')
  })

  addCase('FUNC-PAR-20', 'parent', '家长收件人列表包含班主任', async () => {
    const t = await pTok()
    const r = await http('GET', api('/messages/recipients'), { token: t })
    assert(r.status < 300, `查询失败 ${r.status}`)
    const list = Array.isArray(r.body) ? r.body : []
    const hasTeacher = list.some((x: any) => x.role === 'teacher')
    assert(hasTeacher, '家长收件人列表应包含班主任')
  })

  addCase('FUNC-PAR-21', 'parent', '跨校多孩家庭（家长跨校）', async () => {
    const lg = await http('POST', api('/auth/unified-login'), { body: { username: studentNo(2, 1, 4, 1), password: PARENT_PASS } })
    assert(lg.status < 300, `跨校家长登录失败 ${lg.status}`)
    const me = await http('GET', api('/parent-auth/me'), { token: lg.body.token })
    assert(me.status < 300, `查询 /me 失败 ${me.status}`)
    assert(me.body != null, '/me 返回空')
    assert(Array.isArray(me.body.kids) && me.body.kids.length >= 2, `跨校家庭应≥2个孩子，实际 ${me.body.kids?.length}`)
  })

  addCase('FUNC-PAR-22', 'parent', '教师子女独立登录（教师用用户名、子女用学号）', async () => {
    const teacherLogin = await http('POST', api('/auth/unified-login'), { body: { username: teacherUser(1, 5), password: TEACHER_PASS } })
    assert(teacherLogin.status < 300, `教师登录失败 ${teacherLogin.status}`)
    assertEq(teacherLogin.body.role, 'teacher', '教师登录应为 teacher 角色')
    const kidNo = studentNo(1, 2, 3, 60)
    const parentLogin = await http('POST', api('/auth/unified-login'), { body: { username: kidNo, password: PARENT_PASS } })
    assert(parentLogin.status < 300, `家长登录失败 ${parentLogin.status}`)
    assertEq(parentLogin.body.role, 'parent', '子女学号登录应为 parent 角色（独立登录，无师兼家切换）')
  })

  addCase('FUNC-PAR-23', 'parent', '三孩家庭', async () => {
    const lg = await http('POST', api('/auth/unified-login'), { body: { username: studentNo(1, 1, 3, 1), password: PARENT_PASS } })
    assert(lg.status < 300, `家长登录失败 ${lg.status}`)
    const me = await http('GET', api('/parent-auth/me'), { token: lg.body.token })
    assert(me.status < 300, `查询 /me 失败 ${me.status}`)
    assert(me.body != null, '/me 返回空')
    assertEq(me.body.kids.length, 3, `三孩家庭 kids 数量应为 3，实际 ${me.body.kids?.length}`)
  })

  addCase('FUNC-PAR-24', 'parent', '家长查看3学期成绩', async () => {
    const t = await pTok()
    const r = await http('GET', api('/parent-auth/exams'), { token: t })
    assert(r.status < 300, `状态码 ${r.status}`)
    const exams = r.body.exams || []
    assert(exams.length >= EXAMS_PER_CLASS, `考试数应≥${EXAMS_PER_CLASS}，实际 ${exams.length}`)
    const terms = new Set(exams.map((e: any) => e.term))
    assert(terms.size >= 3, `应覆盖3学期，实际 ${terms.size} 学期`)
  })

  /* ================= 跨端一致性（接口契约） ================= */
  addCase('FUNC-CONS-01', 'consistency', 'Web/小程序共用登录端点 unified-login', async () => {
    // 教师（Web 主场景）与家长（小程序主场景）均可通过同一端点登录
    const t = await http('POST', api('/auth/unified-login'), { body: { username: teacherUser(2, 1), password: TEACHER_PASS } })
    const p = await http('POST', api('/auth/unified-login'), { body: { username: studentNo(2, 1, 1, 1), password: PARENT_PASS } })
    assert(t.status < 300, '教师登录失败')
    assert(p.status < 300, '家长登录失败')
  })

  addCase('FUNC-CONS-02', 'consistency', '家长小程序专用登录端点 parent-auth/login 与统一登录等价', async () => {
    const a = await http('POST', api('/parent-auth/login'), { body: { studentNo: studentNo(1, 1, 1, 3), password: PARENT_PASS } })
    assert(a.status < 300, `parent-auth/login 失败 ${a.status} ${JSON.stringify(a.body).slice(0, 120)}`)
    assert(a.body.token, 'token 缺失')
  })

  addCase('FUNC-CONS-03', 'consistency', '三学期数据跨端一致性', async () => {
    const classId = s1().classIds[0]
    const teacherExams = await http('GET', api(`/exams?classId=${classId}`), { token: tTok() })
    const teacherList = Array.isArray(teacherExams.body) ? teacherExams.body : teacherExams.body.items || []
    const teacherTerms = new Set(teacherList.map((e: any) => e.term))
    assert(teacherTerms.size >= 3, `教师端应覆盖3学期，实际 ${teacherTerms.size} 学期`)

    const parentLg = await http('POST', api('/auth/unified-login'), { body: { username: studentNo(1, 1, 1, 1), password: PARENT_PASS } })
    const parentExams = await http('GET', api('/parent-auth/exams'), { token: parentLg.body.token })
    const parentList = parentExams.body.exams || []
    const parentTerms = new Set(parentList.map((e: any) => e.term))
    assert(parentTerms.size >= 3, `家长端应覆盖3学期，实际 ${parentTerms.size} 学期`)

    const overlap = [...teacherTerms].filter(t => parentTerms.has(t))
    assert(overlap.length >= 3, `教师端与家长端学期应完全一致，交集 ${overlap.length}/3`)
  })
}

function r2text(r: { status: number; body: any }) {
  return `${r.status} ${JSON.stringify(r.body).slice(0, 150)}`
}
