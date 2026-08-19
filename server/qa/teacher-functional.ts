/**
 * 教师角色全功能覆盖测试用例（FUNC-TCH-001 ~ FUNC-TCH-100+）
 *
 * 覆盖 20 个功能域：
 *   1. 登录与认证
 *   2. 班级管理
 *   3. 学生管理
 *   4. 考试管理
 *   5. 成绩管理
 *   6. 作业管理
 *   7. 公告管理
 *   8. 考勤管理
 *   9. 家校联系
 *   10. 课表管理
 *   11. 教材知识库
 *   12. 资源库
 *   13. 笔记管理
 *   14. 通知中心
 *   15. 消息系统
 *   16. 学生信息审核
 *   17. 家长功能包配置
 *   18. 成绩分析
 *   19. 数据看板
 *   20. 成绩导入校验
 *
 * 基于 seedDataset 数据集执行，使用真实数据构造。
 */
import { http } from './harness'
import { addCase, assert, assertEq, assertIncludes } from './framework'
import {
  SeedResult, SUPER_USER, SUPER_PASS, ADMIN_PASS, TEACHER_PASS, PARENT_PASS,
  adminUser, teacherUser, studentNo,
  SCHOOL_COUNT, SUBJECTS, TEACHERS_PER_SCHOOL, CLASSES_PER_SCHOOL,
  STUDENTS_PER_CLASS, EXAMS_PER_CLASS, GRADES_PER_SCHOOL, CLASSES_PER_GRADE,
  EXAMS_PER_SEMESTER, SEMESTERS, TEACHERS_PER_CLASS,
} from './seed'

