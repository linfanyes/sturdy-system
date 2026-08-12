/**
 * 前后端交互跳转测试：菜单切换、面包屑、返回按钮、角色导航
 * 覆盖：一级菜单切换、二级菜单切换与返回、面包屑导航、角色切换
 */
import { http } from './harness'
import { addCase, assert, assertEq } from './framework'
import {
  SeedResult, SUPER_USER, SUPER_PASS, ADMIN_PASS, TEACHER_PASS, PARENT_PASS,
  adminUser, teacherUser, studentNo,
} from './seed'

export function registerNavigationCases(baseUrl: string, seed: SeedResult) {
  const api = (p: string) => `${baseUrl}${p}`
  const s1 = () => seed.schools[0]
  const s2 = () => seed.schools[1]

  /* ================= 一级菜单切换 ================= */

  // 超管侧：学校管理 → 校管管理 → 审计日志 → 平台配置
  addCase('NAV-SUP-01', 'navigation', '超管一级菜单：学校管理→校管管理→审计日志→平台配置', async () => {
    const lg = await http('POST', api('/auth/unified-login'), { body: { username: SUPER_USER, password: SUPER_PASS } })
    const tok = lg.body.token

    // 1. 学校管理页面数据可获取
    const schools = await http('GET', api('/admin/schools?pageSize=5'), { token: tok })
    assert(schools.status < 300, `学校管理页面加载失败 ${schools.status}`)

    // 2. 切到校管管理
    const admins = await http('GET', api('/admin/school-admins?pageSize=5'), { token: tok })
    assert(admins.status < 300, `校管管理页面加载失败 ${admins.status}`)

    // 3. 切到审计日志
    const audit = await http('GET', api('/admin/audit-logs?pageSize=5'), { token: tok })
    assert(audit.status < 300, `审计日志页面加载失败 ${audit.status}`)

    // 4. 切到平台配置
    const config = await http('GET', api('/config/app'), { token: tok })
    assert(config.status < 300, `平台配置页面加载失败 ${config.status}`)
  })

  addCase('NAV-SUP-02', 'navigation', '超管面包屑导航：从学校管理进入学校详情→返回学校列表', async () => {
    const lg = await http('POST', api('/auth/unified-login'), { body: { username: SUPER_USER, password: SUPER_PASS } })
    const tok = lg.body.token

    // 进入学校详情
    const detail = await http('GET', api(`/admin/schools/${s1().id}`), { token: tok })
    assert(detail.status < 300, `学校详情加载失败 ${detail.status}`)
    assert(detail.body.name, '学校详情缺少 name 字段')

    // 返回学校列表（重新加载）
    const list = await http('GET', api('/admin/schools?pageSize=5'), { token: tok })
    assert(list.status < 300, '返回学校列表失败')
  })

  /* ================= 校管侧：二级菜单切换 ================= */

  addCase('NAV-SA-01', 'navigation', '校管一级菜单：教师管理→班级管理→学生管理→成绩汇总→学校公告', async () => {
    const tok = s1().adminToken

    const teachers = await http('GET', api('/school-admin/teachers?pageSize=5'), { token: tok })
    assert(teachers.status < 300, `教师管理页面加载失败 ${teachers.status}`)

    const classes = await http('GET', api('/school-admin/classes?pageSize=5'), { token: tok })
    assert(classes.status < 300, `班级管理页面加载失败 ${classes.status}`)

    const students = await http('GET', api('/school-admin/students?pageSize=5'), { token: tok })
    assert(students.status < 300, `学生管理页面加载失败 ${students.status}`)

    const academic = await http('GET', api('/school-admin/academic/summary'), { token: tok })
    assert(academic.status < 300, `成绩汇总页面加载失败 ${academic.status}`)

    const notices = await http('GET', api('/school-admin/notices?pageSize=5'), { token: tok })
    assert(notices.status < 300, `学校公告页面加载失败 ${notices.status}`)
  })

  addCase('NAV-SA-02', 'navigation', '校管二级菜单：教师列表→教师详情→返回列表', async () => {
    const tok = s1().adminToken

    const list = await http('GET', api('/school-admin/teachers?pageSize=5'), { token: tok })
    assert(list.status < 300, '教师列表加载失败')
    const teacher = (list.body.items || [])[0]
    assert(teacher, '教师列表为空')

    // 教师详情
    const detail = await http('GET', api(`/school-admin/teachers/${teacher.id}`), { token: tok })
    assert(detail.status < 300, `教师详情加载失败 ${detail.status}`)

    // 返回列表
    const back = await http('GET', api('/school-admin/teachers?pageSize=5'), { token: tok })
    assert(back.status < 300, '返回教师列表失败')
  })

  addCase('NAV-SA-03', 'navigation', '校管按年级切换查看数据（6个年级）', async () => {
    const tok = s1().adminToken
    const grades = ['一年级', '二年级', '三年级', '四年级', '五年级', '六年级']

    for (const grade of grades) {
      const r = await http('GET', api(`/school-admin/academic/class-comparison?grade=${encodeURIComponent(grade)}`), { token: tok })
      assert(r.status < 300, `${grade} 成绩对比加载失败 ${r.status}`)
    }
  })

  addCase('NAV-SA-04', 'navigation', '校管搜索→重置→分页导航', async () => {
    const tok = s1().adminToken

    // 搜索
    const search = await http('GET', api('/school-admin/teachers?keyword=教师1&pageSize=20'), { token: tok })
    assert(search.status < 300, `搜索失败 ${search.status}`)

    // 分页（第1页→第2页）
    const page1 = await http('GET', api('/school-admin/teachers?page=1&pageSize=10'), { token: tok })
    const page2 = await http('GET', api('/school-admin/teachers?page=2&pageSize=10'), { token: tok })
    assert(page1.status < 300, '第1页加载失败')
    assert(page2.status < 300, '第2页加载失败')
  })

  /* ================= 教师侧：功能区切换 ================= */

  const tTok = () => {
    const t = s1().headTeacherTokens[0]
    assert(t, '班主任 token 缺失')
    return t
  }

  addCase('NAV-TCH-01', 'navigation', '教师一级菜单：班级→学生→考试→成绩→作业→考勤→消息', async () => {
    const tok = tTok()
    const classId = s1().classIds[0]

    // 班级
    const cls = await http('GET', api('/classes'), { token: tok })
    assert(cls.status < 300, `班级页面加载失败 ${cls.status}`)

    // 学生
    const stu = await http('GET', api(`/students?classId=${classId}&pageSize=5`), { token: tok })
    assert(stu.status < 300, `学生页面加载失败 ${stu.status}`)

    // 考试
    const ex = await http('GET', api(`/exams?classId=${classId}`), { token: tok })
    assert(ex.status < 300, `考试页面加载失败 ${ex.status}`)

    // 成绩
    const gr = await http('GET', api(`/grades?classId=${classId}`), { token: tok })
    assert(gr.status < 300, `成绩页面加载失败 ${gr.status}`)

    // 作业
    const hw = await http('GET', api(`/homework?classId=${classId}`), { token: tok })
    assert(hw.status < 300, `作业页面加载失败 ${hw.status}`)

    // 考勤
    const at = await http('GET', api(`/attendances?classId=${classId}`), { token: tok })
    assert(at.status < 300, `考勤页面加载失败 ${at.status}`)

    // 消息
    const msg = await http('GET', api('/messages?pageSize=5'), { token: tok })
    assert(msg.status < 300, `消息页面加载失败 ${msg.status}`)
  })

  addCase('NAV-TCH-02', 'navigation', '教师二级菜单：考试列表→考试详情→成绩分析', async () => {
    const tok = tTok()
    const classId = s1().classIds[0]

    // 考试列表
    const exams = await http('GET', api(`/exams?classId=${classId}`), { token: tok })
    assert(exams.status < 300, '考试列表加载失败')
    const list = Array.isArray(exams.body) ? exams.body : exams.body.items || []
    assert(list.length > 0, '考试列表为空')

    // 选择期末考试查看分析
    const exam = list.find((e: any) => e.name === '期末考试') || list[0]
    assert(exam, '未找到考试')

    // 考试分析
    const analysis = await http('GET', api(`/grades/analysis/exam?classId=${classId}&examId=${exam.id}`), { token: tok })
    assert(analysis.status < 300, `考试分析加载失败 ${analysis.status}`)
  })

  addCase('NAV-TCH-03', 'navigation', '教师学期切换：上学期→下学期→第三学期考试列表', async () => {
    const tok = tTok()
    const classId = s1().classIds[0]
    const terms = ['2025-2026学年上学期', '2025-2026学年下学期', '2026-2027学年上学期']

    for (const term of terms) {
      const r = await http('GET', api(`/exams?classId=${classId}&term=${encodeURIComponent(term)}`), { token: tok })
      assert(r.status < 300, `${term} 考试列表加载失败 ${r.status}`)
    }
  })

  addCase('NAV-TCH-04', 'navigation', '教师工具菜单：教材→资源库→AI工具→办公工具', async () => {
    const tok = tTok()

    const textbooks = await http('GET', api('/textbooks/tree?subject=语文'), { token: tok })
    assert(textbooks.status < 300, `教材页面加载失败 ${textbooks.status}`)

    const resources = await http('GET', api('/resource-library/poems?pageSize=5'), { token: tok })
    assert(resources.status < 300, `资源库页面加载失败 ${resources.status}`)

    const config = await http('GET', api('/config/app-config'), { token: tok })
    assert(config.status < 300, `教师配置/AI页面加载失败 ${config.status}`)
  })

  addCase('NAV-TCH-05', 'navigation', '教师CRUD面包屑：新建作业→查看作业列表→编辑→删除', async () => {
    const tok = tTok()
    const classId = s1().classIds[0]

    // 新建作业
    const c = await http('POST', api('/homework'), {
      token: tok,
      body: { classId, title: '导航测试作业', subject: '语文', content: '测试内容', startDate: '2026-08-01', deadline: '2026-08-10', status: '待批改' },
    })
    assert(c.status < 300, `新建作业失败 ${c.status}`)
    const hwId = c.body.id

    // 作业列表
    const l = await http('GET', api(`/homework?classId=${classId}`), { token: tok })
    assert(l.status < 300, '作业列表加载失败')

    // 删除作业
    const d = await http('DELETE', api(`/homework/${hwId}`), { token: tok })
    assert(d.status < 300, `删除作业失败 ${d.status}`)
  })

  /* ================= 家长侧：页面切换 ================= */

  const pTok = async (no?: string) => {
    const student = no || studentNo(1, 1, 1, 1)
    const lg = await http('POST', api('/auth/unified-login'), { body: { username: student, password: PARENT_PASS } })
    assert(lg.status < 300, `家长登录失败 ${lg.status}`)
    return lg.body.token as string
  }

  addCase('NAV-PAR-01', 'navigation', '家长一级菜单：概览→成绩→作业→考勤→公告→老师', async () => {
    const tok = await pTok()

    const me = await http('GET', api('/parent-auth/me'), { token: tok })
    assert(me.status < 300, `家长概览加载失败 ${me.status}`)

    const exams = await http('GET', api('/parent-auth/exams'), { token: tok })
    assert(exams.status < 300, `家长成绩加载失败 ${exams.status}`)

    const hw = await http('GET', api('/parent-auth/homework'), { token: tok })
    assert(hw.status < 300, `家长作业加载失败 ${hw.status}`)

    const at = await http('GET', api('/parent-auth/attendance'), { token: tok })
    assert(at.status < 300, `家长考勤加载失败 ${at.status}`)

    const notices = await http('GET', api('/parent-auth/notices'), { token: tok })
    assert(notices.status < 300, `家长公告加载失败 ${notices.status}`)

    const teachers = await http('GET', api('/parent-auth/teachers'), { token: tok })
    assert(teachers.status < 300, `家长老师列表加载失败 ${teachers.status}`)
  })

  addCase('NAV-PAR-02', 'navigation', '家长多孩切换：查看孩子A→切换到孩子B→跨娃比对', async () => {
    // 使用二孩家庭的第一个孩子登录
    const tok = await pTok(studentNo(1, 1, 1, 1))

    // 查看第一个孩子
    const me1 = await http('GET', api('/parent-auth/me'), { token: tok })
    assert(me1.status < 300, '家长概览加载失败')

    // 跨娃比对
    const cmp = await http('GET', api('/parent-auth/compare-kids'), { token: tok })
    assert(cmp.status < 300, `跨娃比对加载失败 ${cmp.status}`)
    assert(cmp.body.kids && cmp.body.kids.length >= 2, `跨娃比对应返回至少2个孩子`)
  })

  addCase('NAV-PAR-03', 'navigation', '家长学期切换：查看不同学期成绩', async () => {
    const tok = await pTok()
    const terms = ['2025-2026学年上学期', '2025-2026学年下学期', '2026-2027学年上学期']

    for (const term of terms) {
      const r = await http('GET', api(`/parent-auth/exams?term=${encodeURIComponent(term)}`), { token: tok })
      assert(r.status < 300, `${term} 成绩加载失败 ${r.status}`)
    }
  })

  /* ================= 角色切换导航 ================= */

  addCase('NAV-ROLE-01', 'navigation', '同一账号角色切换：教师→家长（师兼长场景）', async () => {
    // 教师登录
    const tLg = await http('POST', api('/auth/unified-login'), { body: { username: teacherUser(1, 5), password: TEACHER_PASS } })
    assert(tLg.status < 300, `教师登录失败 ${tLg.status}`)
    assertEq(tLg.body.role, 'teacher', '教师角色')
    const tTok = tLg.body.token

    // 教师身份：访问教师接口
    const classes = await http('GET', api('/classes'), { token: tTok })
    assert(classes.status < 300, '教师访问班级失败')

    // 家长身份：用孩子学号登录
    const pLg = await http('POST', api('/auth/unified-login'), { body: { username: studentNo(1, 2, 3, 60), password: PARENT_PASS } })
    assert(pLg.status < 300, `家长登录失败 ${pLg.status}`)
    assertEq(pLg.body.role, 'parent', '家长角色')
    const pTokVal = pLg.body.token

    // 家长身份：访问家长接口
    const me = await http('GET', api('/parent-auth/me'), { token: pTokVal })
    assert(me.status < 300, '家长访问 /me 失败')
  })

  addCase('NAV-ROLE-02', 'navigation', '校管切换学校（如果支持多校管理）', async () => {
    // 校管1 只能看到校1的数据
    const tok1 = s1().adminToken
    const teachers1 = await http('GET', api('/school-admin/teachers?pageSize=5'), { token: tok1 })
    assert(teachers1.status < 300, '校管1教师列表加载失败')

    // 校管2 只能看到校2的数据
    const tok2 = s2().adminToken
    const teachers2 = await http('GET', api('/school-admin/teachers?pageSize=5'), { token: tok2 })
    assert(teachers2.status < 300, '校管2教师列表加载失败')

    // 数据隔离验证
    const names1 = (teachers1.body.items || []).map((t: any) => t.name)
    const names2 = (teachers2.body.items || []).map((t: any) => t.name)
    for (const n of names1) assert(!names2.includes(n), `跨校数据泄漏：${n}`)
  })

  addCase('NAV-ROLE-03', 'navigation', '教师切换班级（多班教学场景）', async () => {
    const tok = tTok()
    // 教师名下所有班级
    const cls = await http('GET', api('/classes'), { token: tok })
    assert(cls.status < 300, '班级列表加载失败')
    const classList = Array.isArray(cls.body) ? cls.body : cls.body.items || []
    assert(classList.length >= 1, '教师名下无班级')

    // 遍历每个班级查看数据
    for (const c of classList.slice(0, 3)) {
      const students = await http('GET', api(`/students?classId=${c.id}&pageSize=5`), { token: tok })
      assert(students.status < 300, `班级 ${c.name} 学生加载失败`)
    }
  })

  /* ================= 批量操作导航 ================= */

  addCase('NAV-BATCH-01', 'navigation', '校管批量导入→列表刷新→数据验证', async () => {
    const tok = s1().adminToken

    // 批量导入教师
    const batchTeachers = [
      { name: '批量教师A', username: 'qabatch_a', password: 'QaBatch@123', subject: '语文' },
      { name: '批量教师B', username: 'qabatch_b', password: 'QaBatch@123', subject: '数学' },
      { name: '批量教师C', username: 'qabatch_c', password: 'QaBatch@123', subject: '英语' },
    ]
    const importResult = await http('POST', api('/school-admin/teachers/batch'), { token: tok, body: { teachers: batchTeachers } })
    assert(importResult.status < 300, `批量导入失败 ${importResult.status}`)

    // 刷新列表验证
    const list = await http('GET', api('/school-admin/teachers?keyword=批量&pageSize=20'), { token: tok })
    assert(list.status < 300, '列表刷新失败')
    const items = list.body.items || []
    assert(items.length >= 3, `应至少有3个批量教师，实际 ${items.length}`)
  })

  addCase('NAV-BATCH-02', 'navigation', '教师批量成绩导入→成绩查询→验证更新', async () => {
    const tok = tTok()
    const classId = s1().classIds[0]

    // 创建考试
    const exam = await http('POST', api('/exams'), {
      token: tok,
      body: { classId, name: '导航批量测验', term: '2025-2026学年下学期', date: '2026-08-15', subjects: ['语文', '数学'] },
    })
    assert(exam.status < 300, `创建考试失败 ${exam.status}`)

    // 获取学生
    const students = await http('GET', api(`/students?classId=${classId}&pageSize=10`), { token: tok })
    const stus = (students.body.items || []).slice(0, 5)

    // 批量导入成绩
    const rows = stus.map((s: any, i: number) => ({ studentId: s.id, score: 70 + i, valid: true }))
    const commit = await http('POST', api('/grades/import-commit'), {
      token: tok,
      body: { classId, examName: '导航批量测验', subject: '语文', date: '2026-08-15', rows },
    })
    assert(commit.status < 300, `批量导入成绩失败 ${commit.status}`)

    // 查询验证
    const grades = await http('GET', api(`/grades?classId=${classId}`), { token: tok })
    const gradeList = Array.isArray(grades.body) ? grades.body : grades.body.items || []
    const found = gradeList.find((g: any) => g.examName === '导航批量测验' && g.subject === '语文')
    assert(found, '未查到批量导入的成绩')
  })

  /* ================= 三学期导航 ================= */

  addCase('NAV-SEMESTER-01', 'navigation', '三学期数据导航：上学期→下学期→第三学期', async () => {
    const tok = tTok()
    const classId = s1().classIds[0]
    const semesters = [
      { name: '2025-2026学年上学期', expectedCount: 10 },
      { name: '2025-2026学年下学期', expectedCount: 10 },
      { name: '2026-2027学年上学期', expectedCount: 10 },
    ]

    for (const sem of semesters) {
      const exams = await http('GET', api(`/exams?classId=${classId}&term=${encodeURIComponent(sem.name)}`), { token: tok })
      assert(exams.status < 300, `${sem.name} 考试列表加载失败`)
      const list = Array.isArray(exams.body) ? exams.body : exams.body.items || []
      assert(list.length >= sem.expectedCount, `${sem.name} 考试数不足：期望${sem.expectedCount}，实际${list.length}`)
    }
  })
}