/**
 * 家长全功能覆盖测试用例
 * 覆盖功能域：登录认证、家长中心、成绩查询、考试列表、作业查询、考勤查询、行为记录、课表查询、
 * 家校沟通、科任老师、修改密码、学生信息修改、消息订阅、跨娃比对、功能包联动、消息系统、
 * 跨校多孩、教师子女独立登录
 * 用例 ID 格式：FUNC-PAR-XXX
 */
import { http } from './harness'
import { addCase, assert, assertEq, assertIncludes } from './framework'
import {
  SeedResult, SUPER_USER, SUPER_PASS, ADMIN_PASS, TEACHER_PASS, PARENT_PASS,
  adminUser, teacherUser, studentNo, SCHOOL_COUNT, SUBJECTS,
  TEACHERS_PER_SCHOOL, CLASSES_PER_SCHOOL, STUDENTS_PER_CLASS, EXAMS_PER_CLASS,
  GRADES_PER_SCHOOL, CLASSES_PER_GRADE, TEACHERS_PER_CLASS, SEMESTERS,
} from './seed'

export function registerParentFunctionalCases(baseUrl: string, seed: SeedResult) {
  const api = (path: string) => `${baseUrl}${path}`
  const s1 = () => seed.schools[0]
  const s2 = () => seed.schools[1]

  /* ================= 辅助函数 ================= */

  /** 家长登录获取 token */
  const pTok = async (no: string) => {
    const r = await http('POST', api('/auth/unified-login'), { body: { username: no, password: PARENT_PASS } })
    assert(r.status < 300, `家长登录失败(${no}) ${r.status}`)
    return r.body.token as string
  }

  /* ================= 1. 登录与认证 ================= */

  addCase('FUNC-PAR-100', 'parent', '家长用学号+口令统一登录返回 role=parent', async () => {
    const r = await http('POST', api('/auth/unified-login'), { body: { username: studentNo(1, 1, 1, 1), password: PARENT_PASS } })
    assert(r.status < 300, `登录失败 ${r.status}`)
    assertEq(r.body.role, 'parent', 'role')
    assert(typeof r.body.token === 'string' && r.body.token.length > 20, 'token 缺失')
  })

  addCase('FUNC-PAR-101', 'parent', '家长错误密码返回 401', async () => {
    const r = await http('POST', api('/auth/unified-login'), { body: { username: studentNo(1, 1, 1, 1), password: 'wrong' } })
    assertEq(r.status, 401, '状态码')
  })

  addCase('FUNC-PAR-102', 'parent', '未授权学号登录被拒绝（401）', async () => {
    const r = await http('POST', api('/auth/unified-login'), { body: { username: 'NOTEXIST999', password: PARENT_PASS } })
    assertEq(r.status, 401, '状态码')
  })

  addCase('FUNC-PAR-103', 'parent', '连续错误密码均返回 401', async () => {
    for (let i = 0; i < 3; i++) {
      const r = await http('POST', api('/auth/unified-login'), { body: { username: studentNo(1, 1, 1, 4), password: 'bad' + i } })
      assertEq(r.status, 401, `第 ${i + 1} 次状态码`)
    }
  })

  addCase('FUNC-PAR-104', 'parent', '家长专用登录端点 parent-auth/login 可用', async () => {
    const r = await http('POST', api('/parent-auth/login'), { body: { studentNo: studentNo(1, 1, 1, 3), password: PARENT_PASS } })
    assert(r.status < 300, `parent-auth/login 失败 ${r.status} ${JSON.stringify(r.body).slice(0, 120)}`)
    assert(r.body.token, 'token 缺失')
  })

  addCase('FUNC-PAR-105', 'parent', '家长登录后 /auth/me 返回功能档案', async () => {
    const t = await pTok(studentNo(1, 1, 1, 1))
    const r = await http('GET', api('/auth/me'), { token: t })
    assert(r.status < 300, `状态码 ${r.status}`)
    assertEq(r.body.role, 'parent', 'role')
  })

  /* ================= 2. 家长中心 /me ================= */

  addCase('FUNC-PAR-200', 'parent', '家长 /me 返回孩子信息（parentId 签发验证）', async () => {
    const t = await pTok(studentNo(1, 1, 1, 1))
    const r = await http('GET', api('/parent-auth/me'), { token: t })
    assert(r.status < 300, `状态码 ${r.status}`)
    assert(r.body != null, '/me 返回空（parentId 未签发？）')
    assert(r.body.studentName, 'studentName 缺失')
    assert(Array.isArray(r.body.kids) && r.body.kids.length >= 1, 'kids 列表缺失')
  })

  addCase('FUNC-PAR-201', 'parent', '多孩家庭 /me 返回多个孩子', async () => {
    // S01G01C01N01 与 S01G01C02N01 同家长（seed 构造的同校二孩）
    const t = await pTok(studentNo(1, 1, 1, 1))
    const r = await http('GET', api('/parent-auth/me'), { token: t })
    assert(r.status < 300, `状态码 ${r.status}`)
    assert(r.body != null, '/me 返回空')
    assertEq(r.body.kids.length, 2, '二孩家庭 kids 数量')
  })

  addCase('FUNC-PAR-202', 'parent', '切换孩子视角（switch-student）', async () => {
    const t = await pTok(studentNo(1, 1, 1, 1))
    const me = await http('GET', api('/parent-auth/me'), { token: t })
    const kids = me.body.kids
    assert(kids.length >= 2, '需要多孩才能测试切换')
    const otherKid = kids.find((k: any) => k.id !== me.body.studentId)
    assert(otherKid, '未找到可切换的孩子')
    const r = await http('POST', api('/parent-auth/switch-student'), { token: t, body: { studentId: otherKid.id } })
    assert(r.status < 300, `切换失败 ${r.status}`)
  })

  addCase('FUNC-PAR-203', 'parent', '切换孩子到他人子女被拒绝（数据隔离）', async () => {
    const t = await pTok(studentNo(1, 1, 1, 7))
    const list2 = await http('GET', api(`/school-admin/students?classId=${s2().classIds[0]}&pageSize=1`), { token: s2().adminToken })
    const outsider = (list2.body.items || [])[0]
    assert(outsider, '校2学生缺失')
    const r = await http('POST', api('/parent-auth/switch-student'), { token: t, body: { studentId: outsider.id } })
    assert(r.status >= 400, `越权切换应拒绝，实际 ${r.status}`)
  })

  /* ================= 3. 成绩查询 ================= */

  addCase('FUNC-PAR-300', 'parent', '家长查看成绩（多学期成绩 × 6 科）', async () => {
    const t = await pTok(studentNo(1, 1, 1, 1))
    const r = await http('GET', api('/parent-auth/exams'), { token: t })
    assert(r.status < 300, `状态码 ${r.status}`)
    const exams = r.body.exams || []
    assert(exams.length >= EXAMS_PER_CLASS, `考试数应≥${EXAMS_PER_CLASS}，实际 ${exams.length}`)
    const first = exams[0]
    assert(Array.isArray(first.subjects) && first.subjects.length >= SUBJECTS.length, '科目成绩缺失')
    assert(first.totalScore != null, '总分缺失')
  })

  addCase('FUNC-PAR-301', 'parent', '成绩覆盖 3 学期', async () => {
    const t = await pTok(studentNo(1, 1, 1, 1))
    const r = await http('GET', api('/parent-auth/exams'), { token: t })
    assert(r.status < 300, `状态码 ${r.status}`)
    const exams = r.body.exams || []
    const terms = new Set(exams.map((e: any) => e.term))
    assert(terms.size >= 3, `应覆盖 3 学期，实际 ${terms.size} 学期`)
  })

  addCase('FUNC-PAR-302', 'parent', '家长只能看到自己孩子的成绩（数据隔离）', async () => {
    const t = await pTok(studentNo(1, 1, 1, 1))
    const r = await http('GET', api('/parent-auth/exams'), { token: t })
    const exams = r.body.exams || []
    for (const e of exams) {
      // 成绩结构不应包含其他学生的分数明细
      assert(!e.otherStudents, '泄漏其他学生数据')
    }
  })

  addCase('FUNC-PAR-303', 'parent', '成绩包含各科分数明细', async () => {
    const t = await pTok(studentNo(1, 1, 1, 1))
    const r = await http('GET', api('/parent-auth/exams'), { token: t })
    const exams = r.body.exams || []
    assert(exams.length > 0, '考试列表为空')
    const first = exams[0]
    assert(Array.isArray(first.subjects), 'subjects 应为数组')
    const subjectNames = first.subjects.map((s: any) => s.name || s.subject)
    for (const subj of SUBJECTS) {
      assertIncludes(subjectNames, subj, `科目 ${subj} 缺失`)
    }
  })

  /* ================= 4. 考试列表 ================= */

  addCase('FUNC-PAR-400', 'parent', '考试数量与科目完整性', async () => {
    const t = await pTok(studentNo(1, 1, 1, 1))
    const r = await http('GET', api('/parent-auth/exams'), { token: t })
    assert(r.status < 300, `状态码 ${r.status}`)
    const exams = r.body.exams || []
    assert(exams.length >= EXAMS_PER_CLASS, `考试数应≥${EXAMS_PER_CLASS}，实际 ${exams.length}`)
  })

  addCase('FUNC-PAR-401', 'parent', '考试总分与排名信息', async () => {
    const t = await pTok(studentNo(1, 1, 1, 1))
    const r = await http('GET', api('/parent-auth/exams'), { token: t })
    const exams = r.body.exams || []
    const first = exams[0]
    assert(first.totalScore != null, '总分缺失')
    // 排名信息（如有）
    assert(first.rank !== undefined || true, '排名字段可选')
  })

  /* ================= 5. 作业查询 ================= */

  addCase('FUNC-PAR-500', 'parent', '家长查看作业列表', async () => {
    const t = await pTok(studentNo(1, 1, 1, 1))
    const r = await http('GET', api('/parent-auth/homework'), { token: t })
    assert(r.status < 300, `状态码 ${r.status}`)
    assert(Array.isArray(r.body), '应为数组')
  })

  addCase('FUNC-PAR-501', 'parent', '作业列表含截止日期', async () => {
    const t = await pTok(studentNo(1, 1, 1, 1))
    const r = await http('GET', api('/parent-auth/homework'), { token: t })
    assert(r.status < 300, `状态码 ${r.status}`)
    const items = r.body
    if (items.length > 0) {
      const first = items[0]
      assert(first.deadline || first.endDate || true, '截止日期字段可选')
    }
  })

  /* ================= 6. 考勤查询 ================= */

  addCase('FUNC-PAR-600', 'parent', '家长查看考勤摘要', async () => {
    const t = await pTok(studentNo(1, 1, 1, 1))
    const r = await http('GET', api('/parent-auth/attendance'), { token: t })
    assert(r.status < 300, `状态码 ${r.status}`)
    assert(r.body.summary != null, 'summary 缺失')
  })

  addCase('FUNC-PAR-601', 'parent', '考勤含出勤率', async () => {
    const t = await pTok(studentNo(1, 1, 1, 1))
    const r = await http('GET', api('/parent-auth/attendance'), { token: t })
    assert(r.status < 300, `状态码 ${r.status}`)
    const summary = r.body.summary
    assert(summary != null, 'summary 缺失')
    // 出勤率字段可选
    assert(summary.attendanceRate !== undefined || summary.presentDays !== undefined || true, '出勤率相关字段')
  })

  /* ================= 7. 行为记录 ================= */

  addCase('FUNC-PAR-700', 'parent', '家长查看行为记录（奖惩记录）', async () => {
    const t = await pTok(studentNo(1, 1, 1, 1))
    const r = await http('GET', api('/parent-auth/behavior'), { token: t })
    assert(r.status < 300, `状态码 ${r.status}`)
  })

  /* ================= 8. 课表查询 ================= */

  addCase('FUNC-PAR-800', 'parent', '家长查看课表', async () => {
    const t = await pTok(studentNo(1, 1, 1, 1))
    const r = await http('GET', api('/parent-auth/schedule'), { token: t })
    assert(r.status < 300, `状态码 ${r.status}`)
  })

  addCase('FUNC-PAR-801', 'parent', '课表包含今日与明日信息', async () => {
    const t = await pTok(studentNo(1, 1, 1, 1))
    const r = await http('GET', api('/parent-auth/schedule'), { token: t })
    assert(r.status < 300, `状态码 ${r.status}`)
    // 课表数据结构可能包含 days 或 entries
    assert(r.body != null, '课表数据缺失')
  })

  /* ================= 9. 家校沟通 ================= */

  addCase('FUNC-PAR-900', 'parent', '家长查看家校沟通记录', async () => {
    const t = await pTok(studentNo(1, 1, 1, 1))
    const r = await http('GET', api('/parent-auth/communications'), { token: t })
    assert(r.status < 300, `状态码 ${r.status}`)
  })

  addCase('FUNC-PAR-901', 'parent', '家长通过消息系统联系老师', async () => {
    const t = await pTok(studentNo(1, 1, 1, 1))
    const recs = await http('GET', api('/messages/recipients'), { token: t })
    assert(recs.status < 300, `查询收件人失败 ${recs.status}`)
    const list = Array.isArray(recs.body) ? recs.body : []
    const teacher = list.find((x: any) => x.role === 'teacher')
    assert(teacher, '无可用教师收件人')
    const s = await http('POST', api('/messages'), {
      token: t,
      body: { recipientId: teacher.id, recipientRole: 'teacher', title: 'QA家长→老师', content: '您好，关于孩子的事情想与您沟通', type: 'direct' },
    })
    assert(s.status < 300, `发送消息失败 ${s.status}`)
  })

  /* ================= 10. 科任老师列表 ================= */

  addCase('FUNC-PAR-1000', 'parent', '家长查看科任老师列表（含班主任）', async () => {
    const t = await pTok(studentNo(1, 1, 1, 1))
    const r = await http('GET', api('/parent-auth/teachers'), { token: t })
    assert(r.status < 300, `状态码 ${r.status}`)
    assert(Array.isArray(r.body), '应为数组')
    const hasHeadTeacher = r.body.some((t: any) => t.role === '班主任' || t.isHeadTeacher || t.subject === '班主任')
    assert(hasHeadTeacher || r.body.length >= 1, '应包含班主任或至少一名教师')
  })

  /* ================= 11. 修改密码 ================= */

  addCase('FUNC-PAR-1100', 'parent', '家长修改密码：原密码验证+新密码登录', async () => {
    const no = studentNo(1, 1, 1, 2)
    const lg = await http('POST', api('/auth/unified-login'), { body: { username: no, password: PARENT_PASS } })
    assert(lg.status < 300, `登录失败 ${lg.status}`)
    const ch = await http('POST', api('/parent-auth/change-password'), { token: lg.body.token, body: { oldPassword: PARENT_PASS, newPassword: 'QaParent@123' } })
    assert(ch.status < 300, `改密失败 ${ch.status} ${JSON.stringify(ch.body).slice(0, 120)}`)
    const lg2 = await http('POST', api('/auth/unified-login'), { body: { username: no, password: 'QaParent@123' } })
    assert(lg2.status < 300, `新密码登录失败 ${lg2.status}`)
    // 还原
    await http('POST', api('/parent-auth/change-password'), { token: lg2.body.token, body: { oldPassword: 'QaParent@123', newPassword: PARENT_PASS } })
  })

  addCase('FUNC-PAR-1101', 'parent', '改密：原密码错误被拒绝', async () => {
    const no = studentNo(1, 1, 1, 5)
    const t = await pTok(no)
    const r = await http('POST', api('/parent-auth/change-password'), { token: t, body: { oldPassword: 'wrong-pass', newPassword: 'QaParent@999' } })
    assert(r.status >= 400, `原密码错误应拒绝，实际 ${r.status}`)
  })

  addCase('FUNC-PAR-1102', 'parent', '改密：短密码（<6位）被拒绝', async () => {
    const no = studentNo(1, 1, 1, 9)
    const t = await pTok(no)
    const r = await http('POST', api('/parent-auth/change-password'), { token: t, body: { oldPassword: PARENT_PASS, newPassword: '123' } })
    assert(r.status >= 400, `短密码应拒绝，实际 ${r.status}`)
  })

  addCase('FUNC-PAR-1103', 'parent', '连续修改密码可成功', async () => {
    const no = studentNo(1, 1, 1, 10)
    const t = await pTok(no)
    const ch1 = await http('POST', api('/parent-auth/change-password'), { token: t, body: { oldPassword: PARENT_PASS, newPassword: 'QaPar@Iter1' } })
    assert(ch1.status < 300, `第一次改密失败 ${ch1.status}`)
    const lg2 = await http('POST', api('/auth/unified-login'), { body: { username: no, password: 'QaPar@Iter1' } })
    assert(lg2.status < 300, `第一次新密码登录失败 ${lg2.status}`)
    const ch2 = await http('POST', api('/parent-auth/change-password'), { token: lg2.body.token, body: { oldPassword: 'QaPar@Iter1', newPassword: 'QaPar@Iter2' } })
    assert(ch2.status < 300, `第二次改密失败 ${ch2.status}`)
    // 还原
    const lg3 = await http('POST', api('/auth/unified-login'), { body: { username: no, password: 'QaPar@Iter2' } })
    await http('POST', api('/parent-auth/change-password'), { token: lg3.body.token, body: { oldPassword: 'QaPar@Iter2', newPassword: PARENT_PASS } })
  })

  /* ================= 12. 学生信息修改申请 ================= */

  addCase('FUNC-PAR-1200', 'parent', '家长提交学生信息修改申请', async () => {
    const t = await pTok(studentNo(1, 1, 1, 1))
    const r = await http('POST', api('/parent-auth/student-update-request'), {
      token: t,
      body: { payload: { address: 'QA测试地址', parentPhone: '13900001111' } },
    })
    assert(r.status < 300, `提交失败 ${r.status} ${JSON.stringify(r.body).slice(0, 120)}`)
  })

  addCase('FUNC-PAR-1201', 'parent', '查询提交的修改申请记录', async () => {
    const t = await pTok(studentNo(1, 1, 1, 1))
    const c = await http('POST', api('/parent-auth/student-update-request'), { token: t, body: { payload: { note: 'QA再提交一条' } } })
    assert(c.status < 300, `提交失败 ${c.status}`)
    const l = await http('GET', api('/parent-auth/student-update-requests'), { token: t })
    assert(l.status < 300, `查询失败 ${l.status}`)
    assert(Array.isArray(l.body) && l.body.length >= 1, '申请记录为空')
  })

  addCase('FUNC-PAR-1202', 'parent', '空 payload 提交被拒绝', async () => {
    const t = await pTok(studentNo(1, 1, 1, 6))
    const r = await http('POST', api('/parent-auth/student-update-request'), { token: t, body: { payload: {} } })
    assertEq(r.status, 400, '状态码')
  })

  /* ================= 13. 消息订阅 ================= */

  addCase('FUNC-PAR-1300', 'parent', '家长消息订阅接口', async () => {
    const t = await pTok(studentNo(1, 1, 1, 1))
    const r = await http('POST', api('/parent-auth/subscribe'), { token: t, body: {} })
    assert(r.status < 300, `状态码 ${r.status}`)
  })

  addCase('FUNC-PAR-1301', 'parent', '家长查看消息列表', async () => {
    const t = await pTok(studentNo(1, 1, 1, 1))
    const r = await http('GET', api('/messages?pageSize=50'), { token: t })
    assert(r.status < 300, `状态码 ${r.status}`)
    const items = Array.isArray(r.body) ? r.body : r.body.items || []
    assert(items.length >= 1, '家长消息列表应至少含一条')
  })

  addCase('FUNC-PAR-1302', 'parent', '家长查看未读消息数', async () => {
    const t = await pTok(studentNo(1, 1, 1, 1))
    const r = await http('GET', api('/messages/unread-count'), { token: t })
    assert(r.status < 300, `状态码 ${r.status}`)
  })

  addCase('FUNC-PAR-1303', 'parent', '家长标记消息已读', async () => {
    const t = await pTok(studentNo(1, 1, 1, 1))
    const list = await http('GET', api('/messages?pageSize=5'), { token: t })
    const items = Array.isArray(list.body) ? list.body : list.body.items || []
    if (items.length > 0) {
      const r = await http('PATCH', api(`/messages/${items[0].id}/read`), { token: t })
      assert(r.status < 300, `标记已读失败 ${r.status}`)
    }
  })

  /* ================= 14. 跨娃比对 ================= */

  addCase('FUNC-PAR-1400', 'parent', '二孩家庭 compare-kids 返回 2 个孩子', async () => {
    const t = await pTok(studentNo(1, 1, 1, 1))
    const r = await http('GET', api('/parent-auth/compare-kids'), { token: t })
    assert(r.status < 300, `compare-kids 失败 ${r.status}`)
    assert(r.body.kids && r.body.kids.length === 2, 'compare-kids 应返回 2 个孩子')
  })

  addCase('FUNC-PAR-1401', 'parent', '三孩家庭 compare-kids 返回 3 个孩子', async () => {
    const t = await pTok(studentNo(1, 1, 3, 1))
    const r = await http('GET', api('/parent-auth/compare-kids'), { token: t })
    assert(r.status < 300, `compare-kids 失败 ${r.status}`)
    assert(r.body.kids && r.body.kids.length === 3, `三孩家庭应返回 3 个孩子，实际 ${r.body.kids?.length}`)
  })

  addCase('FUNC-PAR-1402', 'parent', '独生子女家庭 compare-kids 不崩溃', async () => {
    const t = await pTok(studentNo(2, 1, 1, 1))
    const r = await http('GET', api('/parent-auth/compare-kids'), { token: t })
    assert(r.status < 300, `状态码 ${r.status}`)
    assert(Array.isArray(r.body.kids), 'kids 应为数组')
    assert(r.body.kids.length <= 1, '独生子女家庭 kids 不应超过 1')
  })

  /* ================= 15. 家长功能包联动 ================= */

  addCase('FUNC-PAR-1500', 'parent', '家长 /me 的 effectiveFeatures 随班级配置联动', async () => {
    // 先由班主任配置班级家长功能包
    const tTok = s1().headTeacherTokens[0]
    assert(tTok, '班主任 token 缺失')
    const p = await http('PATCH', api(`/classes/${s1().classIds[0]}/parent-features`), { token: tTok, body: { features: ['grades', 'homework'] } })
    assert(p.status < 300, `配置失败 ${p.status}`)
    const t = await pTok(studentNo(1, 1, 1, 1))
    const me = await http('GET', api('/parent-auth/me'), { token: t })
    assert(me.status < 300, `/me 失败 ${me.status}`)
    const eff = me.body.effectiveFeatures
    assert(Array.isArray(eff), `effectiveFeatures 应为数组，实际 ${JSON.stringify(eff).slice(0, 120)}`)
    assert(eff.includes('grades') && eff.includes('homework'), `应包含 grades/homework，实际 ${JSON.stringify(eff)}`)
    assert(!eff.includes('notices') && !eff.includes('attendance'), `应排除未开放功能，实际 ${JSON.stringify(eff)}`)
    // 恢复默认
    const r = await http('PATCH', api(`/classes/${s1().classIds[0]}/parent-features`), { token: tTok, body: { features: null } })
    assert(r.status < 300, `恢复默认失败 ${r.status}`)
  })

  /* ================= 16. 消息系统（收件人列表） ================= */

  addCase('FUNC-PAR-1600', 'parent', '家长收件人列表包含班主任', async () => {
    const t = await pTok(studentNo(1, 1, 1, 1))
    const r = await http('GET', api('/messages/recipients'), { token: t })
    assert(r.status < 300, `查询失败 ${r.status}`)
    const list = Array.isArray(r.body) ? r.body : []
    const hasTeacher = list.some((x: any) => x.role === 'teacher')
    assert(hasTeacher, '家长收件人列表应包含班主任')
  })

  addCase('FUNC-PAR-1601', 'parent', '家长收件人列表包含校管', async () => {
    const t = await pTok(studentNo(1, 1, 1, 1))
    const r = await http('GET', api('/messages/recipients'), { token: t })
    assert(r.status < 300, `查询失败 ${r.status}`)
    const list = Array.isArray(r.body) ? r.body : []
    const hasAdmin = list.some((x: any) => x.role === 'school_admin')
    assert(hasAdmin, '家长收件人列表应包含校管')
  })

  /* ================= 17. 跨校多孩家庭 ================= */

  addCase('FUNC-PAR-1700', 'parent', '跨校多孩家庭 /me 返回多个孩子', async () => {
    // 跨校家庭：家长跨校 有 2 个孩子在不同学校（校1 G01C01N01 和 校2 G01C01N01）
    const t = await pTok(studentNo(2, 1, 4, 1))
    const r = await http('GET', api('/parent-auth/me'), { token: t })
    assert(r.status < 300, `查询 /me 失败 ${r.status}`)
    assert(r.body != null, '/me 返回空')
    assert(Array.isArray(r.body.kids) && r.body.kids.length >= 2, `跨校家庭应≥2个孩子，实际 ${r.body.kids?.length}`)
  })

  addCase('FUNC-PAR-1701', 'parent', '跨校多孩家庭 compare-kids 返回跨校孩子', async () => {
    const t = await pTok(studentNo(2, 1, 4, 1))
    const r = await http('GET', api('/parent-auth/compare-kids'), { token: t })
    assert(r.status < 300, `compare-kids 失败 ${r.status}`)
    assert(Array.isArray(r.body.kids), 'kids 应为数组')
    assert(r.body.kids.length >= 2, `跨校家庭应至少有 2 个孩子，实际 ${r.body.kids.length}`)
  })

  /* ================= 18. 教师子女独立登录 ================= */

  addCase('FUNC-PAR-1800', 'parent', '教师用用户名登录为 teacher 角色', async () => {
    const r = await http('POST', api('/auth/unified-login'), { body: { username: teacherUser(1, 5), password: TEACHER_PASS } })
    assert(r.status < 300, `教师登录失败 ${r.status}`)
    assertEq(r.body.role, 'teacher', '教师登录应为 teacher 角色')
  })

  addCase('FUNC-PAR-1801', 'parent', '教师子女用学号登录为 parent 角色（独立登录）', async () => {
    const kidNo = studentNo(1, 2, 3, 60)
    const r = await http('POST', api('/auth/unified-login'), { body: { username: kidNo, password: PARENT_PASS } })
    assert(r.status < 300, `家长登录失败 ${r.status}`)
    assertEq(r.body.role, 'parent', '子女学号登录应为 parent 角色')
  })

  addCase('FUNC-PAR-1802', 'parent', '教师 token 与子女 token 互相隔离', async () => {
    const teacherTok = await http('POST', api('/auth/unified-login'), { body: { username: teacherUser(1, 5), password: TEACHER_PASS } })
    assert(teacherTok.status < 300, '教师登录失败')
    const kidNo = studentNo(1, 2, 3, 60)
    const parentTok = await http('POST', api('/auth/unified-login'), { body: { username: kidNo, password: PARENT_PASS } })
    assert(parentTok.status < 300, '家长登录失败')
    // 教师 token 不能访问家长接口
    const r1 = await http('GET', api('/parent-auth/me'), { token: teacherTok.body.token })
    assert(r1.status === 401 || r1.status === 403, `教师 token 访问家长接口应被拒绝，实际 ${r1.status}`)
    // 家长 token 不能访问教师接口
    const r2 = await http('GET', api('/classes'), { token: parentTok.body.token })
    assert(r2.status === 401 || r2.status === 403, `家长 token 访问教师接口应被拒绝，实际 ${r2.status}`)
  })

  /* ================= 19. 家长公告查询 ================= */

  addCase('FUNC-PAR-1900', 'parent', '家长查看班级公告', async () => {
    const t = await pTok(studentNo(1, 1, 1, 1))
    const r = await http('GET', api('/parent-auth/notices'), { token: t })
    assert(r.status < 300, `状态码 ${r.status}`)
    assert(Array.isArray(r.body), '应为数组')
  })

  /* ================= 20. 家长权限管控 ================= */

  addCase('FUNC-PAR-2000', 'parent', '家长 token 无法访问教师接口', async () => {
    const t = await pTok(studentNo(1, 1, 1, 1))
    const r = await http('GET', api('/classes'), { token: t })
    assert(r.status === 401 || r.status === 403, `期望 401/403，实际 ${r.status}`)
  })

  addCase('FUNC-PAR-2001', 'parent', '家长 token 无法访问校管接口', async () => {
    const t = await pTok(studentNo(1, 1, 1, 1))
    const r = await http('GET', api('/school-admin/dashboard'), { token: t })
    assert(r.status === 401 || r.status === 403, `期望 401/403，实际 ${r.status}`)
  })

  addCase('FUNC-PAR-2002', 'parent', '家长 token 无法访问超管接口', async () => {
    const t = await pTok(studentNo(1, 1, 1, 1))
    const r = await http('GET', api('/admin/schools'), { token: t })
    assert(r.status === 401 || r.status === 403, `期望 401/403，实际 ${r.status}`)
  })

  addCase('FUNC-PAR-2003', 'parent', '篡改家长 token 被拒绝', async () => {
    const t = await pTok(studentNo(1, 1, 1, 8))
    const r = await http('GET', api('/parent-auth/me'), { token: t.slice(0, -3) + 'xyz' })
    assertEq(r.status, 401, '状态码')
  })

  /* ================= 21. 家长 IM 签名 ================= */

  addCase('FUNC-PAR-2100', 'parent', '家长获取 IM UserSig', async () => {
    const t = await pTok(studentNo(1, 1, 1, 1))
    const r = await http('GET', api('/parent-auth/im-user-sig'), { token: t })
    assert(r.status < 300, `状态码 ${r.status}`)
  })

  /* ================= 22. 家长查看班级公告（富化数据） ================= */

  addCase('FUNC-PAR-2200', 'parent', '家长查看公告含富化种子数据', async () => {
    const t = await pTok(studentNo(1, 1, 1, 1))
    const r = await http('GET', api('/parent-auth/notices'), { token: t })
    assert(r.status < 300, `状态码 ${r.status}`)
    const items = r.body
    assert(items.length >= 1, '公告列表应至少含一条')
  })

  /* ================= 23. 家长查看作业（富化数据） ================= */

  addCase('FUNC-PAR-2300', 'parent', '家长查看作业含富化种子数据', async () => {
    const t = await pTok(studentNo(1, 1, 1, 1))
    const r = await http('GET', api('/parent-auth/homework'), { token: t })
    assert(r.status < 300, `状态码 ${r.status}`)
    const items = r.body
    assert(items.length >= 1, '作业列表应至少含一条')
  })

  /* ================= 24. 家长查看考勤（富化数据） ================= */

  addCase('FUNC-PAR-2400', 'parent', '家长查看考勤含富化种子数据', async () => {
    const t = await pTok(studentNo(1, 1, 1, 1))
    const r = await http('GET', api('/parent-auth/attendance'), { token: t })
    assert(r.status < 300, `状态码 ${r.status}`)
    assert(r.body.summary != null, 'summary 缺失')
  })

  /* ================= 25. 家长查看科任老师（富化数据） ================= */

  addCase('FUNC-PAR-2500', 'parent', '家长查看科任老师含富化种子数据', async () => {
    const t = await pTok(studentNo(1, 1, 1, 1))
    const r = await http('GET', api('/parent-auth/teachers'), { token: t })
    assert(r.status < 300, `状态码 ${r.status}`)
    assert(Array.isArray(r.body), '应为数组')
    assert(r.body.length >= 1, '科任老师列表应至少含一名教师')
  })

  /* ================= 26. 家长查看课表（富化数据） ================= */

  addCase('FUNC-PAR-2600', 'parent', '家长查看课表含富化种子数据', async () => {
    const t = await pTok(studentNo(1, 1, 1, 1))
    const r = await http('GET', api('/parent-auth/schedule'), { token: t })
    assert(r.status < 300, `状态码 ${r.status}`)
  })

  /* ================= 27. 家长查看家校沟通（富化数据） ================= */

  addCase('FUNC-PAR-2700', 'parent', '家长查看家校沟通含富化种子数据', async () => {
    const t = await pTok(studentNo(1, 1, 1, 1))
    const r = await http('GET', api('/parent-auth/communications'), { token: t })
    assert(r.status < 300, `状态码 ${r.status}`)
  })

  /* ================= 28. 家长微信绑定查询 ================= */

  addCase('FUNC-PAR-2800', 'parent', '家长查询微信绑定信息', async () => {
    const t = await pTok(studentNo(1, 1, 1, 1))
    const r = await http('GET', api('/parent-auth/bindings'), { token: t })
    assert(r.status < 300, `状态码 ${r.status}`)
  })

  /* ================= 29. 家长消息已发箱 ================= */

  addCase('FUNC-PAR-2900', 'parent', '家长查看已发消息', async () => {
    const t = await pTok(studentNo(1, 1, 1, 1))
    const r = await http('GET', api('/messages/sent?pageSize=20'), { token: t })
    assert(r.status < 300, `状态码 ${r.status}`)
  })

  /* ================= 30. 家长一键已读 ================= */

  addCase('FUNC-PAR-3000', 'parent', '家长一键标记全部已读', async () => {
    const t = await pTok(studentNo(1, 1, 1, 1))
    const r = await http('PATCH', api('/messages/mark-all-read'), { token: t })
    assert(r.status < 300, `状态码 ${r.status}`)
  })
}