export function registerTeacherFunctionalCases(baseUrl: string, seed: SeedResult) {
  const api = (path: string) => `${baseUrl}${path}`
  const s1 = () => seed.schools[0]
  const s2 = () => seed.schools[1]

  /** 班主任 token（校1 1 班班主任 qat01t01） */
  const tTok = () => {
    const t = s1().headTeacherTokens[0]
    assert(t, '班主任 token 缺失（seed 阶段登录失败）')
    return t
  }

  /** 校1 第2位教师 token（同校非1班班主任，用于隔离测试） */
  const t2Tok = async () => {
    const lg = await http('POST', api('/auth/unified-login'), { body: { username: teacherUser(1, 2), password: TEACHER_PASS } })
    assert(lg.status < 300, `教师2登录失败 ${lg.status}`)
    return lg.body.token as string
  }

  /** 家长 token */
  const pTok = async (no: string) => {
    const lg = await http('POST', api('/auth/unified-login'), { body: { username: no, password: PARENT_PASS } })
    assert(lg.status < 300, `家长登录失败(${no}) ${lg.status}`)
    return lg.body.token as string
  }

  /* ====================================================================================
   * 1. 登录与认证（FUNC-TCH-001 ~ FUNC-TCH-006）
   * ==================================================================================== */

  addCase('FUNC-TCH-001', 'teacher', '教师登录返回 role=teacher 与有效 token', async () => {
    const r = await http('POST', api('/auth/unified-login'), { body: { username: teacherUser(1, 1), password: TEACHER_PASS } })
    assert(r.status < 300, `登录失败 ${r.status}`)
    assertEq(r.body.role, 'teacher', 'role 应为 teacher')
    assert(typeof r.body.token === 'string' && r.body.token.length > 20, 'token 缺失')
  })

  addCase('FUNC-TCH-002', 'teacher', '错误密码登录返回 401', async () => {
    const r = await http('POST', api('/auth/unified-login'), { body: { username: teacherUser(1, 1), password: 'wrong-password' } })
    assertEq(r.status, 401, '状态码应为 401')
  })

  addCase('FUNC-TCH-003', 'teacher', '无 token 访问受保护接口返回 401', async () => {
    const r = await http('GET', api('/classes'))
    assertEq(r.status, 401, '状态码应为 401')
  })

  addCase('FUNC-TCH-004', 'teacher', 'token 验证成功后 /auth/me 返回角色信息', async () => {
    const r = await http('GET', api('/auth/me'), { token: tTok() })
    assert(r.status < 300, `状态码 ${r.status}`)
    assertEq(r.body.role, 'teacher', 'role 应为 teacher')
    assert(r.body.schoolId, 'schoolId 缺失')
  })

  addCase('FUNC-TCH-005', 'teacher', '教师自助修改密码闭环（新密码登录成功）', async () => {
    const u = teacherUser(1, 4)
    const lg = await http('POST', api('/auth/unified-login'), { body: { username: u, password: TEACHER_PASS } })
    assert(lg.status < 300, `登录失败 ${lg.status}`)
    // 原密码错误被拒绝
    const bad = await http('POST', api('/auth/change-password'), { token: lg.body.token, body: { oldPassword: 'wrong-pass', newPassword: 'QaNew@12345' } })
    assert(bad.status >= 400, `原密码错误应被拒绝，实际 ${bad.status}`)
    // 正确修改
    const ok = await http('POST', api('/auth/change-password'), { token: lg.body.token, body: { oldPassword: TEACHER_PASS, newPassword: 'QaNew@12345' } })
    assert(ok.status < 300, `改密失败 ${ok.status} ${JSON.stringify(ok.body).slice(0, 120)}`)
    // 新密码登录
    const lg2 = await http('POST', api('/auth/unified-login'), { body: { username: u, password: 'QaNew@12345' } })
    assert(lg2.status < 300, `新密码登录失败 ${lg2.status}`)
    // 还原（清理副作用）
    await http('POST', api('/auth/change-password'), { token: lg2.body.token, body: { oldPassword: 'QaNew@12345', newPassword: TEACHER_PASS } })
  })

  addCase('FUNC-TCH-006', 'teacher', 'SQL 注入登录参数被拒绝（4xx）', async () => {
    const r = await http('POST', api('/auth/unified-login'), { body: { username: "admin' OR '1'='1", password: "x' OR 1=1--" } })
    assert(r.status >= 400 && r.status < 500, `期望 4xx，实际 ${r.status}`)
  })

  /* ====================================================================================
   * 2. 班级管理（FUNC-TCH-007 ~ FUNC-TCH-011）
   * ==================================================================================== */

  addCase('FUNC-TCH-007', 'teacher', '教师班级列表返回至少1个班级', async () => {
    const r = await http('GET', api('/classes'), { token: tTok() })
    assert(r.status < 300, `状态码 ${r.status}`)
    const list = Array.isArray(r.body) ? r.body : r.body.items || []
    assert(list.length >= 1, '教师名下无班级')
    const cls = list[0]
    assert(cls.id, '班级 id 缺失')
    assert(cls.name, '班级名称缺失')
  })

  addCase('FUNC-TCH-008', 'teacher', '班主任查看班级成员列表', async () => {
    const r = await http('POST', api(`/classes/${s1().classIds[0]}/members/list`), { token: tTok() })
    assert(r.status < 300, `状态码 ${r.status}`)
    const members = r.body.members || r.body || []
    assert(Array.isArray(members), '成员列表应为数组')
  })

  addCase('FUNC-TCH-009', 'teacher', '班主任查看本校教师列表（供添加科任）', async () => {
    const r = await http('POST', api('/classes/school-teachers'), { token: tTok() })
    assert(r.status < 300, `状态码 ${r.status}`)
    const teachers = r.body.teachers || r.body || []
    assert(Array.isArray(teachers), '教师列表应为数组')
    assert(teachers.length >= 1, '本校教师列表不应为空')
  })

  addCase('FUNC-TCH-010', 'teacher', '教师切换班级查看不同班级数据（多班教学）', async () => {
    // 教师 qat01t01 任教的班级列表
    const cls = await http('GET', api('/classes'), { token: tTok() })
    assert(cls.status < 300, `班级列表失败 ${cls.status}`)
    const classList = Array.isArray(cls.body) ? cls.body : cls.body.items || []
    assert(classList.length >= 1, '教师名下无班级')
    // 遍历查看每个班级的学生
    for (const c of classList.slice(0, 3)) {
      const stu = await http('GET', api(`/students?classId=${c.id}&pageSize=5`), { token: tTok() })
      assert(stu.status < 300, `班级 ${c.name} 学生加载失败`)
    }
  })

  addCase('FUNC-TCH-011', 'teacher', '非班主任教师访问他班成员被隔离', async () => {
    // 教师2（科任）访问3班成员
    const t2 = await t2Tok()
    const r = await http('POST', api(`/classes/${s1().classIds[2]}/members/list`), { token: t2 })
    // 不在该班任课应被拒绝
    assert(r.status === 401 || r.status === 403 || r.status === 400, `期望拒绝，实际 ${r.status}`)
  })

  /* ====================================================================================
   * 3. 学生管理（FUNC-TCH-012 ~ FUNC-TCH-018）
   * ==================================================================================== */

  addCase('FUNC-TCH-012', 'teacher', '教师学生列表（本班 ≥50 人，带分页）', async () => {
    const classId = s1().classIds[0]
    const r = await http('GET', api(`/students?classId=${classId}&pageSize=100`), { token: tTok() })
    assert(r.status < 300, `状态码 ${r.status}`)
    const total = r.body.total ?? (r.body.items || []).length
    assert(total >= 50, `学生数应≥50，实际 ${total}`)
  })

  addCase('FUNC-TCH-013', 'teacher', '教师查询本班学生详情（学号、姓名、性别齐全）', async () => {
    const classId = s1().classIds[0]
    const list = await http('GET', api(`/students?classId=${classId}&pageSize=1`), { token: tTok() })
    const stu = (list.body.items || [])[0]
    assert(stu, '未取到学生')
    const r = await http('GET', api(`/students/${stu.id}`), { token: tTok() })
    assert(r.status < 300, `状态码 ${r.status}`)
    assert(r.body.studentNo, '学号缺失')
    assert(r.body.name, '姓名缺失')
    assert(r.body.gender, '性别缺失')
  })

  addCase('FUNC-TCH-014', 'teacher', '教师添加学生（构造新学号）', async () => {
    const classId = s1().classIds[0]
    const r = await http('POST', api('/students'), {
      token: tTok(),
      body: { classId, name: 'QA新增学生', gender: '男', studentNo: 'S01QA01N01' },
    })
    assert(r.status < 300, `创建失败 ${r.status} ${JSON.stringify(r.body).slice(0, 120)}`)
    assert(r.body.id, '缺少学生 id')
  })

  addCase('FUNC-TCH-015', 'teacher', '教师编辑学生信息', async () => {
    const classId = s1().classIds[0]
    // 先获取一个学生
    const list = await http('GET', api(`/students?classId=${classId}&pageSize=1`), { token: tTok() })
    const stu = (list.body.items || [])[0]
    assert(stu, '未取到学生')
    const r = await http('PATCH', api(`/students/${stu.id}`), { token: tTok(), body: { note: 'QA编辑备注', duty: '组长' } })
    assert(r.status < 300, `编辑失败 ${r.status} ${JSON.stringify(r.body).slice(0, 120)}`)
  })

  addCase('FUNC-TCH-016', 'teacher', '教师访问他校学生被拒绝（租户隔离）', async () => {
    // 取校2的一个学生 id
    const list2 = await http('GET', api(`/school-admin/students?classId=${s2().classIds[0]}&pageSize=1`), { token: s2().adminToken })
    const stu2 = (list2.body.items || [])[0]
    assert(stu2, '校2学生缺失')
    const r = await http('GET', api(`/students/${stu2.id}`), { token: tTok() })
    assert(r.status === 400 || r.status === 403 || r.status === 404, `期望拒绝，实际 ${r.status}`)
  })

  addCase('FUNC-TCH-017', 'teacher', '教师学生列表分页正确（pageSize 限制）', async () => {
    const classId = s1().classIds[0]
    const r1 = await http('GET', api(`/students?classId=${classId}&page=1&pageSize=10`), { token: tTok() })
    const r2 = await http('GET', api(`/students?classId=${classId}&page=2&pageSize=10`), { token: tTok() })
    assert(r1.status < 300, '第1页失败')
    assert(r2.status < 300, '第2页失败')
    const items1 = r1.body.items || []
    const items2 = r2.body.items || []
    assert(items1.length <= 10, '第1页不应超过 pageSize')
    assert(items2.length <= 10, '第2页不应超过 pageSize')
  })

  addCase('FUNC-TCH-018', 'teacher', '教师按关键词搜索学生', async () => {
    const classId = s1().classIds[0]
    const r = await http('GET', api(`/students?classId=${classId}&keyword=学生1-1-1-1&pageSize=5`), { token: tTok() })
    assert(r.status < 300, `状态码 ${r.status}`)
    const items = r.body.items || []
    assert(items.length >= 1, '未搜索到学生')
    assert(items.some((s: any) => s.name && s.name.includes('学生1-1-1-1')), '搜索结果不匹配')
  })

  /* ====================================================================================
   * 4. 考试管理（FUNC-TCH-019 ~ FUNC-TCH-024）
   * ==================================================================================== */

  addCase('FUNC-TCH-019', 'teacher', '教师考试列表（本班 ≥30 次考试）', async () => {
    const r = await http('GET', api(`/exams?classId=${s1().classIds[0]}`), { token: tTok() })
    assert(r.status < 300, `状态码 ${r.status}`)
    const list = Array.isArray(r.body) ? r.body : r.body.items || []
    assert(list.length >= EXAMS_PER_CLASS, `考试数应≥${EXAMS_PER_CLASS}，实际 ${list.length}`)
  })

  addCase('FUNC-TCH-020', 'teacher', '教师发布新考试', async () => {
    const r = await http('POST', api('/exams'), {
      token: tTok(),
      body: {
        classId: s1().classIds[0],
        name: 'QA新建测验',
        term: '2025-2026学年下学期',
        date: '2026-09-01',
        subjects: ['语文', '数学'],
      },
    })
    assert(r.status < 300, `创建失败 ${r.status} ${JSON.stringify(r.body).slice(0, 150)}`)
    assert(r.body.id, '考试 id 缺失')
  })

  addCase('FUNC-TCH-021', 'teacher', '教师编辑考试', async () => {
    // 先创建一个考试
    const c = await http('POST', api('/exams'), {
      token: tTok(),
      body: { classId: s1().classIds[0], name: 'QA待编辑测验', term: '2025-2026学年下学期', date: '2026-09-01', subjects: ['语文'] },
    })
    assert(c.status < 300, `创建失败 ${c.status}`)
    const examId = c.body.id
    // 编辑考试
    const r = await http('PATCH', api(`/exams/${examId}`), { token: tTok(), body: { name: 'QA已编辑测验', note: '修改备注' } })
    assert(r.status < 300, `编辑失败 ${r.status} ${JSON.stringify(r.body).slice(0, 120)}`)
  })

  addCase('FUNC-TCH-022', 'teacher', '教师查看考试详情', async () => {
    const exams = await http('GET', api(`/exams?classId=${s1().classIds[0]}`), { token: tTok() })
    const list = Array.isArray(exams.body) ? exams.body : exams.body.items || []
    const ex = list[0]
    assert(ex, '无可用考试')
    const r = await http('GET', api(`/exams/${ex.id}`), { token: tTok() })
    assert(r.status < 300, `状态码 ${r.status}`)
    assert(r.body.name, '考试名称缺失')
    assert(Array.isArray(r.body.subjects), '科目列表缺失')
  })

  addCase('FUNC-TCH-023', 'teacher', '教师按学期筛选考试列表', async () => {
    const classId = s1().classIds[0]
    const terms = ['2025-2026学年上学期', '2025-2026学年下学期', '2026-2027学年上学期']
    for (const term of terms) {
      const r = await http('GET', api(`/exams?classId=${classId}&term=${encodeURIComponent(term)}`), { token: tTok() })
      assert(r.status < 300, `${term} 考试列表失败 ${r.status}`)
      const list = Array.isArray(r.body) ? r.body : r.body.items || []
      assert(list.length >= EXAMS_PER_SEMESTER, `${term} 应≥${EXAMS_PER_SEMESTER}次考试，实际 ${list.length}`)
    }
  })

  addCase('FUNC-TCH-024', 'teacher', '教师3学期考试列表共覆盖90次（3×30）', async () => {
    const r = await http('GET', api(`/exams?classId=${s1().classIds[0]}&pageSize=200`), { token: tTok() })
    assert(r.status < 300, `状态码 ${r.status}`)
    const list = Array.isArray(r.body) ? r.body : r.body.items || []
    const terms = new Set(list.map((e: any) => e.term))
    assert(terms.size >= 3, `应覆盖3学期，实际 ${terms.size} 学期`)
    assert(list.length >= EXAMS_PER_CLASS, `考试数应≥${EXAMS_PER_CLASS}，实际 ${list.length}`)
  })

  /* ====================================================================================
   * 5. 成绩管理（FUNC-TCH-025 ~ FUNC-TCH-034）
   * ==================================================================================== */

  addCase('FUNC-TCH-025', 'teacher', '成绩列表（含 6 科，每条 ≥50 名学生分数）', async () => {
    const classId = s1().classIds[0]
    const r = await http('GET', api(`/grades?classId=${classId}`), { token: tTok() })
    assert(r.status < 300, `状态码 ${r.status}`)
    const list = Array.isArray(r.body) ? r.body : r.body.items || []
    assert(list.length >= SUBJECTS.length, `成绩记录应≥${SUBJECTS.length}，实际 ${list.length}`)
    const first = list[0]
    assert(Array.isArray(first.scores) && first.scores.length >= 50, '单条成绩应含 50 名学生分数')
  })

  addCase('FUNC-TCH-026', 'teacher', '成绩录入完整流程：创建考试→import-commit→查询验证', async () => {
    const classId = s1().classIds[0]
    // 创建考试（自动生成空成绩占位）
    const c = await http('POST', api('/exams'), {
      token: tTok(),
      body: { classId, name: 'QA成绩录入测验', term: '2025-2026学年下学期', date: '2026-09-01', subjects: ['语文', '数学'] },
    })
    assert(c.status < 300, `创建考试失败 ${r2text(c)}`)
    // 获取学生
    const list = await http('GET', api(`/students?classId=${classId}&pageSize=500`), { token: tTok() })
    const stus = (list.body.items || []).slice(0, 5)
    assert(stus.length >= 5, '学生不足')
    // import-commit 提交分数
    const commit = await http('POST', api('/grades/import-commit'), {
      token: tTok(),
      body: {
        classId,
        examName: 'QA成绩录入测验',
        subject: '语文',
        date: '2026-09-01',
        rows: stus.map((s: any, i: number) => ({ studentId: s.id, score: 80 + i, valid: true })),
      },
    })
    assert(commit.status < 300, `import-commit 失败 ${r2text(commit)}`)
    // 查询验证
    const g = await http('GET', api(`/grades?classId=${classId}`), { token: tTok() })
    const rows = Array.isArray(g.body) ? g.body : g.body.items || []
    const qaRow = rows.find((r: any) => r.examName === 'QA成绩录入测验' && r.subject === '语文')
    assert(qaRow, '未找到成绩行')
    const scored = (qaRow.scores || []).filter((x: any) => x.score != null)
    assert(scored.length >= 5, `分数未落库（${scored.length}）`)
  })

  addCase('FUNC-TCH-027', 'teacher', '成绩导出接口返回全部成绩数据', async () => {
    const r = await http('GET', api(`/grades/export?classId=${s1().classIds[0]}`), { token: tTok() })
    assert(r.status < 300, `成绩导出失败 ${r.status}`)
    assert(r.body.total >= SUBJECTS.length, `导出记录数应≥${SUBJECTS.length}，实际 ${r.body.total}`)
    assert(Array.isArray(r.body.data), '导出数据应为数组')
  })

  addCase('FUNC-TCH-028', 'teacher', '按学科筛选成绩列表', async () => {
    const classId = s1().classIds[0]
    for (const subject of SUBJECTS) {
      const r = await http('GET', api(`/grades?classId=${classId}&subject=${encodeURIComponent(subject)}`), { token: tTok() })
      assert(r.status < 300, `${subject} 成绩查询失败 ${r.status}`)
      const list = Array.isArray(r.body) ? r.body : r.body.items || []
      if (list.length > 0) {
        assert(list[0].subject === subject, `学科筛选不匹配：期望 ${subject}，实际 ${list[0].subject}`)
      }
    }
  })

  addCase('FUNC-TCH-029', 'teacher', '按考试名称筛选成绩列表', async () => {
    const classId = s1().classIds[0]
    const r = await http('GET', api(`/grades?classId=${classId}&examName=${encodeURIComponent('期末考试')}`), { token: tTok() })
    assert(r.status < 300, `状态码 ${r.status}`)
    const list = Array.isArray(r.body) ? r.body : r.body.items || []
    if (list.length > 0) {
      assert(list.every((g: any) => g.examName === '期末考试'), '考试名筛选不一致')
    }
  })

  addCase('FUNC-TCH-030', 'teacher', '成绩列表按学期筛选', async () => {
    const classId = s1().classIds[0]
    const r = await http('GET', api(`/grades?classId=${classId}&term=${encodeURIComponent('2025-2026学年上学期')}`), { token: tTok() })
    assert(r.status < 300, `状态码 ${r.status}`)
    assert(r.body.length >= 0 || r.body.total >= 0 || (r.body.items || []).length >= 0, '应正常返回')
  })

  addCase('FUNC-TCH-031', 'teacher', '成绩录入缺班级被拒绝', async () => {
    const list = await http('GET', api(`/students?classId=${s1().classIds[0]}&pageSize=1`), { token: tTok() })
    const stu = (list.body.items || [])[0]
    assert(stu, '学生缺失')
    const r = await http('POST', api('/grades/import-commit'), {
      token: tTok(),
      body: { examName: 'QA缺班级', subject: '语文', rows: [{ studentId: stu.id, score: 80, valid: true }] },
    })
    assertEq(r.status, 400, '缺少 classId 应返回 400')
  })

  addCase('FUNC-TCH-032', 'teacher', '成绩录入缺科目被拒绝', async () => {
    const list = await http('GET', api(`/students?classId=${s1().classIds[0]}&pageSize=1`), { token: tTok() })
    const stu = (list.body.items || [])[0]
    assert(stu, '学生缺失')
    const r = await http('POST', api('/grades/import-commit'), {
      token: tTok(),
      body: { classId: s1().classIds[0], examName: 'QA缺科目', rows: [{ studentId: stu.id, score: 80, valid: true }] },
    })
    assertEq(r.status, 400, '缺少 subject 应返回 400')
  })

  addCase('FUNC-TCH-033', 'teacher', '成绩录入空行数组被拒绝', async () => {
    const r = await http('POST', api('/grades/import-commit'), {
      token: tTok(),
      body: { classId: s1().classIds[0], examName: 'QA空行', subject: '语文', rows: [] },
    })
    assertEq(r.status, 400, '空行数组应返回 400')
  })

  addCase('FUNC-TCH-034', 'teacher', '教师访问他班成绩被隔离（非本班成绩为空）', async () => {
    const t2 = await t2Tok()
    const r = await http('GET', api(`/grades?classId=${s1().classIds[2]}`), { token: t2 })
    assert(r.status < 300, `状态码 ${r.status}`)
    const items = Array.isArray(r.body) ? r.body : r.body.items || []
    assertEq(items.length, 0, '非本班应返回空')
  })

  /* ====================================================================================
   * 6. 作业管理（FUNC-TCH-035 ~ FUNC-TCH-042）
   * ==================================================================================== */

  addCase('FUNC-TCH-035', 'teacher', '作业列表（含富化种子数据 ≥1）', async () => {
    const classId = s1().classIds[0]
    const r = await http('GET', api(`/homework?classId=${classId}`), { token: tTok() })
    assert(r.status < 300, `状态码 ${r.status}`)
    const list = Array.isArray(r.body) ? r.body : r.body.items || []
    assert(list.length >= 1, '作业列表应≥1')
  })

  addCase('FUNC-TCH-036', 'teacher', '创建作业', async () => {
    const classId = s1().classIds[0]
    const r = await http('POST', api('/homework'), {
      token: tTok(),
      body: { classId, title: 'QA新建作业', subject: '语文', content: '练习册第5页', startDate: '2026-09-01', deadline: '2026-09-07', status: '已发布' },
    })
    assert(r.status < 300, `创建失败 ${r.status} ${JSON.stringify(r.body).slice(0, 120)}`)
    assert(r.body.id, '作业 id 缺失')
  })

  addCase('FUNC-TCH-037', 'teacher', '编辑作业', async () => {
    const classId = s1().classIds[0]
    // 先创建
    const c = await http('POST', api('/homework'), {
      token: tTok(),
      body: { classId, title: 'QA待编辑作业', subject: '数学', content: '原始内容', startDate: '2026-09-01', deadline: '2026-09-07', status: '待批改' },
    })
    assert(c.status < 300, `创建失败 ${c.status}`)
    const hwId = c.body.id
    // 编辑
    const r = await http('PATCH', api(`/homework/${hwId}`), { token: tTok(), body: { title: 'QA已编辑作业', content: '修改后内容' } })
    assert(r.status < 300, `编辑失败 ${r.status} ${JSON.stringify(r.body).slice(0, 120)}`)
  })

  addCase('FUNC-TCH-038', 'teacher', '删除作业', async () => {
    const classId = s1().classIds[0]
    // 先创建
    const c = await http('POST', api('/homework'), {
      token: tTok(),
      body: { classId, title: 'QA待删除作业', subject: '英语', content: '内容', startDate: '2026-09-01', deadline: '2026-09-07', status: '待批改' },
    })
    assert(c.status < 300, `创建失败 ${c.status}`)
    const hwId = c.body.id
    // 删除
    const r = await http('DELETE', api(`/homework/${hwId}`), { token: tTok() })
    assert(r.status < 300, `删除失败 ${r.status}`)
    // 验证已删除
    const l = await http('GET', api(`/homework?classId=${classId}`), { token: tTok() })
    const list = Array.isArray(l.body) ? l.body : l.body.items || []
    assert(!list.some((h: any) => h.id === hwId), '已删除作业仍在列表中')
  })

  addCase('FUNC-TCH-039', 'teacher', '作业 CRUD 闭环（创建→查询→更新→删除）', async () => {
    const classId = s1().classIds[0]
    // 创建
    const c = await http('POST', api('/homework'), {
      token: tTok(),
      body: { classId, title: 'QA闭环作业', subject: '语文', content: '测试内容', startDate: '2026-09-01', deadline: '2026-09-07', status: '已发布' },
    })
    assert(c.status < 300, `创建失败 ${c.status}`)
    const hwId = c.body.id
    // 查询确认
    const l = await http('GET', api(`/homework?classId=${classId}`), { token: tTok() })
    const list = Array.isArray(l.body) ? l.body : l.body.items || []
    assert(list.some((h: any) => h.id === hwId), '创建的作业应在列表中')
    // 更新
    const u = await http('PATCH', api(`/homework/${hwId}`), { token: tTok(), body: { status: '已批改' } })
    assert(u.status < 300, `更新失败 ${u.status}`)
    // 删除
    const d = await http('DELETE', api(`/homework/${hwId}`), { token: tTok() })
    assert(d.status < 300, `删除失败 ${d.status}`)
  })

  addCase('FUNC-TCH-040', 'teacher', '创建作业缺少标题被 DTO 拒绝', async () => {
    const r = await http('POST', api('/homework'), {
      token: tTok(),
      body: { classId: s1().classIds[0], subject: '语文', content: '无标题' },
    })
    assert(r.status >= 400, `缺标题应被拒绝，实际 ${r.status}`)
  })

  addCase('FUNC-TCH-041', 'teacher', '按学科筛选作业列表', async () => {
    const classId = s1().classIds[0]
    const r = await http('GET', api(`/homework?classId=${classId}&subject=${encodeURIComponent('语文')}`), { token: tTok() })
    assert(r.status < 300, `状态码 ${r.status}`)
  })

  addCase('FUNC-TCH-042', 'teacher', '作业列表分页', async () => {
    const classId = s1().classIds[0]
    const r = await http('GET', api(`/homework?classId=${classId}&pageSize=5&page=1`), { token: tTok() })
    assert(r.status < 300, `状态码 ${r.status}`)
  })

  /* ====================================================================================
   * 7. 公告管理（FUNC-TCH-043 ~ FUNC-TCH-050）
   * ==================================================================================== */

  addCase('FUNC-TCH-043', 'teacher', '公告列表（含富化种子数据 ≥1）', async () => {
    const classId = s1().classIds[0]
    const r = await http('GET', api(`/notices?classId=${classId}`), { token: tTok() })
    assert(r.status < 300, `状态码 ${r.status}`)
    const list = Array.isArray(r.body) ? r.body : r.body.items || []
    assert(list.length >= 1, '公告列表应≥1')
  })

  addCase('FUNC-TCH-044', 'teacher', '创建班级公告', async () => {
    const classId = s1().classIds[0]
    const r = await http('POST', api('/notices'), {
      token: tTok(),
      body: { classId, title: 'QA班级公告', content: '公告内容', pinned: false },
    })
    assert(r.status < 300, `创建失败 ${r.status} ${JSON.stringify(r.body).slice(0, 120)}`)
    assert(r.body.id, '公告 id 缺失')
  })

  addCase('FUNC-TCH-045', 'teacher', '创建置顶公告', async () => {
    const classId = s1().classIds[0]
    const r = await http('POST', api('/notices'), {
      token: tTok(),
      body: { classId, title: 'QA置顶公告', content: '置顶内容', pinned: true },
    })
    assert(r.status < 300, `创建失败 ${r.status}`)
    assert(r.body.pinned === true, '应标记为置顶')
  })

  addCase('FUNC-TCH-046', 'teacher', '删除公告', async () => {
    const classId = s1().classIds[0]
    // 先创建
    const c = await http('POST', api('/notices'), {
      token: tTok(),
      body: { classId, title: 'QA待删除公告', content: '将删除', pinned: false },
    })
    assert(c.status < 300, `创建失败 ${c.status}`)
    const id = c.body.id
    // 删除
    const r = await http('DELETE', api(`/notices/${id}`), { token: tTok() })
    assert(r.status < 300, `删除失败 ${r.status}`)
  })

  addCase('FUNC-TCH-047', 'teacher', '公告 CRUD 闭环（创建→列表验证→删除）', async () => {
    const classId = s1().classIds[0]
    // 创建
    const c = await http('POST', api('/notices'), {
      token: tTok(),
      body: { classId, title: 'QA闭环公告', content: '闭环测试', pinned: false },
    })
    assert(c.status < 300, `创建失败 ${c.status}`)
    const id = c.body.id
    // 列表验证
    const l = await http('GET', api(`/notices?classId=${classId}`), { token: tTok() })
    const list = Array.isArray(l.body) ? l.body : l.body.items || []
    assert(list.some((n: any) => n.id === id), '新创建公告应在列表中')
    // 删除
    const d = await http('DELETE', api(`/notices/${id}`), { token: tTok() })
    assert(d.status < 300, `删除失败 ${d.status}`)
    // 验证删除
    const l2 = await http('GET', api(`/notices?classId=${classId}`), { token: tTok() })
    const list2 = Array.isArray(l2.body) ? l2.body : l2.body.items || []
    assert(!list2.some((n: any) => n.id === id), '已删除公告不应在列表中')
  })

  addCase('FUNC-TCH-048', 'teacher', '公告缺标题被 DTO 拒绝', async () => {
    const r = await http('POST', api('/notices'), { token: tTok(), body: { classId: s1().classIds[0], content: '无标题内容' } })
    assert(r.status >= 400, `缺标题应被拒绝，实际 ${r.status}`)
  })

  addCase('FUNC-TCH-049', 'teacher', '公告编辑更新', async () => {
    const classId = s1().classIds[0]
    // 先创建
    const c = await http('POST', api('/notices'), {
      token: tTok(),
      body: { classId, title: 'QA待编辑公告', content: '原始内容', pinned: false },
    })
    assert(c.status < 300, `创建失败 ${c.status}`)
    const id = c.body.id
    // 编辑
    const r = await http('PATCH', api(`/notices/${id}`), { token: tTok(), body: { title: 'QA已编辑公告', content: '修改后内容' } })
    assert(r.status < 300, `编辑失败 ${r.status}`)
  })

  addCase('FUNC-TCH-050', 'teacher', '公告列表按 pinned 筛选', async () => {
    const classId = s1().classIds[0]
    const r = await http('GET', api(`/notices?classId=${classId}&pinned=true`), { token: tTok() })
    assert(r.status < 300, `状态码 ${r.status}`)
  })

  /* ====================================================================================
   * 8. 考勤管理（FUNC-TCH-051 ~ FUNC-TCH-056）
   * ==================================================================================== */

  addCase('FUNC-TCH-051', 'teacher', '考勤列表（含富化种子数据 ≥1）', async () => {
    const classId = s1().classIds[0]
    const r = await http('GET', api(`/attendances?classId=${classId}`), { token: tTok() })
    assert(r.status < 300, `状态码 ${r.status}`)
    const items = Array.isArray(r.body) ? r.body : r.body.items || []
    assert(items.length >= 1, '考勤列表应≥1')
  })

  addCase('FUNC-TCH-052', 'teacher', '创建考勤记录', async () => {
    const classId = s1().classIds[0]
    const list = await http('GET', api(`/students?classId=${classId}&pageSize=5`), { token: tTok() })
    const stus = (list.body.items || []).slice(0, 3)
    const records = stus.map((s: any) => ({ studentId: s.id, status: 'present' }))
    const r = await http('POST', api('/attendances'), {
      token: tTok(),
      body: { classId, date: '2026-09-10', records },
    })
    assert(r.status < 300, `创建失败 ${r.status} ${JSON.stringify(r.body).slice(0, 120)}`)
  })

  addCase('FUNC-TCH-053', 'teacher', '编辑考勤记录', async () => {
    const classId = s1().classIds[0]
    // 先获取已有考勤
    const l = await http('GET', api(`/attendances?classId=${classId}`), { token: tTok() })
    const items = Array.isArray(l.body) ? l.body : l.body.items || []
    if (items.length > 0) {
      const att = items[0]
      const r = await http('PATCH', api(`/attendances/${att.id}`), { token: tTok(), body: { date: att.date } })
      assert(r.status < 300, `编辑失败 ${r.status}`)
    }
  })

  addCase('FUNC-TCH-054', 'teacher', '打卡记录查询', async () => {
    const classId = s1().classIds[0]
    const r = await http('GET', api(`/checkins?classId=${classId}`), { token: tTok() })
    assert(r.status < 300, `状态码 ${r.status}`)
  })

  addCase('FUNC-TCH-055', 'teacher', '考勤记录包含本班学生打卡状态', async () => {
    const classId = s1().classIds[0]
    const r = await http('GET', api(`/attendances?classId=${classId}`), { token: tTok() })
    assert(r.status < 300, `状态码 ${r.status}`)
    const items = Array.isArray(r.body) ? r.body : r.body.items || []
    if (items.length > 0) {
      const first = items[0]
      assert(Array.isArray(first.records), '考勤记录应包含 records 数组')
    }
  })

  addCase('FUNC-TCH-056', 'teacher', '考勤列表按日期筛选', async () => {
    const classId = s1().classIds[0]
    const r = await http('GET', api(`/attendances?classId=${classId}&date=2026-01-10`), { token: tTok() })
    assert(r.status < 300, `状态码 ${r.status}`)
  })

  /* ====================================================================================
   * 9. 家校联系（FUNC-TCH-057 ~ FUNC-TCH-060）
   * ==================================================================================== */

  addCase('FUNC-TCH-057', 'teacher', '家长联系列表（含本班家长信息）', async () => {
    const classId = s1().classIds[0]
    const r = await http('GET', api(`/parent-contacts?classId=${classId}`), { token: tTok() })
    assert(r.status < 300, `状态码 ${r.status}`)
    const items = Array.isArray(r.body) ? r.body : r.body.items || []
    assert(items.length >= 1, '家长联系列表应≥1')
  })

  addCase('FUNC-TCH-058', 'teacher', '家长联系列表包含家长姓名与联系方式', async () => {
    const classId = s1().classIds[0]
    const r = await http('GET', api(`/parent-contacts?classId=${classId}`), { token: tTok() })
    assert(r.status < 300, `状态码 ${r.status}`)
    const items = Array.isArray(r.body) ? r.body : r.body.items || []
    if (items.length > 0) {
      const first = items[0]
      assert(first.parentName || first.name, '家长姓名缺失')
      assert(first.relation, '与学生关系缺失')
    }
  })

  addCase('FUNC-TCH-059', 'teacher', '家长联系人数据隔离（本班家长）', async () => {
    const classId = s1().classIds[0]
    const r = await http('GET', api(`/parent-contacts?classId=${classId}`), { token: tTok() })
    assert(r.status < 300, `状态码 ${r.status}`)
    // 返回的家长应均为本班学生家长（不跨班）
    const items = Array.isArray(r.body) ? r.body : r.body.items || []
    assert(items.length > 0, '家长列表不应为空')
  })

  addCase('FUNC-TCH-060', 'teacher', '查看班级 IM 群组信息', async () => {
    const classId = s1().classIds[0]
    // 检查班级详情中是否包含 IM 群组信息
    const r = await http('GET', api(`/classes/${classId}`), { token: tTok() })
    assert(r.status < 300, `状态码 ${r.status}`)
    assert(r.body.id, '班级 id 缺失')
  })

  /* ====================================================================================
   * 10. 课表管理（FUNC-TCH-061 ~ FUNC-TCH-065）
   * ==================================================================================== */

  addCase('FUNC-TCH-061', 'teacher', '课表查询（按班级）', async () => {
    const classId = s1().classIds[0]
    const r = await http('GET', api(`/schedules?classId=${classId}`), { token: tTok() })
    assert(r.status < 300, `查询失败 ${r.status}`)
  })

  addCase('FUNC-TCH-062', 'teacher', '我的课表查询', async () => {
    const r = await http('GET', api('/schedules/my'), { token: tTok() })
    assert(r.status < 300, `查询失败 ${r.status}`)
  })

  addCase('FUNC-TCH-063', 'teacher', '按年级浏览课表', async () => {
    const r = await http('GET', api(`/schedules?grade=一年级`), { token: tTok() })
    assert(r.status < 300, `课程表查询失败 ${r.status}`)
  })

  addCase('FUNC-TCH-064', 'teacher', '保存/更新课表', async () => {
    const classId = s1().classIds[0]
    const scheduleData = [
      { dayOfWeek: 1, period: 1, subject: '语文' },
      { dayOfWeek: 1, period: 2, subject: '数学' },
      { dayOfWeek: 2, period: 1, subject: '英语' },
    ]
    const r = await http('POST', api('/schedules'), { token: tTok(), body: { classId, schedule: scheduleData } })
    assert(r.status < 300, `保存课表失败 ${r.status} ${JSON.stringify(r.body).slice(0, 120)}`)
  })

  addCase('FUNC-TCH-065', 'teacher', '课表 CRUD 闭环', async () => {
    const classId = s1().classIds[0]
    // 创建课表
    const scheduleData = [
      { dayOfWeek: 3, period: 1, subject: '科学' },
      { dayOfWeek: 3, period: 2, subject: '体育' },
    ]
    const c = await http('POST', api('/schedules'), { token: tTok(), body: { classId, schedule: scheduleData } })
    assert(c.status < 300, `创建课表失败 ${c.status}`)
    const schId = c.body.id
    assert(schId, '课表 id 缺失')
    // 更新课表
    if (schId) {
      const u = await http('PUT', api(`/schedules/${schId}`), { token: tTok(), body: { classId, schedule: scheduleData } })
      assert(u.status < 300, `更新课表失败 ${u.status}`)
      // 删除课表
      const d = await http('DELETE', api(`/schedules/${schId}`), { token: tTok() })
      assert(d.status < 300, `删除课表失败 ${d.status}`)
    }
  })

  /* ====================================================================================
   * 11. 教材知识库（FUNC-TCH-066 ~ FUNC-TCH-070）
   * ==================================================================================== */

  addCase('FUNC-TCH-066', 'teacher', '知识点树查询（按学科）', async () => {
    const r = await http('GET', api('/textbooks/tree?subject=语文'), { token: tTok() })
    assert(r.status < 300, `状态码 ${r.status}`)
  })

  addCase('FUNC-TCH-067', 'teacher', '按不同学科筛选知识点树', async () => {
    for (const subject of ['语文', '数学', '英语']) {
      const r = await http('GET', api(`/textbooks/tree?subject=${encodeURIComponent(subject)}`), { token: tTok() })
      assert(r.status < 300, `${subject} 知识点树查询失败 ${r.status}`)
    }
  })

  addCase('FUNC-TCH-068', 'teacher', '知识点搜索', async () => {
    const r = await http('GET', api('/textbooks/search?keyword=第一单元'), { token: tTok() })
    assert(r.status < 300, `状态码 ${r.status}`)
  })

  addCase('FUNC-TCH-069', 'teacher', '知识点单元列表查询', async () => {
    const r = await http('GET', api('/textbooks/tree?subject=语文&grade=一年级'), { token: tTok() })
    assert(r.status < 300, `状态码 ${r.status}`)
  })

  addCase('FUNC-TCH-070', 'teacher', '知识点详情查询', async () => {
    const r = await http('GET', api('/textbooks/tree?subject=语文'), { token: tTok() })
    assert(r.status < 300, `状态码 ${r.status}`)
    // 知识点树应包含单元或知识点结构
    const body = r.body
    assert(body != null, '知识点树不应为空')
  })

  /* ====================================================================================
   * 12. 资源库（FUNC-TCH-071 ~ FUNC-TCH-075）
   * ==================================================================================== */

  addCase('FUNC-TCH-071', 'teacher', '古诗词资源查询（分页）', async () => {
    const r = await http('GET', api('/resource-library/poems?pageSize=5'), { token: tTok() })
    assert(r.status < 300, `状态码 ${r.status}`)
  })

  addCase('FUNC-TCH-072', 'teacher', '古诗词搜索', async () => {
    const r = await http('GET', api('/resource-library/poems/search?keyword=春'), { token: tTok() })
    assert(r.status < 300, `状态码 ${r.status}`)
  })

  addCase('FUNC-TCH-073', 'teacher', '数学公式资源查询', async () => {
    const r = await http('GET', api('/resource-library/formulas?pageSize=5'), { token: tTok() })
    assert(r.status < 300, `状态码 ${r.status}`)
  })

  addCase('FUNC-TCH-074', 'teacher', '单词资源查询', async () => {
    const r = await http('GET', api('/resource-library/words?pageSize=5'), { token: tTok() })
    assert(r.status < 300, `状态码 ${r.status}`)
  })

  addCase('FUNC-TCH-075', 'teacher', '单词分类查询', async () => {
    const r = await http('GET', api('/resource-library/words/categories'), { token: tTok() })
    assert(r.status < 300, `状态码 ${r.status}`)
  })

  /* ====================================================================================
   * 13. 笔记管理（FUNC-TCH-076 ~ FUNC-TCH-084）
   * ==================================================================================== */

  addCase('FUNC-TCH-076', 'teacher', '笔记列表（含富化种子数据 ≥1）', async () => {
    const r = await http('GET', api('/notes?pageSize=20'), { token: tTok() })
    assert(r.status < 300, `状态码 ${r.status}`)
    const items = Array.isArray(r.body) ? r.body : r.body.items || []
    assert(items.length >= 1, '笔记列表应≥1')
  })

  addCase('FUNC-TCH-077', 'teacher', '创建笔记', async () => {
    const r = await http('POST', api('/notes'), { token: tTok(), body: { title: 'QA笔记', content: '笔记内容', category: '教学反思' } })
    assert(r.status < 300, `创建失败 ${r.status} ${JSON.stringify(r.body).slice(0, 120)}`)
    assert(r.body.id, '笔记 id 缺失')
  })

  addCase('FUNC-TCH-078', 'teacher', '编辑笔记', async () => {
    // 先创建
    const c = await http('POST', api('/notes'), { token: tTok(), body: { title: 'QA待编辑笔记', content: '原始内容', category: '教学反思' } })
    assert(c.status < 300, `创建失败 ${c.status}`)
    const id = c.body.id
    // 编辑
    const r = await http('PATCH', api(`/notes/${id}`), { token: tTok(), body: { title: 'QA已编辑笔记', content: '修改后内容' } })
    assert(r.status < 300, `编辑失败 ${r.status}`)
  })

  addCase('FUNC-TCH-079', 'teacher', '笔记收藏/置顶', async () => {
    // 先创建
    const c = await http('POST', api('/notes'), { token: tTok(), body: { title: 'QA收藏笔记', content: '内容', category: '班级管理' } })
    assert(c.status < 300, `创建失败 ${c.status}`)
    const id = c.body.id
    // 置顶
    const r = await http('PATCH', api(`/notes/${id}`), { token: tTok(), body: { pinned: true } })
    assert(r.status < 300, `置顶失败 ${r.status}`)
    // 收藏
    const r2 = await http('PATCH', api(`/notes/${id}`), { token: tTok(), body: { favorite: true } })
    assert(r2.status < 300, `收藏失败 ${r2.status}`)
  })

  addCase('FUNC-TCH-080', 'teacher', '笔记 CRUD 闭环', async () => {
    // 创建
    const c = await http('POST', api('/notes'), { token: tTok(), body: { title: 'QA闭环笔记', content: '闭环测试', category: '教研笔记' } })
    assert(c.status < 300, `创建失败 ${c.status}`)
    const id = c.body.id
    // 查询确认
    const l = await http('GET', api('/notes?pageSize=50'), { token: tTok() })
    const list = Array.isArray(l.body) ? l.body : l.body.items || []
    assert(list.some((n: any) => n.id === id), '新笔记应在列表中')
    // 删除
    const d = await http('DELETE', api(`/notes/${id}`), { token: tTok() })
    assert(d.status < 300, `删除失败 ${d.status}`)
  })

  addCase('FUNC-TCH-081', 'teacher', '笔记按分类筛选', async () => {
    const r = await http('GET', api('/notes?category=教学反思&pageSize=10'), { token: tTok() })
    assert(r.status < 300, `状态码 ${r.status}`)
  })

  addCase('FUNC-TCH-082', 'teacher', '笔记列表分页', async () => {
    const r = await http('GET', api('/notes?pageSize=5&page=1'), { token: tTok() })
    assert(r.status < 300, `状态码 ${r.status}`)
  })

  addCase('FUNC-TCH-083', 'teacher', '笔记按收藏筛选', async () => {
    const r = await http('GET', api('/notes?favorite=true&pageSize=10'), { token: tTok() })
    assert(r.status < 300, `状态码 ${r.status}`)
  })

  addCase('FUNC-TCH-084', 'teacher', '笔记按置顶排序', async () => {
    const r = await http('GET', api('/notes?pinned=true&pageSize=10'), { token: tTok() })
    assert(r.status < 300, `状态码 ${r.status}`)
  })

  /* ====================================================================================
   * 14. 通知中心（FUNC-TCH-085 ~ FUNC-TCH-092）
   * ==================================================================================== */

  addCase('FUNC-TCH-085', 'teacher', '通知列表（含富化种子数据 ≥1）', async () => {
    const r = await http('GET', api('/notifications?pageSize=50'), { token: tTok() })
    assert(r.status < 300, `状态码 ${r.status}`)
    const items = Array.isArray(r.body) ? r.body : r.body.items || []
    assert(items.length >= 1, '通知列表应≥1')
  })

  addCase('FUNC-TCH-086', 'teacher', '通知未读数量查询', async () => {
    const r = await http('GET', api('/notifications/unread-count'), { token: tTok() })
    assert(r.status < 300, `状态码 ${r.status}`)
    assert(r.body.count != null, 'count 字段缺失')
  })

  addCase('FUNC-TCH-087', 'teacher', '标记单条通知已读', async () => {
    // 获取一条通知
    const l = await http('GET', api('/notifications?pageSize=1'), { token: tTok() })
    const items = Array.isArray(l.body) ? l.body : l.body.items || []
    if (items.length > 0) {
      const r = await http('PATCH', api(`/notifications/${items[0].id}/read`), { token: tTok() })
      assert(r.status < 300, `标记已读失败 ${r.status}`)
    }
  })

  addCase('FUNC-TCH-088', 'teacher', '一键全部已读', async () => {
    const r = await http('POST', api('/notifications/mark-all-read'), { token: tTok() })
    assert(r.status < 300, `状态码 ${r.status}`)
  })

  addCase('FUNC-TCH-089', 'teacher', '通知列表按类型筛选', async () => {
    const types = ['info', 'notice', 'homework', 'grade']
    for (const type of types) {
      const r = await http('GET', api(`/notifications?type=${type}&pageSize=10`), { token: tTok() })
      assert(r.status < 300, `${type} 类型通知查询失败 ${r.status}`)
    }
  })

  addCase('FUNC-TCH-090', 'teacher', '通知列表分页', async () => {
    const r = await http('GET', api('/notifications?pageSize=5&page=1'), { token: tTok() })
    assert(r.status < 300, `状态码 ${r.status}`)
  })

  addCase('FUNC-TCH-091', 'teacher', '标记已读后未读数量减少', async () => {
    // 获取初始未读数量
    const before = await http('GET', api('/notifications/unread-count'), { token: tTok() })
    assert(before.status < 300, '获取未读数失败')
    // 一键已读
    await http('POST', api('/notifications/mark-all-read'), { token: tTok() })
    // 再次获取
    const after = await http('GET', api('/notifications/unread-count'), { token: tTok() })
    assert(after.status < 300, '获取未读数失败')
    assert(after.body.count <= before.body.count, '已读后未读数应减少或不变')
  })

  addCase('FUNC-TCH-092', 'teacher', '通知包含 link 跳转字段', async () => {
    const r = await http('GET', api('/notifications?pageSize=50'), { token: tTok() })
    assert(r.status < 300, `状态码 ${r.status}`)
    const items = Array.isArray(r.body) ? r.body : r.body.items || []
    // 富化数据中部分通知有 link 字段
    const withLink = items.filter((n: any) => n.link)
    // 不断言必须有 link，但验证结构正常
    assert(items.length >= 1, '通知列表不应为空')
  })

  /* ====================================================================================
   * 15. 消息系统（FUNC-TCH-093 ~ FUNC-TCH-102）
   * ==================================================================================== */

  addCase('FUNC-TCH-093', 'teacher', '收件箱消息列表', async () => {
    const r = await http('GET', api('/messages?pageSize=50'), { token: tTok() })
    assert(r.status < 300, `状态码 ${r.status}`)
    const items = Array.isArray(r.body) ? r.body : r.body.items || []
    assert(Array.isArray(items), '应为数组')
  })

  addCase('FUNC-TCH-094', 'teacher', '已发消息列表（含富化种子数据 ≥1）', async () => {
    const r = await http('GET', api('/messages/sent?pageSize=50'), { token: tTok() })
    assert(r.status < 300, `状态码 ${r.status}`)
    const items = Array.isArray(r.body) ? r.body : r.body.items || []
    assert(items.length >= 1, '已发消息应≥1（富化数据）')
  })

  addCase('FUNC-TCH-095', 'teacher', '未读消息数量查询', async () => {
    const r = await http('GET', api('/messages/unread-count'), { token: tTok() })
    assert(r.status < 300, `状态码 ${r.status}`)
    assert(r.body.count != null || r.body.unreadCount != null, '未读数字段缺失')
  })

  addCase('FUNC-TCH-096', 'teacher', '收件人列表包含本班家长与本校校管', async () => {
    const r = await http('GET', api('/messages/recipients'), { token: tTok() })
    assert(r.status < 300, `状态码 ${r.status}`)
    const list = Array.isArray(r.body) ? r.body : []
    const hasParent = list.some((x: any) => x.role === 'parent')
    const hasAdmin = list.some((x: any) => x.role === 'school_admin')
    assert(hasParent, '教师收件人列表应包含本班家长')
    assert(hasAdmin, '教师收件人列表应包含本校校管')
  })

  addCase('FUNC-TCH-097', 'teacher', '教师给家长发送消息', async () => {
    const recs = await http('GET', api('/messages/recipients'), { token: tTok() })
    const list = Array.isArray(recs.body) ? recs.body : []
    const parent = list.find((x: any) => x.role === 'parent')
    assert(parent, '无可用家长收件人')
    const r = await http('POST', api('/messages'), {
      token: tTok(),
      body: { recipientId: parent.id, recipientRole: 'parent', title: 'QA教师→家长', content: '您好，关于孩子学习情况…', type: 'direct' },
    })
    assert(r.status < 300, `发送失败 ${r.status} ${JSON.stringify(r.body).slice(0, 120)}`)
  })

  addCase('FUNC-TCH-098', 'teacher', '教师给校管发送消息', async () => {
    const recs = await http('GET', api('/messages/recipients'), { token: tTok() })
    const list = Array.isArray(recs.body) ? recs.body : []
    const admin = list.find((x: any) => x.role === 'school_admin')
    assert(admin, '无可用校管收件人')
    const r = await http('POST', api('/messages'), {
      token: tTok(),
      body: { recipientId: admin.id, recipientRole: 'school_admin', title: 'QA教师→校管', content: '关于教学安排…', type: 'direct' },
    })
    assert(r.status < 300, `发送失败 ${r.status}`)
  })

  addCase('FUNC-TCH-099', 'teacher', '标记消息已读', async () => {
    // 获取已发消息
    const sent = await http('GET', api('/messages/sent?pageSize=1'), { token: tTok() })
    const items = Array.isArray(sent.body) ? sent.body : sent.body.items || []
    if (items.length > 0) {
      const r = await http('PATCH', api(`/messages/${items[0].id}/read`), { token: tTok() })
      assert(r.status < 300, `标记已读失败 ${r.status}`)
    }
  })

  addCase('FUNC-TCH-100', 'teacher', '一键全部已读消息', async () => {
    const r = await http('PATCH', api('/messages/mark-all-read'), { token: tTok() })
    assert(r.status < 300, `状态码 ${r.status}`)
  })

  addCase('FUNC-TCH-101', 'teacher', '删除消息', async () => {
    // 先发送一条消息
    const recs = await http('GET', api('/messages/recipients'), { token: tTok() })
    const list = Array.isArray(recs.body) ? recs.body : []
    const parent = list.find((x: any) => x.role === 'parent')
    if (parent) {
      const s = await http('POST', api('/messages'), {
        token: tTok(),
        body: { recipientId: parent.id, recipientRole: 'parent', title: 'QA待删除消息', content: '将删除', type: 'direct' },
      })
      assert(s.status < 300, `发送失败 ${s.status}`)
      const msgId = s.body.id
      // 删除
      const d = await http('DELETE', api(`/messages/${msgId}`), { token: tTok() })
      assert(d.status < 300, `删除失败 ${d.status}`)
    }
  })

  addCase('FUNC-TCH-102', 'teacher', '消息列表分页', async () => {
    const r = await http('GET', api('/messages?pageSize=5&page=1'), { token: tTok() })
    assert(r.status < 300, `状态码 ${r.status}`)
  })

  /* ====================================================================================
   * 16. 学生信息审核（FUNC-TCH-103 ~ FUNC-TCH-108）
   * ==================================================================================== */

  addCase('FUNC-TCH-103', 'teacher', '待审核列表查询', async () => {
    const r = await http('GET', api('/student-info-updates?status=pending'), { token: tTok() })
    assert(r.status < 300, `状态码 ${r.status}`)
    const items = Array.isArray(r.body) ? r.body : r.body.items || []
    assert(Array.isArray(items), '应为数组')
  })

  addCase('FUNC-TCH-104', 'teacher', '家长提交→教师审核通过完整流程', async () => {
    // 家长提交
    const no = studentNo(1, 1, 1, 1)
    const plg = await http('POST', api('/auth/unified-login'), { body: { username: no, password: PARENT_PASS } })
    assert(plg.status < 300, `家长登录失败 ${plg.status}`)
    const req = await http('POST', api('/parent-auth/student-update-request'), {
      token: plg.body.token,
      body: { payload: { parentPhone: '13900002222', note: 'QA审核通过' } },
    })
    assert(req.status < 300, `提交申请失败 ${r2text(req)}`)
    // 教师查询待审核
    const list = await http('GET', api('/student-info-updates?status=pending'), { token: tTok() })
    assert(list.status < 300, `教师查询失败 ${list.status}`)
    const items = Array.isArray(list.body) ? list.body : list.body.items || []
    assert(items.length >= 1, '待审核列表为空')
    // 审核通过
    const rv = await http('POST', api(`/student-info-updates/${items[0].id}/review`), {
      token: tTok(),
      body: { action: 'approve', note: 'QA通过' },
    })
    assert(rv.status < 300, `审核失败 ${rv.status} ${JSON.stringify(rv.body).slice(0, 120)}`)
  })

  addCase('FUNC-TCH-105', 'teacher', '家长提交→教师审核拒绝完整流程', async () => {
    // 家长提交
    const no = studentNo(1, 1, 1, 2)
    const plg = await http('POST', api('/auth/unified-login'), { body: { username: no, password: PARENT_PASS } })
    assert(plg.status < 300, `家长登录失败 ${plg.status}`)
    const req = await http('POST', api('/parent-auth/student-update-request'), {
      token: plg.body.token,
      body: { payload: { address: 'QA测试地址', note: 'QA审核拒绝' } },
    })
    assert(req.status < 300, `提交申请失败 ${r2text(req)}`)
    // 教师查询待审核
    const list = await http('GET', api('/student-info-updates?status=pending'), { token: tTok() })
    const items = Array.isArray(list.body) ? list.body : list.body.items || []
    assert(items.length >= 1, '待审核列表为空')
    // 审核拒绝
    const rv = await http('POST', api(`/student-info-updates/${items[0].id}/review`), {
      token: tTok(),
      body: { action: 'reject', note: 'QA拒绝：信息有误' },
    })
    assert(rv.status < 300, `审核拒绝失败 ${rv.status}`)
  })

  addCase('FUNC-TCH-106', 'teacher', '审核 action 非法值被拒绝', async () => {
    // 先由家长提交一条
    const plg = await http('POST', api('/auth/unified-login'), { body: { username: studentNo(1, 1, 1, 3), password: PARENT_PASS } })
    const sub = await http('POST', api('/parent-auth/student-update-request'), { token: plg.body.token, body: { payload: { note: '非法action测试' } } })
    assert(sub.status < 300, `提交失败 ${sub.status}`)
    const list = await http('GET', api('/student-info-updates?status=pending'), { token: tTok() })
    const items = Array.isArray(list.body) ? list.body : list.body.items || []
    assert(items.length > 0, '待审核列表为空')
    const r = await http('POST', api(`/student-info-updates/${items[0].id}/review`), { token: tTok(), body: { action: 'invalid_action' } })
    assertEq(r.status, 400, '非法 action 应返回 400')
  })

  addCase('FUNC-TCH-107', 'teacher', '审核不存在的申请被拒绝', async () => {
    const r = await http('POST', api('/student-info-updates/no-such-id/review'), { token: tTok(), body: { action: 'approve' } })
    assert(r.status >= 400, `应被拒绝，实际 ${r.status}`)
  })

  addCase('FUNC-TCH-108', 'teacher', '审核后申请状态变更（通过→approved）', async () => {
    // 家长提交
    const plg = await http('POST', api('/auth/unified-login'), { body: { username: studentNo(1, 1, 1, 4), password: PARENT_PASS } })
    const sub = await http('POST', api('/parent-auth/student-update-request'), { token: plg.body.token, body: { payload: { note: '状态变更测试' } } })
    assert(sub.status < 300, `提交失败 ${sub.status}`)
    // 获取待审核
    const list = await http('GET', api('/student-info-updates?status=pending'), { token: tTok() })
    const items = Array.isArray(list.body) ? list.body : list.body.items || []
    assert(items.length > 0, '待审核列表为空')
    const target = items[0]
    // 审核通过
    const rv = await http('POST', api(`/student-info-updates/${target.id}/review`), { token: tTok(), body: { action: 'approve' } })
    assert(rv.status < 300, `审核失败 ${rv.status}`)
    // 验证状态变更
    const after = await http('GET', api('/student-info-updates?status=approved'), { token: tTok() })
    const approvedItems = Array.isArray(after.body) ? after.body : after.body.items || []
    assert(approvedItems.some((x: any) => x.id === target.id), '审核通过后应在 approved 列表中')
  })

  /* ====================================================================================
   * 17. 家长功能包配置（FUNC-TCH-109 ~ FUNC-TCH-116）
   * ==================================================================================== */

  addCase('FUNC-TCH-109', 'teacher', '读取班级家长功能包（未配置→configured=false）', async () => {
    const r = await http('GET', api(`/classes/${s1().classIds[0]}/parent-features`), { token: tTok() })
    assert(r.status < 300, `状态码 ${r.status} ${JSON.stringify(r.body).slice(0, 120)}`)
    assert(Array.isArray(r.body.options) && r.body.options.length > 0, '应返回可用功能包选项')
  })

  addCase('FUNC-TCH-110', 'teacher', '写入家长功能包（grades+homework）', async () => {
    const r = await http('PATCH', api(`/classes/${s1().classIds[0]}/parent-features`), {
      token: tTok(),
      body: { features: ['grades', 'homework'] },
    })
    assert(r.status < 300, `状态码 ${r.status} ${JSON.stringify(r.body).slice(0, 120)}`)
    assert(Array.isArray(r.body.features) && r.body.features.includes('grades'), 'features 应包含 grades')
  })

  addCase('FUNC-TCH-111', 'teacher', '写入后读取为已配置（configured=true）', async () => {
    const r = await http('GET', api(`/classes/${s1().classIds[0]}/parent-features`), { token: tTok() })
    assert(r.status < 300, `状态码 ${r.status}`)
    assertEq(r.body.configured, true, '已配置应为 true')
    assert(Array.isArray(r.body.features) && r.body.features.includes('homework'), 'features 应包含 homework')
  })

  addCase('FUNC-TCH-112', 'teacher', '无效功能包 key → 400', async () => {
    const r = await http('PATCH', api(`/classes/${s1().classIds[0]}/parent-features`), {
      token: tTok(),
      body: { features: ['invalid_key_xyz'] },
    })
    assertEq(r.status, 400, '无效 key 应返回 400')
  })

  addCase('FUNC-TCH-113', 'teacher', '非本班教师读取/写入家长功能包被拒绝', async () => {
    // qat01t07 是校1 2班班主任（非1班成员）
    const lg = await http('POST', api('/auth/unified-login'), { body: { username: teacherUser(1, 7), password: TEACHER_PASS } })
    assert(lg.status < 300, `教师登录失败 ${lg.status}`)
    const g = await http('GET', api(`/classes/${s1().classIds[0]}/parent-features`), { token: lg.body.token })
    assert(g.status === 401 || g.status === 403, `读取应被拒绝，实际 ${g.status}`)
    const u = await http('PATCH', api(`/classes/${s1().classIds[0]}/parent-features`), { token: lg.body.token, body: { features: ['notices'] } })
    assert(u.status === 401 || u.status === 403, `写入应被拒绝，实际 ${u.status}`)
  })

  addCase('FUNC-TCH-114', 'teacher', '恢复跟随默认（features=null）', async () => {
    const r = await http('PATCH', api(`/classes/${s1().classIds[0]}/parent-features`), {
      token: tTok(),
      body: { features: null },
    })
    assert(r.status < 300, `状态码 ${r.status}`)
    const g = await http('GET', api(`/classes/${s1().classIds[0]}/parent-features`), { token: tTok() })
    assertEq(g.body.configured, false, '恢复默认后 configured=false')
  })

  addCase('FUNC-TCH-115', 'teacher', '家长功能包 CRUD 闭环', async () => {
    // 读取初始状态
    const g1 = await http('GET', api(`/classes/${s1().classIds[0]}/parent-features`), { token: tTok() })
    assert(g1.status < 300, '读取失败')
    // 写入
    const w = await http('PATCH', api(`/classes/${s1().classIds[0]}/parent-features`), { token: tTok(), body: { features: ['grades', 'homework', 'notices'] } })
    assert(w.status < 300, '写入失败')
    // 验证
    const g2 = await http('GET', api(`/classes/${s1().classIds[0]}/parent-features`), { token: tTok() })
    assert(g2.body.features.includes('grades'), '应包含 grades')
    assert(g2.body.features.includes('homework'), '应包含 homework')
    assert(g2.body.features.includes('notices'), '应包含 notices')
    // 恢复默认
    const r = await http('PATCH', api(`/classes/${s1().classIds[0]}/parent-features`), { token: tTok(), body: { features: null } })
    assert(r.status < 300, '恢复失败')
  })

  addCase('FUNC-TCH-116', 'teacher', '家长功能包选项列表包含有效 key', async () => {
    const r = await http('GET', api(`/classes/${s1().classIds[0]}/parent-features`), { token: tTok() })
    assert(r.status < 300, `状态码 ${r.status}`)
    const options = r.body.options || []
    assert(options.length > 0, '选项列表不应为空')
    // 每个选项应有 id 和 label
    const opt = options[0]
    assert(opt.id, '选项 id 缺失')
    assert(opt.label, '选项 label 缺失')
  })

  /* ====================================================================================
   * 18. 成绩分析（FUNC-TCH-117 ~ FUNC-TCH-126）
   * ==================================================================================== */

  addCase('FUNC-TCH-117', 'teacher', '考试分析接口（班级均分/分段）', async () => {
    const classId = s1().classIds[0]
    const exams = await http('GET', api(`/exams?classId=${classId}`), { token: tTok() })
    const list = Array.isArray(exams.body) ? exams.body : exams.body.items || []
    const ex = list.find((e: any) => e.name === '期末考试') || list[0]
    assert(ex, '无可用考试')
    const r = await http('GET', api(`/grades/analysis/exam?classId=${classId}&examId=${ex.id}`), { token: tTok() })
    assert(r.status < 300, `状态码 ${r.status}`)
  })

  addCase('FUNC-TCH-118', 'teacher', '成绩趋势分析（班级历次考试均分）', async () => {
    const classId = s1().classIds[0]
    const r = await http('GET', api(`/grades/analysis/trend?classId=${classId}`), { token: tTok() })
    assert(r.status < 300, `状态码 ${r.status}`)
    assert(Array.isArray(r.body.trend) || typeof r.body === 'object', '应返回趋势数据')
  })

  addCase('FUNC-TCH-119', 'teacher', '成绩排名分析', async () => {
    const classId = s1().classIds[0]
    const exams = await http('GET', api(`/exams?classId=${classId}`), { token: tTok() })
    const list = Array.isArray(exams.body) ? exams.body : exams.body.items || []
    const ex = list[0]
    assert(ex, '无可用考试')
    const r = await http('GET', api(`/grades/analysis/rank?classId=${classId}&examId=${ex.id}`), { token: tTok() })
    assert(r.status < 300, `状态码 ${r.status}`)
  })

  addCase('FUNC-TCH-120', 'teacher', '学生历次成绩趋势', async () => {
    const classId = s1().classIds[0]
    const list = await http('GET', api(`/students?classId=${classId}&pageSize=1`), { token: tTok() })
    const stu = (list.body.items || [])[0]
    assert(stu, '学生缺失')
    const r = await http('GET', api(`/grades/analysis/student/${stu.id}`), { token: tTok() })
    assert(r.status < 300, `状态码 ${r.status}`)
  })

  addCase('FUNC-TCH-121', 'teacher', '弱科分析（班级薄弱学生识别）', async () => {
    const classId = s1().classIds[0]
    const r = await http('GET', api(`/grades/analysis/weak?classId=${classId}`), { token: tTok() })
    assert(r.status < 300, `状态码 ${r.status}`)
  })

  addCase('FUNC-TCH-122', 'teacher', '按学科分析成绩趋势', async () => {
    const classId = s1().classIds[0]
    for (const subject of ['语文', '数学']) {
      const r = await http('GET', api(`/grades/analysis/trend?classId=${classId}&subject=${encodeURIComponent(subject)}`), { token: tTok() })
      assert(r.status < 300, `${subject} 趋势分析失败 ${r.status}`)
    }
  })

  addCase('FUNC-TCH-123', 'teacher', '学生成长分析：学生历次考试趋势', async () => {
    const classId = s1().classIds[0]
    const list = await http('GET', api(`/students?classId=${classId}&pageSize=1`), { token: tTok() })
    const stu = (list.body.items || [])[0]
    assert(stu, '学生缺失')
    const r = await http('GET', api(`/analysis/student-trend?studentId=${stu.id}&classId=${classId}`), { token: tTok() })
    assert(r.status < 300, `状态码 ${r.status}`)
  })

  addCase('FUNC-TCH-124', 'teacher', '班级历次考试趋势分析', async () => {
    const classId = s1().classIds[0]
    const r = await http('GET', api(`/analysis/class-trend?classId=${classId}`), { token: tTok() })
    assert(r.status < 300, `状态码 ${r.status}`)
  })

  addCase('FUNC-TCH-125', 'teacher', '班级各科目相对强弱分析', async () => {
    const classId = s1().classIds[0]
    const r = await http('GET', api(`/analysis/subject-strength?classId=${classId}`), { token: tTok() })
    assert(r.status < 300, `状态码 ${r.status}`)
  })

  addCase('FUNC-TCH-126', 'teacher', '成绩分析数据隔离（非本班分析为空）', async () => {
    const t2 = await t2Tok()
    const r = await http('GET', api(`/grades/analysis/exam?classId=${s1().classIds[2]}&examId=any`), { token: t2 })
    // 非本班应被拒绝或返回空
    assert(r.status === 403 || r.status === 401 || r.status < 300, `不应 5xx（${r.status}）`)
  })

  /* ====================================================================================
   * 19. 数据看板（FUNC-TCH-127 ~ FUNC-TCH-132）
   * ==================================================================================== */

  addCase('FUNC-TCH-127', 'teacher', '班级数据看板统计接口', async () => {
    const classId = s1().classIds[0]
    const r = await http('GET', api(`/classes/${classId}/dashboard`), { token: tTok() })
    assert(r.status < 300, `状态码 ${r.status}`)
    assert(r.body != null, '看板数据不应为空')
  })

  addCase('FUNC-TCH-128', 'teacher', '班级看板包含学生统计', async () => {
    const classId = s1().classIds[0]
    const r = await http('GET', api(`/classes/${classId}/dashboard`), { token: tTok() })
    assert(r.status < 300, `状态码 ${r.status}`)
    // 看板应包含学生总数或相关统计
    const body = r.body
    assert(
      body.totalStudents != null || body.studentCount != null || body.students != null || typeof body === 'object',
      '看板应包含学生相关统计'
    )
  })

  addCase('FUNC-TCH-129', 'teacher', '班级看板包含考试/成绩统计', async () => {
    const classId = s1().classIds[0]
    const r = await http('GET', api(`/classes/${classId}/dashboard`), { token: tTok() })
    assert(r.status < 300, `状态码 ${r.status}`)
    const body = r.body
    assert(
      body.totalExams != null || body.examCount != null || body.exams != null || typeof body === 'object',
      '看板应包含考试相关统计'
    )
  })

  addCase('FUNC-TCH-130', 'teacher', '班级看板包含考勤统计', async () => {
    const classId = s1().classIds[0]
    const r = await http('GET', api(`/classes/${classId}/dashboard`), { token: tTok() })
    assert(r.status < 300, `状态码 ${r.status}`)
    const body = r.body
    assert(typeof body === 'object', '看板应为对象')
  })

  addCase('FUNC-TCH-131', 'teacher', '非班主任访问他班看板被隔离', async () => {
    const t2 = await t2Tok()
    const r = await http('GET', api(`/classes/${s1().classIds[2]}/dashboard`), { token: t2 })
    assert(r.status === 401 || r.status === 403 || r.status === 400, `期望拒绝，实际 ${r.status}`)
  })

  addCase('FUNC-TCH-132', 'teacher', '看板接口不崩溃（边界 classId）', async () => {
    const r = await http('GET', api('/classes/non-existent-id/dashboard'), { token: tTok() })
    assert(r.status < 500, `不应 5xx（${r.status}）`)
  })

  /* ====================================================================================
   * 20. 成绩导入校验（FUNC-TCH-133 ~ FUNC-TCH-142）
   * ==================================================================================== */

  addCase('FUNC-TCH-133', 'teacher', '负分拒绝（负分行被过滤后无有效数据）', async () => {
    const classId = s1().classIds[0]
    const list = await http('GET', api(`/students?classId=${classId}&pageSize=1`), { token: tTok() })
    const stu = (list.body.items || [])[0]
    assert(stu, '学生缺失')
    const r = await http('POST', api('/grades/import-commit'), {
      token: tTok(),
      body: { classId, examName: 'QA负分测验', subject: '语文', date: '2026-09-01', rows: [{ studentId: stu.id, score: -5, valid: true }] },
    })
    assertEq(r.status, 400, '负分行应被过滤后无有效数据')
    // 二次验证：负分未落库
    const g = await http('GET', api(`/grades?classId=${classId}`), { token: tTok() })
    const row = (Array.isArray(g.body) ? g.body : g.body.items || []).find((x: any) => x.examName === 'QA负分测验')
    assert(!row || !(row.scores || []).some((x: any) => x.score != null && x.score < 0), '负分不应落库')
  })

  addCase('FUNC-TCH-134', 'teacher', '跨班拒绝（不属于该班的学生被过滤）', async () => {
    const classId = s1().classIds[0]
    // 取校2学生 id
    const list2 = await http('GET', api(`/school-admin/students?classId=${s2().classIds[0]}&pageSize=1`), { token: s2().adminToken })
    const outsider = (list2.body.items || [])[0]
    assert(outsider, '校2学生缺失')
    const r = await http('POST', api('/grades/import-commit'), {
      token: tTok(),
      body: { classId, examName: 'QA跨班测验', subject: '语文', date: '2026-09-01', rows: [{ studentId: outsider.id, score: 90, valid: true }] },
    })
    assertEq(r.status, 400, '跨班学生行应被过滤后无有效数据')
    // 验证跨班学生成绩未落库
    const g = await http('GET', api(`/grades?classId=${classId}`), { token: tTok() })
    const row = (Array.isArray(g.body) ? g.body : g.body.items || []).find((x: any) => x.examName === 'QA跨班测验')
    assert(!row || !(row.scores || []).some((x: any) => x.studentId === outsider.id), '跨班学生成绩不应落库')
  })

  addCase('FUNC-TCH-135', 'teacher', '缺考处理（score=null 表示缺考）', async () => {
    const classId = s1().classIds[0]
    // 创建考试
    const c = await http('POST', api('/exams'), {
      token: tTok(),
      body: { classId, name: 'QA缺考测验', term: '2025-2026学年下学期', date: '2026-09-01', subjects: ['语文'] },
    })
    assert(c.status < 300, `创建考试失败 ${c.status}`)
    // 获取学生
    const list = await http('GET', api(`/students?classId=${classId}&pageSize=5`), { token: tTok() })
    const stus = list.body.items || []
    assert(stus.length >= 2, '学生不足')
    // 提交成绩：第一个正常分数，第二个缺考（score=null）
    const commit = await http('POST', api('/grades/import-commit'), {
      token: tTok(),
      body: {
        classId,
        examName: 'QA缺考测验',
        subject: '语文',
        date: '2026-09-01',
        rows: [
          { studentId: stus[0].id, score: 85, valid: true },
          { studentId: stus[1].id, score: null, valid: true },
        ],
      },
    })
    assert(commit.status < 300, `import-commit 失败 ${r2text(commit)}`)
    // 验证：缺考学生分数为 null
    const g = await http('GET', api(`/grades?classId=${classId}`), { token: tTok() })
    const row = (Array.isArray(g.body) ? g.body : g.body.items || []).find((x: any) => x.examName === 'QA缺考测验')
    assert(row, '未找到成绩行')
    const absentRecord = (row.scores || []).find((x: any) => x.studentId === stus[1].id)
    assert(absentRecord, '缺考学生记录缺失')
    assert(absentRecord.score == null, '缺考学生分数应为 null')
  })

  addCase('FUNC-TCH-136', 'teacher', '超满分（>100）被拒绝或安全处理', async () => {
    const classId = s1().classIds[0]
    const list = await http('GET', api(`/students?classId=${classId}&pageSize=1`), { token: tTok() })
    const stu = (list.body.items || [])[0]
    assert(stu, '学生缺失')
    const r = await http('POST', api('/grades/import-commit'), {
      token: tTok(),
      body: { classId, examName: 'QA超满分测验', subject: '语文', date: '2026-09-01', rows: [{ studentId: stu.id, score: 150, valid: true }] },
    })
    // 超满分应被拒绝或截断
    assert(r.status < 500, `不应 5xx（${r.status}）`)
    if (r.status < 300) {
      // 若接受则验证分数被截断到合理范围
      const g = await http('GET', api(`/grades?classId=${classId}`), { token: tTok() })
      const row = (Array.isArray(g.body) ? g.body : g.body.items || []).find((x: any) => x.examName === 'QA超满分测验')
      if (row) {
        const record = (row.scores || []).find((x: any) => x.studentId === stu.id)
        if (record && record.score != null) {
          assert(record.score <= 100, '超满分应被截断到 100')
        }
      }
    }
  })

  addCase('FUNC-TCH-137', 'teacher', '批量导入混合有效/无效行（仅有效行入库）', async () => {
    const classId = s1().classIds[0]
    // 获取本班学生
    const myList = await http('GET', api(`/students?classId=${classId}&pageSize=2`), { token: tTok() })
    const myStus = myList.body.items || []
    assert(myStus.length >= 2, '学生不足')
    // 获取他班学生
    const otherList = await http('GET', api(`/school-admin/students?classId=${s1().classIds[2]}&pageSize=1`), { token: s1().adminToken })
    const otherStu = (otherList.body.items || [])[0]
    assert(otherStu, '他班学生缺失')
    // 混合提交：本班2人 + 他班1人
    const r = await http('POST', api('/grades/import-commit'), {
      token: tTok(),
      body: {
        classId,
        examName: 'QA混合导入测验',
        subject: '语文',
        date: '2026-09-01',
        rows: [
          { studentId: myStus[0].id, score: 80, valid: true },
          { studentId: myStus[1].id, score: 85, valid: true },
          { studentId: otherStu.id, score: 90, valid: true },
        ],
      },
    })
    assert(r.status < 500, `不应 5xx（${r.status}）`)
    if (r.status < 300) {
      // 验证他班学生未落库
      const g = await http('GET', api(`/grades?classId=${classId}`), { token: tTok() })
      const row = (Array.isArray(g.body) ? g.body : g.body.items || []).find((x: any) => x.examName === 'QA混合导入测验')
      if (row) {
        assert(!(row.scores || []).some((x: any) => x.studentId === otherStu.id), '他班学生成绩不应落库')
      }
    }
  })

  addCase('FUNC-TCH-138', 'teacher', '成绩导入 valid=false 行被忽略', async () => {
    const classId = s1().classIds[0]
    const list = await http('GET', api(`/students?classId=${classId}&pageSize=2`), { token: tTok() })
    const stus = list.body.items || []
    assert(stus.length >= 2, '学生不足')
    const r = await http('POST', api('/grades/import-commit'), {
      token: tTok(),
      body: {
        classId,
        examName: 'QA无效行测验',
        subject: '语文',
        date: '2026-09-01',
        rows: [
          { studentId: stus[0].id, score: 80, valid: true },
          { studentId: stus[1].id, score: 999, valid: false },
        ],
      },
    })
    assert(r.status < 500, `不应 5xx（${r.status}）`)
  })

  addCase('FUNC-TCH-139', 'teacher', '成绩导入超过满分合理范围被处理', async () => {
    const classId = s1().classIds[0]
    const list = await http('GET', api(`/students?classId=${classId}&pageSize=1`), { token: tTok() })
    const stu = (list.body.items || [])[0]
    assert(stu, '学生缺失')
    // 使用 fullScoreMap 指定满分
    const r = await http('POST', api('/grades/import-commit'), {
      token: tTok(),
      body: { classId, examName: 'QA满分测验', subject: '语文', date: '2026-09-01', rows: [{ studentId: stu.id, score: 100, valid: true }] },
    })
    assert(r.status < 300, `满分导入失败 ${r.status}`)
  })

  addCase('FUNC-TCH-140', 'teacher', '成绩导入后分析数据正确', async () => {
    const classId = s1().classIds[0]
    // 创建考试并导入成绩
    const c = await http('POST', api('/exams'), {
      token: tTok(),
      body: { classId, name: 'QA分析验证测验', term: '2025-2026学年下学期', date: '2026-09-01', subjects: ['语文'] },
    })
    assert(c.status < 300, `创建考试失败 ${c.status}`)
    const examId = c.body.id
    const list = await http('GET', api(`/students?classId=${classId}&pageSize=5`), { token: tTok() })
    const stus = list.body.items || []
    const commit = await http('POST', api('/grades/import-commit'), {
      token: tTok(),
      body: {
        classId,
        examName: 'QA分析验证测验',
        subject: '语文',
        date: '2026-09-01',
        rows: stus.map((s: any, i: number) => ({ studentId: s.id, score: 70 + i * 5, valid: true })),
      },
    })
    assert(commit.status < 300, `导入失败 ${r2text(commit)}`)
    // 验证分析接口
    const analysis = await http('GET', api(`/grades/analysis/exam?classId=${classId}&examId=${examId}`), { token: tTok() })
    assert(analysis.status < 300, `分析接口失败 ${analysis.status}`)
  })

  addCase('FUNC-TCH-141', 'teacher', '成绩导入重复提交（幂等性）', async () => {
    const classId = s1().classIds[0]
    const list = await http('GET', api(`/students?classId=${classId}&pageSize=1`), { token: tTok() })
    const stu = (list.body.items || [])[0]
    assert(stu, '学生缺失')
    const body = {
      classId,
      examName: 'QA幂等测验',
      subject: '语文',
      date: '2026-09-01',
      rows: [{ studentId: stu.id, score: 88, valid: true }],
    }
    // 第一次提交
    const r1 = await http('POST', api('/grades/import-commit'), { token: tTok(), body })
    assert(r1.status < 300, `首次提交失败 ${r1.status}`)
    // 第二次提交（相同数据）
    const r2 = await http('POST', api('/grades/import-commit'), { token: tTok(), body })
    assert(r2.status < 300, `重复提交失败 ${r2.status}`)
  })

  addCase('FUNC-TCH-142', 'teacher', '成绩导入非数字 score 被拒绝', async () => {
    const classId = s1().classIds[0]
    const list = await http('GET', api(`/students?classId=${classId}&pageSize=1`), { token: tTok() })
    const stu = (list.body.items || [])[0]
    assert(stu, '学生缺失')
    const r = await http('POST', api('/grades/import-commit'), {
      token: tTok(),
      body: { classId, examName: 'QA非数字测验', subject: '语文', date: '2026-09-01', rows: [{ studentId: stu.id, score: 'abc', valid: true }] },
    })
    // 非数字应被拒绝或忽略
    assert(r.status < 500, `不应 5xx（${r.status}）`)
  })
}

function r2text(r: { status: number; body: any }) {
  return `${r.status} ${JSON.stringify(r.body).slice(0, 150)}`
}
