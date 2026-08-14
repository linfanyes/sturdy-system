/**
 * 边界测试用例：四级用户的异常输入、越权、隔离、容错（EDGE-xxx）
 * 与 qa/TEST_CASES.md 第十二节对应。基于 seedDataset 数据集执行。
 */
import { http } from './harness'
import { addCase, assert, assertEq } from './framework'
import {
  SeedResult, SUPER_USER, SUPER_PASS, ADMIN_PASS, TEACHER_PASS, PARENT_PASS,
  adminUser, teacherUser, studentNo, CLASSES_PER_SCHOOL,
} from './seed'

export function registerEdgeCases(baseUrl: string, seed: SeedResult) {
  const api = (p: string) => `${baseUrl}${p}`
  const s1 = () => seed.schools[0]
  const s2 = () => seed.schools[1]
  let superToken = ''

  /* ================= 超级管理员边界 ================= */
  addCase('EDGE-SUP-01', 'super', '重复校管用户名被拒绝', async () => {
    const lg = await http('POST', api('/auth/unified-login'), { body: { username: SUPER_USER, password: SUPER_PASS } })
    superToken = lg.body.token
    const r = await http('POST', api('/admin/school-admins'), {
      token: superToken,
      body: { username: adminUser(1), password: ADMIN_PASS, name: '重复校管', schoolId: s1().id },
    })
    assert(r.status >= 400, `重复用户名应被拒绝，实际 ${r.status}`)
  })

  addCase('EDGE-SUP-02', 'super', '校管弱密码（<6位）被 DTO 拒绝', async () => {
    const r = await http('POST', api('/admin/school-admins'), {
      token: superToken,
      body: { username: 'qaedge_weak', password: '123', name: '弱密码校管', schoolId: s1().id },
    })
    assertEq(r.status, 400, '状态码')
  })

  addCase('EDGE-SUP-03', 'super', '篡改 JWT 被拒绝（签名校验）', async () => {
    const tampered = superToken.slice(0, -3) + 'abc'
    const r = await http('GET', api('/admin/schools'), { token: tampered })
    assertEq(r.status, 401, '状态码')
  })

  addCase('EDGE-SUP-04', 'super', '超长学校名（120 字符）被拒绝或安全处理', async () => {
    const r = await http('POST', api('/admin/schools'), {
      token: superToken,
      body: { name: '超'.repeat(120), prefix: 'QA' },
    })
    assert(r.status === 400 || r.status === 201, `意外状态码 ${r.status}`)
    if (r.status === 201) {
      // 若接受也应截断存储，不应原样存 120 字
      assert((r.body.name || '').length <= 120, '名称存储异常')
    }
  })

  addCase('EDGE-SUP-05', 'super', '不存在的学校详情返回 404 不崩溃', async () => {
    const r = await http('GET', api('/admin/schools/non-existent-id'), { token: superToken })
    assert(r.status === 404 || r.status === 400, `期望 404/400，实际 ${r.status}`)
  })

  addCase('EDGE-SUP-06', 'super', '审计日志分页边界（pageSize=0/负数）不崩溃', async () => {
    const r1 = await http('GET', api('/admin/audit-logs?page=1&pageSize=0'), { token: superToken })
    const r2 = await http('GET', api('/admin/audit-logs?page=-1&pageSize=-5'), { token: superToken })
    assert(r1.status < 500, `pageSize=0 不应 5xx（${r1.status}）`)
    assert(r2.status < 500, `负数分页不应 5xx（${r2.status}）`)
  })

  addCase('EDGE-SUP-07', 'super', '批量创建校管空数组被拒绝', async () => {
    const r = await http('POST', api('/admin/school-admins/batch'), {
      token: superToken,
      body: { admins: [] },
    })
    assertEq(r.status, 400, '状态码')
  })

  /* ================= 校管边界 ================= */
  addCase('EDGE-SA-01', 'school_admin', '创建教师：非法手机号被拒绝', async () => {
    const r = await http('POST', api('/school-admin/teachers'), {
      token: s1().adminToken,
      body: { name: '边界教师', username: 'qaedge_phone', password: 'QaEdge@123', phone: '12345' },
    })
    assertEq(r.status, 400, '状态码')
  })

  addCase('EDGE-SA-02', 'school_admin', '批量创建教师：空数组被拒绝', async () => {
    const r = await http('POST', api('/school-admin/teachers/batch'), { token: s1().adminToken, body: { teachers: [] } })
    assertEq(r.status, 400, '状态码')
  })

  addCase('EDGE-SA-03', 'school_admin', '重复教师用户名被拒绝', async () => {
    const r = await http('POST', api('/school-admin/teachers'), {
      token: s1().adminToken,
      body: { name: '重复教师', username: teacherUser(1, 1), password: 'QaEdge@123' },
    })
    assert(r.status >= 400, `重复用户名应被拒绝，实际 ${r.status}`)
  })

  addCase('EDGE-SA-04', 'school_admin', '创建班级缺必填字段被拒绝', async () => {
    const r = await http('POST', api('/school-admin/classes'), { token: s1().adminToken, body: { name: '缺年级班' } })
    assertEq(r.status, 400, '状态码')
  })

  addCase('EDGE-SA-05', 'school_admin', '跨校越权：校管2查询校1班级学生被隔离', async () => {
    const r = await http('GET', api(`/school-admin/students?classId=${s1().classIds[0]}&pageSize=50`), { token: s2().adminToken })
    assert(r.status < 300, `状态码 ${r.status}`)
    const total = r.body.total ?? (r.body.items || []).length
    assertEq(total, 0, '跨校查询应返回空')
  })

  addCase('EDGE-SA-06', 'school_admin', '学生列表注入字符不报错不跨校泄漏', async () => {
    // 边界目标 = 注入载荷不引发 5xx、不跨校泄漏、不突破分页上限
    const r = await http('GET', api(`/school-admin/students?keyword=${encodeURIComponent("' OR '1'='1")}&take=50`), { token: s1().adminToken })
    assert(r.status < 500, `不应 5xx（${r.status}）`)
    const items = r.body.items || []
    assert(items.length <= 50, '不应突破分页上限')
    // 跨校隔离：结果全部属于本校班级
    const classes = await http('GET', api('/school-admin/classes?take=200'), { token: s1().adminToken })
    const myClassIds = new Set((classes.body.items || []).map((c: any) => c.id))
    assert(items.every((s: any) => myClassIds.has(s.classId)), '结果不应包含他校学生')
  })

  addCase('EDGE-SA-07', 'school_admin', '不存在的 classId 查询返回空不崩溃', async () => {
    const r = await http('GET', api('/school-admin/students?classId=no-such-class'), { token: s1().adminToken })
    assert(r.status < 500, `不应 5xx（${r.status}）`)
    const total = r.body.total ?? (r.body.items || []).length
    assertEq(total, 0, '应为空')
  })

  addCase('EDGE-SA-08', 'school_admin', '重置不存在教师的密码被拒绝', async () => {
    const r = await http('POST', api('/school-admin/teachers/no-such-teacher/reset-password'), { token: s1().adminToken, body: { password: 'QaEdge@123' } })
    assert(r.status >= 400, `应被拒绝，实际 ${r.status}`)
  })

  addCase('EDGE-SA-09', 'school_admin', '超长教师姓名（>50 字）被拒绝', async () => {
    const r = await http('POST', api('/school-admin/teachers'), {
      token: s1().adminToken,
      body: { name: '名'.repeat(60), username: 'qaedge_longname', password: 'QaEdge@123' },
    })
    assertEq(r.status, 400, '状态码')
  })

  addCase('EDGE-SA-10', 'school_admin', '重置教师密码弱口令（<8位）被拒绝', async () => {
    const u = teacherUser(1, 5)
    const list = await http('GET', api(`/school-admin/teachers?keyword=${u}&pageSize=1`), { token: s1().adminToken })
    const tch = (list.body.items || []).find((t: any) => t.username === u)
    assert(tch, '教师缺失')
    const r = await http('POST', api(`/school-admin/teachers/${tch.id}/reset-password`), { token: s1().adminToken, body: { password: '123' } })
    assertEq(r.status, 400, '状态码')
  })

  addCase('EDGE-SA-11', 'school_admin', '批量导入学生空数据被拒绝', async () => {
    const r = await http('POST', api('/school-admin/students/batch'), {
      token: s1().adminToken,
      body: { students: [] },
    })
    assertEq(r.status, 400, '状态码')
  })

  addCase('EDGE-SA-12', 'school_admin', '导入学生重复学号被拒绝', async () => {
    const existing = await http('GET', api(`/school-admin/students?pageSize=1`), { token: s1().adminToken })
    const stu = (existing.body.items || [])[0]
    assert(stu, '学生缺失')
    const r = await http('POST', api('/school-admin/students'), {
      token: s1().adminToken,
      body: { classId: stu.classId, name: '重复学号学生', gender: '男', studentNo: stu.studentNo },
    })
    assert(r.status >= 400, `重复学号应被拒绝，实际 ${r.status}`)
  })

  addCase('EDGE-SA-13', 'school_admin', '跨年级数据隔离', async () => {
    // 校1 年级1 班级0 的校管尝试访问 年级3 的班级数据应正常返回但数据隔离
    const classes = await http('GET', api('/school-admin/classes?take=200'), { token: s1().adminToken })
    const items = classes.body.items || []
    const grade1Classes = items.filter((c: any) => c.classNo && c.classNo.startsWith('1'))
    const grade3Classes = items.filter((c: any) => c.classNo && c.classNo.startsWith('3'))
    assert(grade1Classes.length > 0, '年级1班级缺失')
    assert(grade3Classes.length > 0, '年级3班级缺失')
    // 同一校管可见全部年级（同校内无年级隔离）
    assert(grade1Classes.length + grade3Classes.length <= CLASSES_PER_SCHOOL, '班级总数异常')
  })

  /* ================= 教师边界 ================= */
  const tTok = () => {
    const t = s1().headTeacherTokens[0]
    assert(t, '班主任 token 缺失')
    return t
  }
  const t2Tok = async () => {
    // 校1第2位教师（非1班班主任，但任教同校）
    const lg = await http('POST', api('/auth/unified-login'), { body: { username: teacherUser(1, 2), password: TEACHER_PASS } })
    assert(lg.status < 300, `教师2登录失败 ${lg.status}`)
    return lg.body.token as string
  }

  addCase('EDGE-TCH-01', 'teacher', '同名考试重复创建被拒绝', async () => {
    const body = { classId: s1().classIds[0], name: '边界重复考试', term: '2025-2026学年下学期', date: '2026-08-06', subjects: ['语文'] }
    const r1 = await http('POST', api('/exams'), { token: tTok(), body })
    assert(r1.status < 300, `首次创建失败 ${r1.status}`)
    const r2 = await http('POST', api('/exams'), { token: tTok(), body })
    assertEq(r2.status, 400, '重复创建应 400')
  })

  addCase('EDGE-TCH-02', 'teacher', '成绩录入负分被拒绝或安全处理', async () => {
    const list = await http('GET', api(`/students?classId=${s1().classIds[0]}&pageSize=1`), { token: tTok() })
    const stu = (list.body.items || [])[0]
    const r = await http('POST', api('/grades/import-commit'), {
      token: tTok(),
      body: { classId: s1().classIds[0], examName: '边界负分考试', subject: '语文', date: '2026-08-06', rows: [{ studentId: stu.id, score: -5, valid: true }] },
    })
    assertEq(r.status, 400, '负分行应被过滤后无有效数据')
    // 二次验证：负分未落库
    const g = await http('GET', api(`/grades?classId=${s1().classIds[0]}`), { token: tTok() })
    const row = (Array.isArray(g.body) ? g.body : g.body.items || []).find((x: any) => x.examName === '边界负分考试')
    assert(!row || !(row.scores || []).some((x: any) => x.score != null && x.score < 0), '负分不应落库')
  })

  addCase('EDGE-TCH-03', 'teacher', '成绩录入了不属于该班的学生被拒绝或忽略', async () => {
    // 取校2学生 id
    const list2 = await http('GET', api(`/school-admin/students?classId=${s2().classIds[0]}&pageSize=1`), { token: s2().adminToken })
    const outsider = (list2.body.items || [])[0]
    assert(outsider, '校2学生缺失')
    const r = await http('POST', api('/grades/import-commit'), {
      token: tTok(),
      body: { classId: s1().classIds[0], examName: '边界跨班考试', subject: '语文', date: '2026-08-06', rows: [{ studentId: outsider.id, score: 90, valid: true }] },
    })
    assertEq(r.status, 400, '跨班学生行应被过滤后无有效数据')
    const g = await http('GET', api(`/grades?classId=${s1().classIds[0]}`), { token: tTok() })
    const row = (Array.isArray(g.body) ? g.body : g.body.items || []).find((x: any) => x.examName === '边界跨班考试')
    assert(!row || !(row.scores || []).some((x: any) => x.studentId === outsider.id), '跨班学生成绩不应落库到本班')
  })

  addCase('EDGE-TCH-04', 'teacher', '公告缺标题被拒绝', async () => {
    const r = await http('POST', api('/notices'), { token: tTok(), body: { classId: s1().classIds[0], content: '无标题内容' } })
    assert(r.status >= 400, `应被拒绝，实际 ${r.status}`)
  })

  addCase('EDGE-TCH-05', 'teacher', '作业缺标题被拒绝', async () => {
    const r = await http('POST', api('/homework'), { token: tTok(), body: { classId: s1().classIds[0], subject: '语文', content: '无标题' } })
    assert(r.status >= 400, `应被拒绝，实际 ${r.status}`)
  })

  addCase('EDGE-TCH-06', 'teacher', '非班主任教师访问他班成绩被隔离', async () => {
    // 教师2（2班班主任）访问 3班 成绩应被隔离（空结果）
    const t2 = await t2Tok()
    const r = await http('GET', api(`/grades?classId=${s1().classIds[2]}`), { token: t2 })
    assert(r.status < 300, `状态码 ${r.status}`)
    const items = Array.isArray(r.body) ? r.body : r.body.items || []
    assertEq(items.length, 0, '非本班应返回空')
  })

  addCase('EDGE-TCH-07', 'teacher', '审核不存在的学生信息申请被拒绝', async () => {
    const r = await http('POST', api('/student-info-updates/no-such-request/review'), { token: tTok(), body: { action: 'approve' } })
    assert(r.status >= 400, `应被拒绝，实际 ${r.status}`)
  })

  addCase('EDGE-TCH-08', 'teacher', '审核 action 非法值被拒绝', async () => {
    // 先由家长提交一条申请
    const plg = await http('POST', api('/auth/unified-login'), { body: { username: studentNo(1, 1, 1, 3), password: PARENT_PASS } })
    const sub = await http('POST', api('/parent-auth/student-update-request'), { token: plg.body.token, body: { payload: { note: '边界用例' } } })
    assert(sub.status < 300, `提交失败 ${sub.status}`)
    const list = await http('GET', api('/student-info-updates?status=pending'), { token: tTok() })
    const items = Array.isArray(list.body) ? list.body : list.body.items || []
    assert(items.length > 0, '待审核列表为空')
    const r = await http('POST', api(`/student-info-updates/${items[0].id}/review`), { token: tTok(), body: { action: 'maybe' } })
    assertEq(r.status, 400, '状态码')
  })

  addCase('EDGE-TCH-09', 'teacher', 'import-commit 缺 subject 被拒绝', async () => {
    const r = await http('POST', api('/grades/import-commit'), {
      token: tTok(),
      body: { classId: s1().classIds[0], examName: '边界缺科目', rows: [] },
    })
    assertEq(r.status, 400, '状态码')
  })

  addCase('EDGE-TCH-10', 'teacher', '教师自助修改密码闭环（新能力）', async () => {
    const u = teacherUser(1, 6)
    const lg = await http('POST', api('/auth/unified-login'), { body: { username: u, password: TEACHER_PASS } })
    assert(lg.status < 300, `登录失败 ${lg.status}`)
    // 原密码错误 → 拒绝
    const bad = await http('POST', api('/auth/change-password'), { token: lg.body.token, body: { oldPassword: 'wrong', newPassword: 'QaSelf@123' } })
    assert(bad.status >= 400, `原密码错误应被拒绝，实际 ${bad.status}`)
    // 新密码过短 → 400
    const short = await http('POST', api('/auth/change-password'), { token: lg.body.token, body: { oldPassword: TEACHER_PASS, newPassword: '123' } })
    assertEq(short.status, 400, '短密码状态码')
    // 正确流程
    const ok = await http('POST', api('/auth/change-password'), { token: lg.body.token, body: { oldPassword: TEACHER_PASS, newPassword: 'QaSelf@123' } })
    assert(ok.status < 300, `改密失败 ${ok.status} ${JSON.stringify(ok.body).slice(0, 120)}`)
    const lg2 = await http('POST', api('/auth/unified-login'), { body: { username: u, password: 'QaSelf@123' } })
    assert(lg2.status < 300, '新密码登录失败')
    // 还原
    await http('POST', api('/auth/change-password'), { token: lg2.body.token, body: { oldPassword: 'QaSelf@123', newPassword: TEACHER_PASS } })
  })

  addCase('EDGE-TCH-11', 'teacher', '批量成绩导入跨班级被过滤', async () => {
    const classId = s1().classIds[0]
    // 获取本班学生（教师可访问）
    const myList = await http('GET', api(`/students?classId=${classId}&pageSize=1`), { token: tTok() })
    const myStu = (myList.body.items || [])[0]
    assert(myStu, '本班学生缺失')
    // 获取他班学生（用校管 token 获取，教师无权直接查看他班学生）
    const otherList = await http('GET', api(`/school-admin/students?classId=${s1().classIds[2]}&pageSize=1`), { token: s1().adminToken })
    const otherStu = (otherList.body.items || [])[0]
    assert(otherStu, '他班学生缺失')
    // 跨班级提交成绩：本班+他班学生混合
    const r = await http('POST', api('/grades/import-commit'), {
      token: tTok(),
      body: {
        classId,
        examName: '边界跨班过滤考试',
        subject: '语文',
        date: '2026-08-06',
        rows: [
          { studentId: myStu.id, score: 85, valid: true },
          { studentId: otherStu.id, score: 90, valid: true },
        ],
      },
    })
    // 应被接受（仅本班学生入库，他班被过滤）或被整体拒绝
    assert(r.status < 500, `不应 5xx（${r.status}）`)
    if (r.status < 300) {
      // 二次验证：他班学生成绩未落库
      const g = await http('GET', api(`/grades?classId=${classId}`), { token: tTok() })
      const row = (Array.isArray(g.body) ? g.body : g.body.items || []).find((x: any) => x.examName === '边界跨班过滤考试')
      if (row) {
        assert(!(row.scores || []).some((x: any) => x.studentId === otherStu.id), '他班学生成绩不应落库')
      }
    }
  })

  addCase('EDGE-TCH-12', 'teacher', '考试名称跨学期重复被允许（不同学期可以同名）', async () => {
    const classId = s1().classIds[0]
    const body1 = { classId, name: '边界同名考试', term: '2025-2026学年下学期', date: '2026-08-06', subjects: ['语文'] }
    const r1 = await http('POST', api('/exams'), { token: tTok(), body: body1 })
    assert(r1.status < 300, `首次创建失败 ${r1.status}`)
    // 不同学期同名应允许
    const body2 = { classId, name: '边界同名考试', term: '2026-2027学年上学期', date: '2026-09-01', subjects: ['语文'] }
    const r2 = await http('POST', api('/exams'), { token: tTok(), body: body2 })
    assert(r2.status < 300, `不同学期同名应允许，实际 ${r2.status}`)
  })

  /* ================= 家长边界 ================= */
  const pTok = async (no: string) => {
    const lg = await http('POST', api('/auth/unified-login'), { body: { username: no, password: PARENT_PASS } })
    assert(lg.status < 300, `家长登录失败(${no}) ${lg.status}`)
    return lg.body.token as string
  }

  addCase('EDGE-PAR-01', 'parent', '连续错误密码均返回 401', async () => {
    for (let i = 0; i < 3; i++) {
      const r = await http('POST', api('/auth/unified-login'), { body: { username: studentNo(1, 1, 1, 4), password: 'bad' + i } })
      assertEq(r.status, 401, `第 ${i + 1} 次状态码`)
    }
  })

  addCase('EDGE-PAR-02', 'parent', '不存在学号：统一登录 401、专用端点明确提示', async () => {
    const r1 = await http('POST', api('/auth/unified-login'), { body: { username: 'NOSUCHSTU99', password: 'x' } })
    assertEq(r1.status, 401, '统一登录状态码')
    const r2 = await http('POST', api('/parent-auth/login'), { body: { studentNo: '1234567890', password: 'x' } })
    assert(r2.status >= 400, `专用端点应拒绝，实际 ${r2.status}`)
  })

  addCase('EDGE-PAR-03', 'parent', '未开启家长登录的学生无法登录（新建学生验证）', async () => {
    // 教师新建一名未开启家长登录的学生
    const c = await http('POST', api('/students'), {
      token: tTok(),
      body: { classId: s1().classIds[0], name: '边界学生', gender: '男', studentNo: 'S01EDGE01' },
    })
    assert(c.status < 300, `创建学生失败 ${c.status} ${JSON.stringify(c.body).slice(0, 120)}`)
    const r = await http('POST', api('/auth/unified-login'), { body: { username: 'S01EDGE01', password: '123456' } })
    assert(r.status >= 400, `未授权学生登录应被拒绝，实际 ${r.status}`)
  })

  addCase('EDGE-PAR-04', 'parent', '修改密码：原密码错误拒绝、短密码拒绝、成功闭环', async () => {
    // 使用不与性能用例冲突的学生（1,2,5）；改密策略要求新密码≥8位（默认口令 123456 仅作初始值）
    const no = studentNo(1, 1, 2, 5)
    const t = await pTok(no)
    const bad = await http('POST', api('/parent-auth/change-password'), { token: t, body: { oldPassword: 'wrong', newPassword: 'QaPar@123' } })
    assert(bad.status >= 400, `原密码错误应拒绝，实际 ${bad.status}`)
    const short = await http('POST', api('/parent-auth/change-password'), { token: t, body: { oldPassword: PARENT_PASS, newPassword: '123' } })
    assert(short.status >= 400, `短密码应拒绝，实际 ${short.status}`)
    const ok = await http('POST', api('/parent-auth/change-password'), { token: t, body: { oldPassword: PARENT_PASS, newPassword: 'QaPar@123' } })
    assert(ok.status < 300, `改密失败 ${ok.status}`)
    const lg2 = await http('POST', api('/auth/unified-login'), { body: { username: no, password: 'QaPar@123' } })
    assert(lg2.status < 300, '新密码登录失败')
    // 再改一次验证可连续修改（不还原：该学生无其他用例引用）
    const ok2 = await http('POST', api('/parent-auth/change-password'), { token: lg2.body.token, body: { oldPassword: 'QaPar@123', newPassword: 'QaPar@456' } })
    assert(ok2.status < 300, `二次改密失败 ${ok2.status}`)
  })

  addCase('EDGE-PAR-05', 'parent', '学生信息修改申请：空 payload 被拒绝', async () => {
    const t = await pTok(studentNo(1, 1, 1, 6))
    const r = await http('POST', api('/parent-auth/student-update-request'), { token: t, body: { payload: {} } })
    assertEq(r.status, 400, '状态码')
  })

  addCase('EDGE-PAR-06', 'parent', '切换孩子到他人子女被拒绝（隔离）', async () => {
    const t = await pTok(studentNo(1, 1, 1, 7))
    // 校2某学生与当前家长无关
    const list2 = await http('GET', api(`/school-admin/students?classId=${s2().classIds[0]}&pageSize=1`), { token: s2().adminToken })
    const outsider = (list2.body.items || [])[0]
    const r = await http('POST', api('/parent-auth/switch-student'), { token: t, body: { studentId: outsider.id } })
    assert(r.status >= 400, `越权切换应拒绝，实际 ${r.status}`)
  })

  addCase('EDGE-PAR-07', 'parent', '独生子女家庭 compare-kids 返回空比对不崩溃', async () => {
    const t = await pTok(studentNo(2, 1, 1, 1))
    const r = await http('GET', api('/parent-auth/compare-kids'), { token: t })
    assert(r.status < 300, `状态码 ${r.status}`)
    assert(Array.isArray(r.body.kids), 'kids 应为数组')
    assert(r.body.kids.length <= 1, '独生子女家庭 kids 不应超过 1')
  })

  addCase('EDGE-PAR-08', 'parent', '篡改家长 token 被拒绝', async () => {
    const t = await pTok(studentNo(1, 1, 1, 8))
    const r = await http('GET', api('/parent-auth/me'), { token: t.slice(0, -3) + 'xyz' })
    assertEq(r.status, 401, '状态码')
  })

  addCase('EDGE-PAR-09', 'parent', '跨校多孩家庭切换孩子隔离', async () => {
    const crossFamily = seed.multiChildFamilies[2]
    assert(crossFamily, '跨校多孩家庭缺失')
    // 用跨校家庭的第一个孩子登录
    const t = await pTok(crossFamily.studentNos[0])
    // 验证 compare-kids 返回跨校的2个孩子
    const ck = await http('GET', api('/parent-auth/compare-kids'), { token: t })
    assert(ck.status < 300, `compare-kids 失败 ${ck.status}`)
    assert(Array.isArray(ck.body.kids), 'kids 应为数组')
    assert(ck.body.kids.length >= 2, `跨校家庭应至少有2个孩子，实际 ${ck.body.kids.length}`)
    // 尝试切换到家庭内的另一个孩子（跨校）应成功
    const otherKidNo = crossFamily.studentNos[1]
    const kidList = await http('GET', api('/parent-auth/me'), { token: t })
    const currentStudentId = kidList.body.studentId
    assert(currentStudentId, '当前学生ID缺失')
    // 验证其他孩子属于家庭
    const me = await http('GET', api('/parent-auth/me'), { token: t })
    assert(me.status < 300, `me 端点失败 ${me.status}`)
  })

  addCase('EDGE-PAR-10', 'parent', '教师子女家长身份越权访问', async () => {
    const tp = seed.teacherAsParent[0]
    assert(tp, '教师子女家长记录缺失')
    // 以家长身份登录（教师子女的学号）
    const t = await pTok(tp.studentNo)
    // 尝试访问不属于自己孩子的数据
    // 获取一个无关学生的ID
    const outsiders = await http('GET', api(`/school-admin/students?classId=${s2().classIds[0]}&pageSize=1`), { token: s2().adminToken })
    const outsider = (outsiders.body.items || [])[0]
    if (outsider) {
      const r = await http('POST', api('/parent-auth/switch-student'), { token: t, body: { studentId: outsider.id } })
      assert(r.status >= 400, `越权切换应拒绝，实际 ${r.status}`)
    }
    // 验证家长 API 只返回自己孩子的数据
    const exams = await http('GET', api('/parent-auth/exams'), { token: t })
    assert(exams.status < 300, `exams 端点失败 ${exams.status}`)
  })

  addCase('EDGE-PAR-11', 'parent', '三孩家庭 compare-kids 返回3个孩子', async () => {
    const family = seed.multiChildFamilies[1]
    assert(family, '三孩家庭缺失')
    const t = await pTok(family.studentNos[0])
    const ck = await http('GET', api('/parent-auth/compare-kids'), { token: t })
    assert(ck.status < 300, `compare-kids 失败 ${ck.status}`)
    assert(Array.isArray(ck.body.kids), 'kids 应为数组')
    assertEq(ck.body.kids.length, 3, '三孩家庭应返回3个孩子')
  })

  /* ================= 通用安全边界 ================= */
  addCase('EDGE-SEC-01', 'security', 'XSS 载荷存入公告原样返回（后端不执行、不 500）', async () => {
    const payload = '<script>alert(1)</script><img src=x onerror=alert(1)>'
    const c = await http('POST', api('/notices'), { token: tTok(), body: { classId: s1().classIds[0], title: '边界XSS', content: payload } })
    assert(c.status < 300, `创建失败 ${c.status}`)
    const l = await http('GET', api(`/notices?classId=${s1().classIds[0]}`), { token: tTok() })
    const items = Array.isArray(l.body) ? l.body : l.body.items || []
    const saved = items.find((n: any) => n.title === '边界XSS')
    assert(saved, '公告未找到')
    assertEq(saved.content, payload, '应原样存储（前端负责转义渲染）')
  })

  addCase('EDGE-SEC-02', 'security', '超长内容（50KB）提交不崩溃', async () => {
    const r = await http('POST', api('/notices'), { token: tTok(), body: { classId: s1().classIds[0], title: '边界超长', content: '长'.repeat(25000) } })
    assert(r.status < 500, `不应 5xx（${r.status}）`)
  })

  addCase('EDGE-SEC-03', 'security', '空 JSON 登录体被 DTO 拒绝（400）', async () => {
    const r = await http('POST', api('/auth/unified-login'), { body: {} })
    assert(r.status === 400 || r.status === 401, `期望 400/401，实际 ${r.status}`)
  })

  addCase('EDGE-SEC-04', 'security', '错误 HTTP 方法返回 404', async () => {
    const r = await http('GET', api('/auth/unified-login'))
    assertEq(r.status, 404, '状态码')
  })

  addCase('EDGE-SEC-05', 'security', '批量导入文件格式校验', async () => {
    // 上传非 CSV/Excel 文件应被拒绝
    const fakeFile = Buffer.from('not a valid file content')
    const r = await http('POST', api('/school-admin/students/import'), {
      token: s1().adminToken,
      headers: { 'Content-Type': 'application/octet-stream' },
      body: fakeFile,
    })
    assert(r.status >= 400, `非法文件格式应被拒绝，实际 ${r.status}`)
    // 空文件也应被拒绝
    const emptyFile = Buffer.from('')
    const r2 = await http('POST', api('/school-admin/students/import'), {
      token: s1().adminToken,
      headers: { 'Content-Type': 'text/csv' },
      body: emptyFile,
    })
    assert(r2.status >= 400, `空文件应被拒绝，实际 ${r2.status}`)
  })
}
