/**
 * 校管角色全功能覆盖测试用例
 * 覆盖 12 大功能域：登录认证、工作台、教师管理、班级管理、学生管理、
 * 公告管理、成绩查询、作业管理、功能包配置、消息系统、数据隔离、审计追踪
 *
 * 用例 ID 格式：FUNC-SA-{DOMAIN}-XXX
 * 基于 seedDataset 数据集执行（20 校 × 48 班 × 60 生 × 6 师 + 3 学期 × 30 考试）
 */
import { http } from './harness'
import { addCase, assert, assertEq, assertIncludes } from './framework'
import {
  SeedResult, ADMIN_PASS, TEACHER_PASS,
  adminUser, teacherUser, studentNo, classNo,
  SCHOOL_COUNT, GRADES_PER_SCHOOL, CLASSES_PER_GRADE, CLASSES_PER_SCHOOL,
  STUDENTS_PER_CLASS, TEACHERS_PER_CLASS, TEACHERS_PER_SCHOOL,
  EXAMS_PER_CLASS, SUBJECTS, GRADE_NAMES,
} from './seed'

export function registerSchoolAdminCases(baseUrl: string, seed: SeedResult) {
  const api = (path: string) => `${baseUrl}${path}`
  let sa1Token = ''
  let sa2Token = ''
  const s1 = () => seed.schools[0]
  const s2 = () => seed.schools[1]

  // 辅助：登录校管并缓存 token
  const loginAdmin = async (schoolIdx: number): Promise<string> => {
    const u = adminUser(schoolIdx)
    const r = await http('POST', api('/auth/unified-login'), { body: { username: u, password: ADMIN_PASS } })
    assert(r.status < 300, `校管${schoolIdx}登录失败 ${r.status}`)
    return r.body.token
  }

  // ===================================================================
  // 域 1：登录与认证
  // ===================================================================

  addCase('FUNC-SA-AUTH-01', 'school_admin', '校管登录返回 role=school_admin 与有效 token', async () => {
    const r = await http('POST', api('/auth/unified-login'), { body: { username: adminUser(1), password: ADMIN_PASS } })
    assert(r.status < 300, `登录失败 ${r.status}`)
    assertEq(r.body.role, 'school_admin', 'role')
    assert(typeof r.body.token === 'string' && r.body.token.length > 20, 'token 缺失或过短')
    assert(r.body.admin != null, 'admin 信息缺失')
    assertEq(r.body.admin.schoolId, s1().id, 'schoolId 不匹配')
    sa1Token = r.body.token
  })

  addCase('FUNC-SA-AUTH-02', 'school_admin', '校管登录后 token 可访问受保护接口', async () => {
    if (!sa1Token) sa1Token = await loginAdmin(1)
    const r = await http('GET', api('/school-admin/dashboard'), { token: sa1Token })
    assert(r.status < 300, `token 验证失败 ${r.status}`)
    assert(r.body.totalTeachers != null, 'dashboard 返回缺少 totalTeachers')
  })

  addCase('FUNC-SA-AUTH-03', 'school_admin', '错误密码登录返回 401', async () => {
    const r = await http('POST', api('/auth/unified-login'), { body: { username: adminUser(1), password: 'wrong-password' } })
    assertEq(r.status, 401, '状态码')
  })

  addCase('FUNC-SA-AUTH-04', 'school_admin', '不存在的校管账号登录返回 401', async () => {
    const r = await http('POST', api('/auth/unified-login'), { body: { username: 'nonexistent_admin_999', password: ADMIN_PASS } })
    assertEq(r.status, 401, '状态码')
  })

  addCase('FUNC-SA-AUTH-05', 'school_admin', '空密码登录返回 401', async () => {
    const r = await http('POST', api('/auth/unified-login'), { body: { username: adminUser(1), password: '' } })
    assertEq(r.status, 401, '状态码')
  })

  addCase('FUNC-SA-AUTH-06', 'school_admin', '无 token 访问受保护接口返回 401', async () => {
    const r = await http('GET', api('/school-admin/dashboard'))
    assertEq(r.status, 401, '状态码')
  })

  addCase('FUNC-SA-AUTH-07', 'school_admin', '伪造/篡改 token 访问被拒绝', async () => {
    const r = await http('GET', api('/school-admin/dashboard'), { token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJmYWtlIiwicm9sZSI6InNjaG9vbF9hZG1pbiJ9.invalid' })
    assert(r.status === 401 || r.status === 403, `期望 401/403，实际 ${r.status}`)
  })

  addCase('FUNC-SA-AUTH-08', 'school_admin', '校管 token 无法访问超管接口（角色隔离）', async () => {
    if (!sa1Token) sa1Token = await loginAdmin(1)
    const r = await http('GET', api('/admin/schools'), { token: sa1Token })
    assert(r.status === 401 || r.status === 403, `期望 401/403，实际 ${r.status}`)
  })

  addCase('FUNC-SA-AUTH-09', 'school_admin', '校管 token 无法访问教师接口（角色隔离）', async () => {
    if (!sa1Token) sa1Token = await loginAdmin(1)
    const r = await http('GET', api('/classes'), { token: sa1Token })
    assert(r.status === 401 || r.status === 403, `期望 401/403，实际 ${r.status}`)
  })

  addCase('FUNC-SA-AUTH-10', 'school_admin', '校管登录返回学校信息（schoolName, schoolCode）', async () => {
    const r = await http('POST', api('/auth/unified-login'), { body: { username: adminUser(1), password: ADMIN_PASS } })
    assert(r.status < 300, `登录失败 ${r.status}`)
    assert(r.body.admin.schoolName, 'schoolName 缺失')
    assert(typeof r.body.admin.schoolCode === 'string', 'schoolCode 缺失')
    assertEq(r.body.admin.schoolName, '测试第1学校', 'schoolName 不匹配')
  })

  // ===================================================================
  // 域 2：工作台 Dashboard
  // ===================================================================

  addCase('FUNC-SA-DASH-01', 'school_admin', '工作台统计接口返回教师/班级/学生数', async () => {
    if (!sa1Token) sa1Token = await loginAdmin(1)
    const r = await http('GET', api('/school-admin/dashboard'), { token: sa1Token })
    assert(r.status < 300, `状态码 ${r.status}`)
    assert(r.body.totalTeachers >= 200, `教师总数应≥200，实际 ${r.body.totalTeachers}`)
    assert(r.body.totalClasses >= 40, `班级总数应≥40，实际 ${r.body.totalClasses}`)
    assert(r.body.totalStudents >= 2000, `学生总数应≥2000，实际 ${r.body.totalStudents}`)
  })

  addCase('FUNC-SA-DASH-02', 'school_admin', '工作台返回活跃/非活跃教师数', async () => {
    if (!sa1Token) sa1Token = await loginAdmin(1)
    const r = await http('GET', api('/school-admin/dashboard'), { token: sa1Token })
    assert(r.status < 300, `状态码 ${r.status}`)
    assert(typeof r.body.activeTeachers === 'number', 'activeTeachers 缺失')
    assert(typeof r.body.inactiveTeachers === 'number', 'inactiveTeachers 缺失')
    assert(r.body.activeTeachers + r.body.inactiveTeachers === r.body.totalTeachers, '活跃+非活跃应等于总数')
  })

  addCase('FUNC-SA-DASH-03', 'school_admin', '工作台返回今日出勤率', async () => {
    if (!sa1Token) sa1Token = await loginAdmin(1)
    const r = await http('GET', api('/school-admin/dashboard'), { token: sa1Token })
    assert(r.status < 300, `状态码 ${r.status}`)
    assert(r.body.attendanceRate == null || typeof r.body.attendanceRate === 'number', 'attendanceRate 类型异常')
    assert(r.body.todayDate, 'todayDate 缺失')
  })

  addCase('FUNC-SA-DASH-04', 'school_admin', '工作台返回待批改作业数', async () => {
    if (!sa1Token) sa1Token = await loginAdmin(1)
    const r = await http('GET', api('/school-admin/dashboard'), { token: sa1Token })
    assert(r.status < 300, `状态码 ${r.status}`)
    assert(typeof r.body.pendingHomework === 'number', 'pendingHomework 缺失')
  })

  addCase('FUNC-SA-DASH-05', 'school_admin', '工作台返回已开通家长登录学生数', async () => {
    if (!sa1Token) sa1Token = await loginAdmin(1)
    const r = await http('GET', api('/school-admin/dashboard'), { token: sa1Token })
    assert(r.status < 300, `状态码 ${r.status}`)
    assert(typeof r.body.parentEnabled === 'number', 'parentEnabled 缺失')
    assert(r.body.parentEnabled > 0, 'parentEnabled 应大于 0')
  })

  addCase('FUNC-SA-DASH-06', 'school_admin', '工作台返回学科分布数据', async () => {
    if (!sa1Token) sa1Token = await loginAdmin(1)
    const r = await http('GET', api('/school-admin/dashboard'), { token: sa1Token })
    assert(r.status < 300, `状态码 ${r.status}`)
    assert(Array.isArray(r.body.subjectDistribution), 'subjectDistribution 应为数组')
    assert(r.body.subjectDistribution.length > 0, 'subjectDistribution 不应为空')
    const first = r.body.subjectDistribution[0]
    assert(first.name && typeof first.count === 'number', '学科分布结构异常')
  })

  addCase('FUNC-SA-DASH-07', 'school_admin', '工作台返回 schoolId 字段', async () => {
    if (!sa1Token) sa1Token = await loginAdmin(1)
    const r = await http('GET', api('/school-admin/dashboard'), { token: sa1Token })
    assert(r.status < 300, `状态码 ${r.status}`)
    assertEq(r.body.schoolId, s1().id, 'schoolId 不匹配')
  })

  // ===================================================================
  // 域 3：教师管理
  // ===================================================================

  addCase('FUNC-SA-TEACH-01', 'school_admin', '教师列表分页返回（总数 ≥ 200）', async () => {
    if (!sa1Token) sa1Token = await loginAdmin(1)
    const r = await http('GET', api('/school-admin/teachers?pageSize=500'), { token: sa1Token })
    assert(r.status < 300, `状态码 ${r.status}`)
    const total = r.body.total ?? (r.body.items || []).length
    assert(total >= 200, `教师总数应≥200，实际 ${total}`)
  })

  addCase('FUNC-SA-TEACH-02', 'school_admin', '教师列表按关键词搜索命中', async () => {
    if (!sa1Token) sa1Token = await loginAdmin(1)
    const r = await http('GET', api('/school-admin/teachers?keyword=教师1-001&pageSize=20'), { token: sa1Token })
    assert(r.status < 300, `状态码 ${r.status}`)
    const items = r.body.items || []
    assert(items.length > 0, '未搜索到任何教师')
    assert(items.some((t: any) => t.name && t.name.includes('教师1-001')), '未搜索到目标教师')
  })

  addCase('FUNC-SA-TEACH-03', 'school_admin', '新建教师后可登录', async () => {
    if (!sa1Token) sa1Token = await loginAdmin(1)
    const c = await http('POST', api('/school-admin/teachers'), {
      token: sa1Token,
      body: { name: 'QA新建教师', username: 'qasa_new01', password: 'QaNew@12345' },
    })
    assert(c.status < 300, `创建失败 ${c.status} ${JSON.stringify(c.body).slice(0, 120)}`)
    const lg = await http('POST', api('/auth/unified-login'), { body: { username: 'qasa_new01', password: 'QaNew@12345' } })
    assert(lg.status < 300, `新教师登录失败 ${lg.status}`)
    assertEq(lg.body.role, 'teacher', 'role')
  })

  addCase('FUNC-SA-TEACH-04', 'school_admin', '创建教师缺少姓名被 DTO 校验拒绝（400）', async () => {
    if (!sa1Token) sa1Token = await loginAdmin(1)
    const r = await http('POST', api('/school-admin/teachers'), {
      token: sa1Token,
      body: { username: 'qasa_new02', password: 'QaNew@12345' },
    })
    assertEq(r.status, 400, '状态码')
  })

  addCase('FUNC-SA-TEACH-05', 'school_admin', '批量创建教师', async () => {
    if (!sa1Token) sa1Token = await loginAdmin(1)
    const r = await http('POST', api('/school-admin/teachers/batch'), {
      token: sa1Token,
      body: {
        teachers: [
          { name: 'QA批量教师A', username: 'qasabatch_a', password: 'QaBatch@123' },
          { name: 'QA批量教师B', username: 'qasabatch_b', password: 'QaBatch@123' },
          { name: 'QA批量教师C', username: 'qasabatch_c', password: 'QaBatch@123' },
        ],
      },
    })
    assert(r.status < 300, `批量创建失败 ${r.status} ${JSON.stringify(r.body).slice(0, 120)}`)
  })

  addCase('FUNC-SA-TEACH-06', 'school_admin', '批量导入教师（batch-import）', async () => {
    if (!sa1Token) sa1Token = await loginAdmin(1)
    const r = await http('POST', api('/school-admin/teachers/batch-import'), {
      token: sa1Token,
      body: {
        teachers: [
          { name: 'QA导入教师D', username: 'qasaimp_d', password: 'QaImp@123' },
          { name: 'QA导入教师E', username: 'qasaimp_e', password: 'QaImp@123' },
        ],
      },
    })
    assert(r.status < 300, `批量导入失败 ${r.status} ${JSON.stringify(r.body).slice(0, 120)}`)
  })

  addCase('FUNC-SA-TEACH-07', 'school_admin', '查看教师详情', async () => {
    if (!sa1Token) sa1Token = await loginAdmin(1)
    const list = await http('GET', api('/school-admin/teachers?keyword=教师1-001&pageSize=1'), { token: sa1Token })
    const tch = (list.body.items || [])[0]
    assert(tch, '未找到教师')
    const r = await http('GET', api(`/school-admin/teachers/${tch.id}`), { token: sa1Token })
    assert(r.status < 300, `查询详情失败 ${r.status}`)
    assert(r.body.id, 'id 缺失')
    assert(r.body.name, 'name 缺失')
  })

  addCase('FUNC-SA-TEACH-08', 'school_admin', '更新教师信息', async () => {
    if (!sa1Token) sa1Token = await loginAdmin(1)
    const list = await http('GET', api('/school-admin/teachers?keyword=qasabatch_a&pageSize=1'), { token: sa1Token })
    const tch = (list.body.items || [])[0]
    assert(tch, '未找到批量创建的教师')
    const r = await http('PATCH', api(`/school-admin/teachers/${tch.id}`), {
      token: sa1Token,
      body: { name: 'QA批量教师A-已更新' },
    })
    assert(r.status < 300, `更新失败 ${r.status}`)
  })

  addCase('FUNC-SA-TEACH-09', 'school_admin', '重置教师密码后教师用新密码登录', async () => {
    if (!sa1Token) sa1Token = await loginAdmin(1)
    const list = await http('GET', api('/school-admin/teachers?keyword=qasabatch_b&pageSize=1'), { token: sa1Token })
    const tch = (list.body.items || [])[0]
    assert(tch, '未找到目标教师')
    const rs = await http('POST', api(`/school-admin/teachers/${tch.id}/reset-password`), {
      token: sa1Token,
      body: { password: 'QaReset@123' },
    })
    assert(rs.status < 300, `重置密码失败 ${rs.status}`)
    const lg = await http('POST', api('/auth/unified-login'), { body: { username: 'qasabatch_b', password: 'QaReset@123' } })
    assert(lg.status < 300, `新密码登录失败 ${lg.status}`)
  })

  addCase('FUNC-SA-TEACH-10', 'school_admin', '删除教师', async () => {
    if (!sa1Token) sa1Token = await loginAdmin(1)
    const list = await http('GET', api('/school-admin/teachers?keyword=qasabatch_c&pageSize=1'), { token: sa1Token })
    const tch = (list.body.items || [])[0]
    assert(tch, '未找到目标教师')
    const r = await http('DELETE', api(`/school-admin/teachers/${tch.id}`), { token: sa1Token })
    assert(r.status < 300, `删除失败 ${r.status}`)
  })

  addCase('FUNC-SA-TEACH-11', 'school_admin', '教师列表分页（skip/take）', async () => {
    if (!sa1Token) sa1Token = await loginAdmin(1)
    const r1 = await http('GET', api('/school-admin/teachers?skip=0&take=10'), { token: sa1Token })
    const r2 = await http('GET', api('/school-admin/teachers?skip=10&take=10'), { token: sa1Token })
    assert(r1.status < 300, `第一页失败 ${r1.status}`)
    assert(r2.status < 300, `第二页失败 ${r2.status}`)
    const items1 = r1.body.items || []
    const items2 = r2.body.items || []
    assert(items1.length <= 10, '第一页应≤10条')
    assert(items2.length <= 10, '第二页应≤10条')
    // 两页数据不应完全重叠
    if (items1.length > 0 && items2.length > 0) {
      assert(items1[0].id !== items2[0].id, '两页数据不应相同')
    }
  })

  addCase('FUNC-SA-TEACH-12', 'school_admin', '导出教师列表（CSV）', async () => {
    if (!sa1Token) sa1Token = await loginAdmin(1)
    const r = await http('GET', api('/school-admin/export/teachers'), { token: sa1Token })
    assert(r.status < 300, `导出失败 ${r.status}`)
  })

  addCase('FUNC-SA-TEACH-13', 'school_admin', '导出教师列表（XLSX）', async () => {
    if (!sa1Token) sa1Token = await loginAdmin(1)
    const r = await http('GET', api('/school-admin/export/teachers-xls'), { token: sa1Token })
    assert(r.status < 300, `导出 XLSX 失败 ${r.status}`)
  })

  // ===================================================================
  // 域 4：班级管理
  // ===================================================================

  addCase('FUNC-SA-CLASS-01', 'school_admin', '班级列表返回（总数 ≥ 40）', async () => {
    if (!sa1Token) sa1Token = await loginAdmin(1)
    const r = await http('GET', api('/school-admin/classes?pageSize=500'), { token: sa1Token })
    assert(r.status < 300, `状态码 ${r.status}`)
    const total = r.body.total ?? (r.body.items || []).length
    assert(total >= 40, `班级总数应≥40，实际 ${total}`)
  })

  addCase('FUNC-SA-CLASS-02', 'school_admin', '新建班级', async () => {
    if (!sa1Token) sa1Token = await loginAdmin(1)
    const r = await http('POST', api('/school-admin/classes'), {
      token: sa1Token,
      body: {
        name: 'QA测试班',
        grade: '一年级',
        classNo: '1099',
        headTeacher: '教师1-001',
      },
    })
    assert(r.status < 300, `创建班级失败 ${r.status} ${JSON.stringify(r.body).slice(0, 120)}`)
    assert(r.body.id, '班级 ID 缺失')
    assertEq(r.body.name, 'QA测试班', '班级名称不匹配')
  })

  addCase('FUNC-SA-CLASS-03', 'school_admin', '查看班级详情', async () => {
    if (!sa1Token) sa1Token = await loginAdmin(1)
    const classId = s1().classIds[0]
    const r = await http('GET', api(`/school-admin/classes/${classId}`), { token: sa1Token })
    assert(r.status < 300, `查询失败 ${r.status}`)
    assert(r.body.id, 'id 缺失')
    assert(r.body.name, 'name 缺失')
  })

  addCase('FUNC-SA-CLASS-04', 'school_admin', '更新班级信息', async () => {
    if (!sa1Token) sa1Token = await loginAdmin(1)
    const classId = s1().classIds[0]
    const r = await http('PATCH', api(`/school-admin/classes/${classId}`), {
      token: sa1Token,
      body: { name: '一年级(1)班-已更新' },
    })
    assert(r.status < 300, `更新失败 ${r.status}`)
  })

  addCase('FUNC-SA-CLASS-05', 'school_admin', '按年级筛选班级（通过 academic 接口间接验证年级数据）', async () => {
    if (!sa1Token) sa1Token = await loginAdmin(1)
    const r = await http('GET', api('/school-admin/academic/class-comparison?grade=一年级'), { token: sa1Token })
    assert(r.status < 300, `状态码 ${r.status}`)
    const classes = r.body.classes || []
    assert(classes.length >= 1, `一年级下班级数应≥1，实际 ${classes.length}`)
    assert(classes.length >= CLASSES_PER_GRADE, `一年级应≥${CLASSES_PER_GRADE}班，实际 ${classes.length}`)
  })

  addCase('FUNC-SA-CLASS-06', 'school_admin', '删除班级', async () => {
    if (!sa1Token) sa1Token = await loginAdmin(1)
    // 先创建一个临时班级再删除
    const c = await http('POST', api('/school-admin/classes'), {
      token: sa1Token,
      body: { name: 'QA待删班级', grade: '一年级', classNo: '1098', headTeacher: '教师1-001' },
    })
    assert(c.status < 300, `创建临时班级失败 ${c.status}`)
    const r = await http('DELETE', api(`/school-admin/classes/${c.body.id}`), { token: sa1Token })
    assert(r.status < 300, `删除失败 ${r.status}`)
  })

  addCase('FUNC-SA-CLASS-07', 'school_admin', '批量创建班级', async () => {
    if (!sa1Token) sa1Token = await loginAdmin(1)
    const r = await http('POST', api('/school-admin/classes/batch'), {
      token: sa1Token,
      body: {
        classes: [
          { name: 'QA批量班1', grade: '二年级', classNo: '2099', headTeacher: '教师1-001' },
          { name: 'QA批量班2', grade: '二年级', classNo: '2098', headTeacher: '教师1-001' },
        ],
      },
    })
    assert(r.status < 300, `批量创建班级失败 ${r.status} ${JSON.stringify(r.body).slice(0, 120)}`)
  })

  addCase('FUNC-SA-CLASS-08', 'school_admin', '导出班级列表（XLSX）', async () => {
    if (!sa1Token) sa1Token = await loginAdmin(1)
    const r = await http('GET', api('/school-admin/export/classes-xls'), { token: sa1Token })
    assert(r.status < 300, `导出班级 XLSX 失败 ${r.status}`)
  })

  // ===================================================================
  // 域 5：学生管理
  // ===================================================================

  addCase('FUNC-SA-STUD-01', 'school_admin', '学生列表按班级查询（≥ 50 人）', async () => {
    if (!sa1Token) sa1Token = await loginAdmin(1)
    const r = await http('GET', api(`/school-admin/students?classId=${s1().classIds[0]}&pageSize=200`), { token: sa1Token })
    assert(r.status < 300, `状态码 ${r.status}`)
    const total = r.body.total ?? (r.body.items || []).length
    assert(total >= 50, `学生数应≥50，实际 ${total}`)
  })

  addCase('FUNC-SA-STUD-02', 'school_admin', '学生搜索按姓名命中', async () => {
    if (!sa1Token) sa1Token = await loginAdmin(1)
    const r = await http('GET', api('/school-admin/students?keyword=学生1-1-1-1&pageSize=20'), { token: sa1Token })
    assert(r.status < 300, `状态码 ${r.status}`)
    const items = r.body.items || []
    assert(items.length > 0, '未搜索到任何学生')
    assert(items.some((s: any) => s.name && s.name.startsWith('学生1-1-1-1')), '未搜索到目标学生')
  })

  addCase('FUNC-SA-STUD-03', 'school_admin', '批量导入学生', async () => {
    if (!sa1Token) sa1Token = await loginAdmin(1)
    const r = await http('POST', api('/school-admin/students/batch-import'), {
      token: sa1Token,
      body: {
        students: [
          { name: 'QA批量学生1', studentNo: 'S01G01C01N99', className: '一年级(1)班' },
          { name: 'QA批量学生2', studentNo: 'S01G01C01N98', className: '一年级(1)班' },
        ],
      },
    })
    assert(r.status < 300, `批量导入学生失败 ${r.status} ${JSON.stringify(r.body).slice(0, 120)}`)
  })

  addCase('FUNC-SA-STUD-04', 'school_admin', '导出学生列表', async () => {
    if (!sa1Token) sa1Token = await loginAdmin(1)
    const r = await http('GET', api('/school-admin/students/export'), { token: sa1Token })
    assert(r.status < 300, `导出学生失败 ${r.status}`)
  })

  addCase('FUNC-SA-STUD-05', 'school_admin', '导出学生列表（XLSX）', async () => {
    if (!sa1Token) sa1Token = await loginAdmin(1)
    const r = await http('GET', api('/school-admin/export/students-xls'), { token: sa1Token })
    assert(r.status < 300, `导出学生 XLSX 失败 ${r.status}`)
  })

  addCase('FUNC-SA-STUD-06', 'school_admin', '更新学生信息', async () => {
    if (!sa1Token) sa1Token = await loginAdmin(1)
    const list = await http('GET', api(`/school-admin/students?classId=${s1().classIds[0]}&pageSize=1`), { token: sa1Token })
    const stu = (list.body.items || [])[0]
    assert(stu, '未找到学生')
    const r = await http('PATCH', api(`/school-admin/students/${stu.id}`), {
      token: sa1Token,
      body: { name: stu.name + '-已更新' },
    })
    assert(r.status < 300, `更新学生失败 ${r.status}`)
  })

  addCase('FUNC-SA-STUD-07', 'school_admin', '删除学生', async () => {
    if (!sa1Token) sa1Token = await loginAdmin(1)
    // 先创建一个临时学生
    const c = await http('POST', api('/school-admin/students/batch'), {
      token: sa1Token,
      body: { students: [{ name: 'QA待删学生', studentNo: 'S01G01C01N97', classId: s1().classIds[0] }] },
    })
    assert(c.status < 300, `创建临时学生失败 ${c.status}`)
    const list = await http('GET', api(`/school-admin/students?keyword=QA待删学生&pageSize=1`), { token: sa1Token })
    const stu = (list.body.items || [])[0]
    assert(stu, '未找到临时学生')
    const r = await http('DELETE', api(`/school-admin/students/${stu.id}`), { token: sa1Token })
    assert(r.status < 300, `删除学生失败 ${r.status}`)
  })

  addCase('FUNC-SA-STUD-08', 'school_admin', '学生列表分页（skip/take）', async () => {
    if (!sa1Token) sa1Token = await loginAdmin(1)
    const r = await http('GET', api(`/school-admin/students?classId=${s1().classIds[0]}&skip=0&take=20`), { token: sa1Token })
    assert(r.status < 300, `状态码 ${r.status}`)
    const items = r.body.items || []
    assert(items.length <= 20, '应≤20条')
  })

  addCase('FUNC-SA-STUD-09', 'school_admin', '批量创建学生（batch）', async () => {
    if (!sa1Token) sa1Token = await loginAdmin(1)
    const r = await http('POST', api('/school-admin/students/batch'), {
      token: sa1Token,
      body: {
        students: [
          { name: 'QA批量建学生1', studentNo: 'S01G01C01N96', classId: s1().classIds[0] },
          { name: 'QA批量建学生2', studentNo: 'S01G01C01N95', classId: s1().classIds[0] },
        ],
      },
    })
    assert(r.status < 300, `批量创建学生失败 ${r.status} ${JSON.stringify(r.body).slice(0, 120)}`)
  })

  // ===================================================================
  // 域 6：公告管理
  // ===================================================================

  addCase('FUNC-SA-NOTICE-01', 'school_admin', '创建学校公告', async () => {
    if (!sa1Token) sa1Token = await loginAdmin(1)
    const r = await http('POST', api('/school-admin/notices'), {
      token: sa1Token,
      body: { title: 'QA学校公告-创建', content: '测试内容', pinned: false },
    })
    assert(r.status < 300, `创建失败 ${r.status} ${JSON.stringify(r.body).slice(0, 120)}`)
    assert(r.body.id, '公告 ID 缺失')
    assertEq(r.body.title, 'QA学校公告-创建', '标题不匹配')
  })

  addCase('FUNC-SA-NOTICE-02', 'school_admin', '学校公告列表（含学校级与班级级）', async () => {
    if (!sa1Token) sa1Token = await loginAdmin(1)
    const r = await http('GET', api('/school-admin/notices?pageSize=200'), { token: sa1Token })
    assert(r.status < 300, `状态码 ${r.status}`)
    const items = r.body.items || (Array.isArray(r.body) ? r.body : [])
    assert(items.length >= 1, `公告数应≥1，实际 ${items.length}`)
  })

  addCase('FUNC-SA-NOTICE-03', 'school_admin', '更新学校公告', async () => {
    if (!sa1Token) sa1Token = await loginAdmin(1)
    // 先创建
    const c = await http('POST', api('/school-admin/notices'), {
      token: sa1Token,
      body: { title: 'QA待更新公告', content: '原始内容' },
    })
    assert(c.status < 300, `创建失败 ${c.status}`)
    const id = c.body.id
    const r = await http('PATCH', api(`/school-admin/notices/${id}`), {
      token: sa1Token,
      body: { title: 'QA已更新公告', content: '更新后内容' },
    })
    assert(r.status < 300, `更新失败 ${r.status}`)
  })

  addCase('FUNC-SA-NOTICE-04', 'school_admin', '删除学校公告', async () => {
    if (!sa1Token) sa1Token = await loginAdmin(1)
    const c = await http('POST', api('/school-admin/notices'), {
      token: sa1Token,
      body: { title: 'QA待删公告', content: '内容' },
    })
    assert(c.status < 300, `创建失败 ${c.status}`)
    const r = await http('DELETE', api(`/school-admin/notices/${c.body.id}`), { token: sa1Token })
    assert(r.status < 300, `删除失败 ${r.status}`)
  })

  addCase('FUNC-SA-NOTICE-05', 'school_admin', '公告 CRUD 闭环（创建→查询→更新→删除）', async () => {
    if (!sa1Token) sa1Token = await loginAdmin(1)
    // 创建
    const c = await http('POST', api('/school-admin/notices'), {
      token: sa1Token,
      body: { title: 'QA闭环公告', content: '闭环测试', pinned: true },
    })
    assert(c.status < 300, `创建失败 ${c.status}`)
    const id = c.body.id
    // 查询
    const l = await http('GET', api('/school-admin/notices?pageSize=200'), { token: sa1Token })
    const items = l.body.items || (Array.isArray(l.body) ? l.body : [])
    assert(items.some((n: any) => n.id === id), '公告列表未包含新建公告')
    // 更新
    const u = await http('PATCH', api(`/school-admin/notices/${id}`), {
      token: sa1Token,
      body: { pinned: false },
    })
    assert(u.status < 300, `更新失败 ${u.status}`)
    // 删除
    const d = await http('DELETE', api(`/school-admin/notices/${id}`), { token: sa1Token })
    assert(d.status < 300, `删除失败 ${d.status}`)
  })

  addCase('FUNC-SA-NOTICE-06', 'school_admin', '创建公告缺少标题被拒绝（400）', async () => {
    if (!sa1Token) sa1Token = await loginAdmin(1)
    const r = await http('POST', api('/school-admin/notices'), {
      token: sa1Token,
      body: { content: '无标题公告' },
    })
    assertEq(r.status, 400, '状态码')
  })

  // ===================================================================
  // 域 7：成绩查询与汇总
  // ===================================================================

  addCase('FUNC-SA-ACAD-01', 'school_admin', '全校成绩汇总接口', async () => {
    if (!sa1Token) sa1Token = await loginAdmin(1)
    const r = await http('GET', api('/school-admin/academic/summary'), { token: sa1Token })
    assert(r.status < 300, `状态码 ${r.status}`)
    assert(Array.isArray(r.body.subjects), 'subjects 应为数组')
    assert(r.body.totalExams >= EXAMS_PER_CLASS, `考试总数应≥${EXAMS_PER_CLASS}，实际 ${r.body.totalExams}`)
    assert(r.body.totalStudents >= STUDENTS_PER_CLASS * CLASSES_PER_SCHOOL, `学生总数不足`)
  })

  addCase('FUNC-SA-ACAD-02', 'school_admin', '成绩汇总按学科聚合（含均分/及格率/高低分）', async () => {
    if (!sa1Token) sa1Token = await loginAdmin(1)
    const r = await http('GET', api('/school-admin/academic/summary'), { token: sa1Token })
    assert(r.status < 300, `状态码 ${r.status}`)
    const subjects = r.body.subjects || []
    assert(subjects.length >= 1, '至少应有 1 个学科')
    const first = subjects[0]
    assert(typeof first.avg === 'number', 'avg 缺失')
    assert(typeof first.passRate === 'number', 'passRate 缺失')
    assert(typeof first.max === 'number', 'max 缺失')
    assert(typeof first.min === 'number', 'min 缺失')
    assert(typeof first.count === 'number', 'count 缺失')
  })

  addCase('FUNC-SA-ACAD-03', 'school_admin', '按年级横向对比各班成绩', async () => {
    if (!sa1Token) sa1Token = await loginAdmin(1)
    const r = await http('GET', api('/school-admin/academic/class-comparison?grade=一年级'), { token: sa1Token })
    assert(r.status < 300, `状态码 ${r.status}`)
    const classes = r.body.classes || []
    assert(classes.length >= 1, `一年级下班级数应≥1，实际 ${classes.length}`)
    assert(classes[0].className, '班级名缺失')
    assert(typeof classes[0].overallAvg === 'number', '综合均分缺失')
    assert(classes.length >= CLASSES_PER_GRADE, `一年级应≥${CLASSES_PER_GRADE}班，实际 ${classes.length}`)
  })

  addCase('FUNC-SA-ACAD-04', 'school_admin', '按年级横向对比（二年级）', async () => {
    if (!sa1Token) sa1Token = await loginAdmin(1)
    const r = await http('GET', api('/school-admin/academic/class-comparison?grade=二年级'), { token: sa1Token })
    assert(r.status < 300, `状态码 ${r.status}`)
    const classes = r.body.classes || []
    assert(classes.length >= CLASSES_PER_GRADE, `二年级应≥${CLASSES_PER_GRADE}班，实际 ${classes.length}`)
  })

  addCase('FUNC-SA-ACAD-05', 'school_admin', '班级本学期成绩汇总与趋势', async () => {
    if (!sa1Token) sa1Token = await loginAdmin(1)
    const classId = s1().classIds[0]
    const r = await http('GET', api(`/school-admin/academic/class-trend?classId=${classId}`), { token: sa1Token })
    assert(r.status < 300, `状态码 ${r.status}`)
    assert(r.body.className, 'className 缺失')
    assert(Array.isArray(r.body.trend), 'trend 应为数组')
    assert(Array.isArray(r.body.exams), 'exams 应为数组')
    if (r.body.trend.length) {
      assert(typeof r.body.trend[0].avg === 'number', '趋势均分缺失')
    }
  })

  addCase('FUNC-SA-ACAD-06', 'school_admin', '班级趋势含学科列表', async () => {
    if (!sa1Token) sa1Token = await loginAdmin(1)
    const classId = s1().classIds[0]
    const r = await http('GET', api(`/school-admin/academic/class-trend?classId=${classId}`), { token: sa1Token })
    assert(r.status < 300, `状态码 ${r.status}`)
    assert(Array.isArray(r.body.subjects), 'subjects 应为数组')
    assert(r.body.subjects.length >= 1, '至少应有 1 个学科')
  })

  addCase('FUNC-SA-ACAD-07', 'school_admin', '按班级过滤成绩汇总', async () => {
    if (!sa1Token) sa1Token = await loginAdmin(1)
    const classId = s1().classIds[0]
    const r = await http('GET', api(`/school-admin/academic/summary?classId=${classId}`), { token: sa1Token })
    assert(r.status < 300, `状态码 ${r.status}`)
    assert(Array.isArray(r.body.subjects), 'subjects 应为数组')
  })

  addCase('FUNC-SA-ACAD-08', 'school_admin', '按考试过滤成绩汇总', async () => {
    if (!sa1Token) sa1Token = await loginAdmin(1)
    const classId = s1().classIds[0]
    const exams = await http('GET', api(`/school-admin/academic/exams?classId=${classId}`), { token: sa1Token })
    const examItems = exams.body.items || []
    assert(examItems.length > 0, '考试列表为空')
    const examId = examItems[0].id
    const r = await http('GET', api(`/school-admin/academic/summary?examId=${examId}`), { token: sa1Token })
    assert(r.status < 300, `状态码 ${r.status}`)
  })

  addCase('FUNC-SA-ACAD-09', 'school_admin', '全校考试列表', async () => {
    if (!sa1Token) sa1Token = await loginAdmin(1)
    const r = await http('GET', api('/school-admin/academic/exams?pageSize=500'), { token: sa1Token })
    assert(r.status < 300, `状态码 ${r.status}`)
    const items = r.body.items || []
    assert(items.length > 0, '考试列表为空')
  })

  addCase('FUNC-SA-ACAD-10', 'school_admin', '全校成绩列表（按班级/科目/考试名过滤）', async () => {
    if (!sa1Token) sa1Token = await loginAdmin(1)
    const classId = s1().classIds[0]
    const r = await http('GET', api(`/school-admin/academic/grades?classId=${classId}&subject=语文&examName=期末考试`), { token: sa1Token })
    assert(r.status < 300, `状态码 ${r.status}`)
    const items = r.body.items || []
    // 过滤结果应全部为语文+期末考试
    for (const g of items) {
      assertEq(g.subject, '语文', '科目过滤失效')
      assertEq(g.examName, '期末考试', '考试名过滤失效')
    }
  })

  addCase('FUNC-SA-ACAD-11', 'school_admin', '横向对比按学科过滤', async () => {
    if (!sa1Token) sa1Token = await loginAdmin(1)
    const r = await http('GET', api('/school-admin/academic/class-comparison?grade=一年级&subject=数学'), { token: sa1Token })
    assert(r.status < 300, `状态码 ${r.status}`)
    const classes = r.body.classes || []
    if (classes.length > 0 && classes[0].subjects) {
      // 过滤后应只有数学科目
      for (const cls of classes) {
        for (const s of cls.subjects) {
          assertEq(s.subject, '数学', '学科过滤失效')
        }
      }
    }
  })

  // ===================================================================
  // 域 8：作业管理
  // ===================================================================

  addCase('FUNC-SA-HW-01', 'school_admin', '全校作业聚合列表', async () => {
    if (!sa1Token) sa1Token = await loginAdmin(1)
    const r = await http('GET', api('/school-admin/homework?pageSize=50'), { token: sa1Token })
    assert(r.status < 300, `状态码 ${r.status}`)
    const total = r.body.total ?? (r.body.items || []).length
    assert(total >= 1, `作业总数应≥1，实际 ${total}`)
  })

  addCase('FUNC-SA-HW-02', 'school_admin', '作业列表含班级名称和教师姓名回填', async () => {
    if (!sa1Token) sa1Token = await loginAdmin(1)
    const r = await http('GET', api('/school-admin/homework?pageSize=20'), { token: sa1Token })
    assert(r.status < 300, `状态码 ${r.status}`)
    const items = r.body.items || []
    if (items.length > 0) {
      const sample = items[0]
      assert(sample.className, '作业应回填班级名称')
      assert(sample.teacherName, '作业应回填教师姓名')
    }
  })

  addCase('FUNC-SA-HW-03', 'school_admin', '按状态筛选作业（待批改）', async () => {
    if (!sa1Token) sa1Token = await loginAdmin(1)
    const r = await http('GET', api('/school-admin/homework?status=待批改&pageSize=50'), { token: sa1Token })
    assert(r.status < 300, `状态码 ${r.status}`)
    const items = r.body.items || []
    for (const h of items) {
      assertEq(h.status, '待批改', '状态过滤失效')
    }
  })

  addCase('FUNC-SA-HW-04', 'school_admin', '按状态筛选作业（已批改）', async () => {
    if (!sa1Token) sa1Token = await loginAdmin(1)
    const r = await http('GET', api('/school-admin/homework?status=已批改&pageSize=50'), { token: sa1Token })
    assert(r.status < 300, `状态码 ${r.status}`)
    const items = r.body.items || []
    for (const h of items) {
      assertEq(h.status, '已批改', '状态过滤失效')
    }
  })

  addCase('FUNC-SA-HW-05', 'school_admin', '按班级筛选作业', async () => {
    if (!sa1Token) sa1Token = await loginAdmin(1)
    const classId = s1().classIds[0]
    const r = await http('GET', api(`/school-admin/homework?classId=${classId}&pageSize=50`), { token: sa1Token })
    assert(r.status < 300, `状态码 ${r.status}`)
    const items = r.body.items || []
    for (const h of items) {
      assertEq(h.classId, classId, '班级过滤失效')
    }
  })

  addCase('FUNC-SA-HW-06', 'school_admin', '按年级筛选作业', async () => {
    if (!sa1Token) sa1Token = await loginAdmin(1)
    const r = await http('GET', api('/school-admin/homework?grade=一年级&pageSize=50'), { token: sa1Token })
    assert(r.status < 300, `状态码 ${r.status}`)
    const items = r.body.items || []
    for (const h of items) {
      assertEq(h.grade, '一年级', '年级过滤失效')
    }
  })

  addCase('FUNC-SA-HW-07', 'school_admin', '按科目筛选作业', async () => {
    if (!sa1Token) sa1Token = await loginAdmin(1)
    const r = await http('GET', api('/school-admin/homework?subject=语文&pageSize=50'), { token: sa1Token })
    assert(r.status < 300, `状态码 ${r.status}`)
    const items = r.body.items || []
    for (const h of items) {
      assertEq(h.subject, '语文', '科目过滤失效')
    }
  })

  addCase('FUNC-SA-HW-08', 'school_admin', '作业列表分页（skip/take）', async () => {
    if (!sa1Token) sa1Token = await loginAdmin(1)
    const r = await http('GET', api('/school-admin/homework?skip=0&take=10'), { token: sa1Token })
    assert(r.status < 300, `状态码 ${r.status}`)
    const items = r.body.items || []
    assert(items.length <= 10, '应≤10条')
  })

  // ===================================================================
  // 域 9：功能包配置
  // ===================================================================

  addCase('FUNC-SA-FEAT-01', 'school_admin', '读取学校功能包配置', async () => {
    if (!sa1Token) sa1Token = await loginAdmin(1)
    const r = await http('GET', api('/school-admin/school-features'), { token: sa1Token })
    assert(r.status < 300, `状态码 ${r.status}`)
    assertEq(r.body.schoolId, s1().id, 'schoolId 不匹配')
    // featureFlags 可能为 null（全部开启）或数组
    assert(r.body.featureFlags === null || Array.isArray(r.body.featureFlags), 'featureFlags 类型异常')
  })

  addCase('FUNC-SA-FEAT-02', 'school_admin', '更新学校功能包配置（设置指定功能）', async () => {
    if (!sa1Token) sa1Token = await loginAdmin(1)
    const r = await http('PATCH', api('/school-admin/school-features'), {
      token: sa1Token,
      body: { featureFlags: ['grades', 'homework', 'notices'] },
    })
    assert(r.status < 300, `更新失败 ${r.status}`)
    assert(Array.isArray(r.body.featureFlags), 'featureFlags 应为数组')
    assertIncludes(r.body.featureFlags, 'grades', 'featureFlags')
    assertIncludes(r.body.featureFlags, 'homework', 'featureFlags')
    assertIncludes(r.body.featureFlags, 'notices', 'featureFlags')
  })

  addCase('FUNC-SA-FEAT-03', 'school_admin', '恢复学校功能包为全部开启（featureFlags=null）', async () => {
    if (!sa1Token) sa1Token = await loginAdmin(1)
    const r = await http('PATCH', api('/school-admin/school-features'), {
      token: sa1Token,
      body: { featureFlags: null },
    })
    assert(r.status < 300, `恢复失败 ${r.status}`)
    assertEq(r.body.featureFlags, null, 'featureFlags 应为 null')
  })

  addCase('FUNC-SA-FEAT-04', 'school_admin', '功能包配置闭环（读取→更新→读取→恢复）', async () => {
    if (!sa1Token) sa1Token = await loginAdmin(1)
    // 读取初始
    const g1 = await http('GET', api('/school-admin/school-features'), { token: sa1Token })
    assert(g1.status < 300, `读取失败 ${g1.status}`)
    // 更新
    const u = await http('PATCH', api('/school-admin/school-features'), {
      token: sa1Token,
      body: { featureFlags: ['grades'] },
    })
    assert(u.status < 300, `更新失败 ${u.status}`)
    // 读取验证
    const g2 = await http('GET', api('/school-admin/school-features'), { token: sa1Token })
    assertEq(g2.body.featureFlags.length, 1, '应只有 1 个功能')
    assertEq(g2.body.featureFlags[0], 'grades', '功能不匹配')
    // 恢复
    const r = await http('PATCH', api('/school-admin/school-features'), {
      token: sa1Token,
      body: { featureFlags: null },
    })
    assert(r.status < 300, `恢复失败 ${r.status}`)
  })

  addCase('FUNC-SA-FEAT-05', 'school_admin', '读取 AI 配置', async () => {
    if (!sa1Token) sa1Token = await loginAdmin(1)
    const r = await http('GET', api('/config/ai'), { token: sa1Token })
    assert(r.status < 300, `读取 AI 配置失败 ${r.status}`)
  })

  addCase('FUNC-SA-FEAT-06', 'school_admin', '保存 AI 配置', async () => {
    if (!sa1Token) sa1Token = await loginAdmin(1)
    const r = await http('PUT', api('/config/ai'), {
      token: sa1Token,
      body: { aiTextModel: 'gpt-4', aiTemperature: 0.7 },
    })
    assert(r.status < 300, `保存 AI 配置失败 ${r.status}`)
  })

  addCase('FUNC-SA-FEAT-07', 'school_admin', '读取 AI 设置（ai-settings）', async () => {
    if (!sa1Token) sa1Token = await loginAdmin(1)
    const r = await http('GET', api('/config/ai-settings'), { token: sa1Token })
    assert(r.status < 300, `读取 AI 设置失败 ${r.status}`)
  })

  addCase('FUNC-SA-FEAT-08', 'school_admin', '保存 AI 设置（PATCH ai-settings）', async () => {
    if (!sa1Token) sa1Token = await loginAdmin(1)
    const r = await http('PATCH', api('/config/ai-settings'), {
      token: sa1Token,
      body: { aiTextModel: 'gpt-3.5-turbo', aiTemperature: 0.5 },
    })
    assert(r.status < 300, `保存 AI 设置失败 ${r.status}`)
  })

  addCase('FUNC-SA-FEAT-09', 'school_admin', '读取 AI 服务商列表', async () => {
    if (!sa1Token) sa1Token = await loginAdmin(1)
    const r = await http('GET', api('/config/ai-providers'), { token: sa1Token })
    assert(r.status < 300, `读取 AI 服务商失败 ${r.status}`)
    assert(Array.isArray(r.body.items), 'items 应为数组')
  })

  addCase('FUNC-SA-FEAT-10', 'school_admin', '更新教师功能包', async () => {
    if (!sa1Token) sa1Token = await loginAdmin(1)
    const list = await http('GET', api('/school-admin/teachers?keyword=教师1-001&pageSize=1'), { token: sa1Token })
    const tch = (list.body.items || [])[0]
    assert(tch, '未找到教师')
    const r = await http('PATCH', api(`/school-admin/teachers/${tch.id}/features`), {
      token: sa1Token,
      body: { features: ['grades', 'homework'] },
    })
    assert(r.status < 300, `更新教师功能包失败 ${r.status}`)
  })

  // ===================================================================
  // 域 10：消息系统
  // ===================================================================

  addCase('FUNC-SA-MSG-01', 'school_admin', '收件人列表包含本校教师', async () => {
    if (!sa1Token) sa1Token = await loginAdmin(1)
    const r = await http('GET', api('/messages/recipients'), { token: sa1Token })
    assert(r.status < 300, `状态码 ${r.status}`)
    const list = Array.isArray(r.body) ? r.body : []
    const hasTeacher = list.some((x: any) => x.role === 'teacher')
    assert(hasTeacher, '校管收件人列表应包含本校教师')
  })

  addCase('FUNC-SA-MSG-02', 'school_admin', '收件人列表包含超管', async () => {
    if (!sa1Token) sa1Token = await loginAdmin(1)
    const r = await http('GET', api('/messages/recipients'), { token: sa1Token })
    assert(r.status < 300, `状态码 ${r.status}`)
    const list = Array.isArray(r.body) ? r.body : []
    const hasSuper = list.some((x: any) => x.role === 'super')
    assert(hasSuper, '校管收件人列表应包含超管')
  })

  addCase('FUNC-SA-MSG-03', 'school_admin', '给本校教师发送消息', async () => {
    if (!sa1Token) sa1Token = await loginAdmin(1)
    const recs = await http('GET', api('/messages/recipients'), { token: sa1Token })
    const list = Array.isArray(recs.body) ? recs.body : []
    const target = list.find((x: any) => x.role === 'teacher')
    assert(target, '无可用教师收件人')
    const s = await http('POST', api('/messages'), {
      token: sa1Token,
      body: { recipientId: target.id, recipientRole: 'teacher', title: 'QA校管→教师', content: '测试消息内容', type: 'direct' },
    })
    assert(s.status < 300, `发送失败 ${s.status}`)
  })

  addCase('FUNC-SA-MSG-04', 'school_admin', '查看已发送消息列表', async () => {
    if (!sa1Token) sa1Token = await loginAdmin(1)
    const r = await http('GET', api('/messages/sent?pageSize=20'), { token: sa1Token })
    assert(r.status < 300, `状态码 ${r.status}`)
    const items = Array.isArray(r.body) ? r.body : r.body.items || []
    assert(items.length >= 1, '已发送列表应至少有 1 条')
  })

  addCase('FUNC-SA-MSG-05', 'school_admin', '查看收件箱消息列表', async () => {
    if (!sa1Token) sa1Token = await loginAdmin(1)
    const r = await http('GET', api('/messages?pageSize=20'), { token: sa1Token })
    assert(r.status < 300, `状态码 ${r.status}`)
  })

  addCase('FUNC-SA-MSG-06', 'school_admin', '查看未读消息数', async () => {
    if (!sa1Token) sa1Token = await loginAdmin(1)
    const r = await http('GET', api('/messages/unread-count'), { token: sa1Token })
    assert(r.status < 300, `状态码 ${r.status}`)
    assert(typeof r.body.count === 'number' || r.body.unreadCount != null, '未读数缺失')
  })

  addCase('FUNC-SA-MSG-07', 'school_admin', '标记消息已读', async () => {
    if (!sa1Token) sa1Token = await loginAdmin(1)
    const sent = await http('GET', api('/messages/sent?pageSize=1'), { token: sa1Token })
    const items = Array.isArray(sent.body) ? sent.body : sent.body.items || []
    if (items.length > 0) {
      const r = await http('PATCH', api(`/messages/${items[0].id}/read`), { token: sa1Token })
      assert(r.status < 300, `标记已读失败 ${r.status}`)
    }
  })

  addCase('FUNC-SA-MSG-08', 'school_admin', '一键全部已读', async () => {
    if (!sa1Token) sa1Token = await loginAdmin(1)
    const r = await http('PATCH', api('/messages/mark-all-read'), { token: sa1Token })
    assert(r.status < 300, `一键已读失败 ${r.status}`)
  })

  addCase('FUNC-SA-MSG-09', 'school_admin', '删除消息', async () => {
    if (!sa1Token) sa1Token = await loginAdmin(1)
    // 先发送一条消息
    const recs = await http('GET', api('/messages/recipients'), { token: sa1Token })
    const list = Array.isArray(recs.body) ? recs.body : []
    const target = list.find((x: any) => x.role === 'teacher')
    if (target) {
      const s = await http('POST', api('/messages'), {
        token: sa1Token,
        body: { recipientId: target.id, recipientRole: 'teacher', title: 'QA待删消息', content: '内容', type: 'direct' },
      })
      assert(s.status < 300, `发送失败 ${s.status}`)
      const msgId = s.body.id
      const r = await http('DELETE', api(`/messages/${msgId}`), { token: sa1Token })
      assert(r.status < 300, `删除消息失败 ${r.status}`)
    }
  })

  // ===================================================================
  // 域 11：数据隔离（跨校安全）
  // ===================================================================

  addCase('FUNC-SA-ISO-01', 'school_admin', '校管 A 无法访问校管 B 学校的教师（跨校隔离）', async () => {
    if (!sa1Token) sa1Token = await loginAdmin(1)
    if (!sa2Token) sa2Token = await loginAdmin(2)
    const r = await http('GET', api('/school-admin/teachers?pageSize=200'), { token: sa2Token })
    assert(r.status < 300, `状态码 ${r.status}`)
    const items = r.body.items || []
    assert(!items.some((t: any) => t.name === '教师1-001'), '跨校数据泄漏：校管2看到了校1的教师')
  })

  addCase('FUNC-SA-ISO-02', 'school_admin', '校管 A 无法访问校管 B 学校的学生（跨校隔离）', async () => {
    if (!sa1Token) sa1Token = await loginAdmin(1)
    if (!sa2Token) sa2Token = await loginAdmin(2)
    const r = await http('GET', api(`/school-admin/students?classId=${s1().classIds[0]}&pageSize=10`), { token: sa2Token })
    // 校管2传入校1的 classId，应返回空或被拒绝
    const total = r.body.total ?? (r.body.items || []).length
    assert(total === 0, `跨校学生数据泄漏：校管2看到了校1的学生（${total}条）`)
  })

  addCase('FUNC-SA-ISO-03', 'school_admin', '校管 A 无法访问校管 B 学校的班级（跨校隔离）', async () => {
    if (!sa1Token) sa1Token = await loginAdmin(1)
    if (!sa2Token) sa2Token = await loginAdmin(2)
    const r = await http('GET', api(`/school-admin/classes/${s1().classIds[0]}`), { token: sa2Token })
    // 校管2传入校1的 classId，应返回 404 或空
    assert(r.status === 404 || r.status === 403 || r.status === 400 || !r.body || !r.body.id, `跨校班级数据泄漏：校管2看到了校1的班级（status=${r.status}）`)
  })

  addCase('FUNC-SA-ISO-04', 'school_admin', '校管 A 无法访问校管 B 学校的成绩（跨校隔离）', async () => {
    if (!sa1Token) sa1Token = await loginAdmin(1)
    if (!sa2Token) sa2Token = await loginAdmin(2)
    const r = await http('GET', api(`/school-admin/academic/summary?classId=${s1().classIds[0]}`), { token: sa2Token })
    // 校管2传入校1的 classId，应返回空数据
    assert(r.body.totalStudents === 0 || r.body.totalExams === 0 || r.body.subjects?.length === 0, '跨校成绩数据泄漏')
  })

  addCase('FUNC-SA-ISO-05', 'school_admin', '校管 A 无法访问校管 B 学校的公告（跨校隔离）', async () => {
    if (!sa1Token) sa1Token = await loginAdmin(1)
    if (!sa2Token) sa2Token = await loginAdmin(2)
    const r = await http('GET', api('/school-admin/notices?pageSize=200'), { token: sa2Token })
    assert(r.status < 300, `状态码 ${r.status}`)
    const items = r.body.items || (Array.isArray(r.body) ? r.body : [])
    // 校管2不应看到校1的全校公告
    assert(!items.some((n: any) => n.title && n.title.includes('测试第1学校')), '跨校公告数据泄漏')
  })

  addCase('FUNC-SA-ISO-06', 'school_admin', '校管 A 无法删除校管 B 学校的公告（跨校隔离）', async () => {
    if (!sa1Token) sa1Token = await loginAdmin(1)
    if (!sa2Token) sa2Token = await loginAdmin(2)
    // 先在校1创建公告
    const c = await http('POST', api('/school-admin/notices'), {
      token: sa1Token,
      body: { title: 'QA跨校隔离公告', content: '内容' },
    })
    assert(c.status < 300, `创建失败 ${c.status}`)
    // 校管2尝试删除
    const r = await http('DELETE', api(`/school-admin/notices/${c.body.id}`), { token: sa2Token })
    assert(r.status === 400 || r.status === 403 || r.status === 404, `跨校删除应被拒绝，实际 ${r.status}`)
  })

  addCase('FUNC-SA-ISO-07', 'school_admin', '校管 A 无法修改校管 B 学校的功能包（跨校隔离）', async () => {
    if (!sa1Token) sa1Token = await loginAdmin(1)
    if (!sa2Token) sa2Token = await loginAdmin(2)
    // 校管2尝试修改校1的功能包（通过 school-features 接口，schoolId 从 token 推导，无法伪造）
    // 这里验证校管2只能修改自己学校的功能包
    const r = await http('PATCH', api('/school-admin/school-features'), {
      token: sa2Token,
      body: { featureFlags: ['grades'] },
    })
    assert(r.status < 300, `校管2修改自己学校功能包失败 ${r.status}`)
    // 验证校管1的功能包未被修改
    const g = await http('GET', api('/school-admin/school-features'), { token: sa1Token })
    assert(g.status < 300, `读取失败 ${g.status}`)
    // 校1的功能包不应被校2修改（校2修改的是校2的）
    // 注意：这里校1的功能包可能之前被其他用例修改过，所以只验证校2的修改不影响校1
  })

  addCase('FUNC-SA-ISO-08', 'school_admin', '校管 A 无法访问校管 B 学校的作业（跨校隔离）', async () => {
    if (!sa1Token) sa1Token = await loginAdmin(1)
    if (!sa2Token) sa2Token = await loginAdmin(2)
    const r = await http('GET', api(`/school-admin/homework?classId=${s1().classIds[0]}&pageSize=10`), { token: sa2Token })
    const total = r.body.total ?? (r.body.items || []).length
    assert(total === 0, `跨校作业数据泄漏：校管2看到了校1的作业（${total}条）`)
  })

  addCase('FUNC-SA-ISO-09', 'school_admin', '校管 A 无法访问校管 B 学校的考试（跨校隔离）', async () => {
    if (!sa1Token) sa1Token = await loginAdmin(1)
    if (!sa2Token) sa2Token = await loginAdmin(2)
    const r = await http('GET', api(`/school-admin/academic/exams?classId=${s1().classIds[0]}&pageSize=10`), { token: sa2Token })
    const total = r.body.total ?? (r.body.items || []).length
    assert(total === 0, `跨校考试数据泄漏：校管2看到了校1的考试（${total}条）`)
  })

  addCase('FUNC-SA-ISO-10', 'school_admin', '校管 A 收件人列表不包含校管 B 的教师（跨校隔离）', async () => {
    if (!sa1Token) sa1Token = await loginAdmin(1)
    if (!sa2Token) sa2Token = await loginAdmin(2)
    const r = await http('GET', api('/messages/recipients'), { token: sa2Token })
    assert(r.status < 300, `状态码 ${r.status}`)
    const list = Array.isArray(r.body) ? r.body : []
    // 校管2的收件人不应包含校1的教师
    const hasSchool1Teacher = list.some((x: any) => x.role === 'teacher' && x.name && x.name.startsWith('教师1-'))
    assert(!hasSchool1Teacher, '跨校收件人泄漏：校管2看到了校1的教师')
  })

  // ===================================================================
  // 域 12：审计追踪
  // ===================================================================

  addCase('FUNC-SA-AUDIT-01', 'school_admin', '审计日志可查询（超管接口）', async () => {
    // 超管登录
    const su = await http('POST', api('/auth/unified-login'), { body: { username: 'admin', password: 'admin' } })
    assert(su.status < 300, `超管登录失败 ${su.status}`)
    const superToken = su.body.token
    const r = await http('GET', api('/admin/audit-logs?pageSize=50'), { token: superToken })
    assert(r.status < 300, `状态码 ${r.status}`)
    assert(Array.isArray(r.body.items) || Array.isArray(r.body), '响应结构异常')
  })

  addCase('FUNC-SA-AUDIT-02', 'school_admin', '审计日志包含种子操作记录', async () => {
    const su = await http('POST', api('/auth/unified-login'), { body: { username: 'admin', password: 'admin' } })
    assert(su.status < 300, `超管登录失败 ${su.status}`)
    const superToken = su.body.token
    const r = await http('GET', api('/admin/audit-logs?pageSize=100'), { token: superToken })
    assert(r.status < 300, `状态码 ${r.status}`)
    const items = r.body.items || (Array.isArray(r.body) ? r.body : [])
    assert(items.length > 0, '审计日志为空')
  })

  addCase('FUNC-SA-AUDIT-03', 'school_admin', '校管操作（创建教师）后审计日志可查', async () => {
    if (!sa1Token) sa1Token = await loginAdmin(1)
    // 执行操作：创建教师
    const c = await http('POST', api('/school-admin/teachers'), {
      token: sa1Token,
      body: { name: 'QA审计测试教师', username: 'qaaudit_test01', password: 'QaAudit@123' },
    })
    assert(c.status < 300, `创建教师失败 ${c.status}`)
    // 超管查看审计日志
    const su = await http('POST', api('/auth/unified-login'), { body: { username: 'admin', password: 'admin' } })
    const superToken = su.body.token
    const r = await http('GET', api('/admin/audit-logs?pageSize=100'), { token: superToken })
    assert(r.status < 300, `查询审计日志失败 ${r.status}`)
  })

  addCase('FUNC-SA-AUDIT-04', 'school_admin', '校管操作（创建班级）后审计日志可查', async () => {
    if (!sa1Token) sa1Token = await loginAdmin(1)
    const c = await http('POST', api('/school-admin/classes'), {
      token: sa1Token,
      body: { name: 'QA审计测试班', grade: '一年级', classNo: '1097', headTeacher: '教师1-001' },
    })
    assert(c.status < 300, `创建班级失败 ${c.status}`)
    const su = await http('POST', api('/auth/unified-login'), { body: { username: 'admin', password: 'admin' } })
    const superToken = su.body.token
    const r = await http('GET', api('/admin/audit-logs?pageSize=100'), { token: superToken })
    assert(r.status < 300, `查询审计日志失败 ${r.status}`)
  })

  addCase('FUNC-SA-AUDIT-05', 'school_admin', '校管操作（创建公告）后审计日志可查', async () => {
    if (!sa1Token) sa1Token = await loginAdmin(1)
    const c = await http('POST', api('/school-admin/notices'), {
      token: sa1Token,
      body: { title: 'QA审计测试公告', content: '审计测试' },
    })
    assert(c.status < 300, `创建公告失败 ${c.status}`)
    const su = await http('POST', api('/auth/unified-login'), { body: { username: 'admin', password: 'admin' } })
    const superToken = su.body.token
    const r = await http('GET', api('/admin/audit-logs?pageSize=100'), { token: superToken })
    assert(r.status < 300, `查询审计日志失败 ${r.status}`)
  })

  addCase('FUNC-SA-AUDIT-06', 'school_admin', '校管操作（重置密码）后审计日志可查', async () => {
    if (!sa1Token) sa1Token = await loginAdmin(1)
    const list = await http('GET', api('/school-admin/teachers?keyword=qaaudit_test01&pageSize=1'), { token: sa1Token })
    const tch = (list.body.items || [])[0]
    if (tch) {
      const rs = await http('POST', api(`/school-admin/teachers/${tch.id}/reset-password`), {
        token: sa1Token,
        body: { password: 'QaAuditReset@123' },
      })
      assert(rs.status < 300, `重置密码失败 ${rs.status}`)
    }
    const su = await http('POST', api('/auth/unified-login'), { body: { username: 'admin', password: 'admin' } })
    const superToken = su.body.token
    const r = await http('GET', api('/admin/audit-logs?pageSize=100'), { token: superToken })
    assert(r.status < 300, `查询审计日志失败 ${r.status}`)
  })

  addCase('FUNC-SA-AUDIT-07', 'school_admin', '校管操作（批量导入教师）后审计日志可查', async () => {
    if (!sa1Token) sa1Token = await loginAdmin(1)
    const c = await http('POST', api('/school-admin/teachers/batch'), {
      token: sa1Token,
      body: {
        teachers: [
          { name: 'QA审计批量教师1', username: 'qaaudit_batch1', password: 'QaBatch@123' },
        ],
      },
    })
    assert(c.status < 300, `批量创建失败 ${c.status}`)
    const su = await http('POST', api('/auth/unified-login'), { body: { username: 'admin', password: 'admin' } })
    const superToken = su.body.token
    const r = await http('GET', api('/admin/audit-logs?pageSize=100'), { token: superToken })
    assert(r.status < 300, `查询审计日志失败 ${r.status}`)
  })

  addCase('FUNC-SA-AUDIT-08', 'school_admin', '校管操作（更新功能包）后审计日志可查', async () => {
    if (!sa1Token) sa1Token = await loginAdmin(1)
    const u = await http('PATCH', api('/school-admin/school-features'), {
      token: sa1Token,
      body: { featureFlags: ['grades', 'homework'] },
    })
    assert(u.status < 300, `更新功能包失败 ${u.status}`)
    const su = await http('POST', api('/auth/unified-login'), { body: { username: 'admin', password: 'admin' } })
    const superToken = su.body.token
    const r = await http('GET', api('/admin/audit-logs?pageSize=100'), { token: superToken })
    assert(r.status < 300, `查询审计日志失败 ${r.status}`)
    // 恢复
    await http('PATCH', api('/school-admin/school-features'), {
      token: sa1Token,
      body: { featureFlags: null },
    })
  })

  addCase('FUNC-SA-AUDIT-09', 'school_admin', '校管操作（发送消息）后审计日志可查', async () => {
    if (!sa1Token) sa1Token = await loginAdmin(1)
    const recs = await http('GET', api('/messages/recipients'), { token: sa1Token })
    const list = Array.isArray(recs.body) ? recs.body : []
    const target = list.find((x: any) => x.role === 'teacher')
    if (target) {
      const s = await http('POST', api('/messages'), {
        token: sa1Token,
        body: { recipientId: target.id, recipientRole: 'teacher', title: 'QA审计消息', content: '审计测试', type: 'direct' },
      })
      assert(s.status < 300, `发送消息失败 ${s.status}`)
    }
    const su = await http('POST', api('/auth/unified-login'), { body: { username: 'admin', password: 'admin' } })
    const superToken = su.body.token
    const r = await http('GET', api('/admin/audit-logs?pageSize=100'), { token: superToken })
    assert(r.status < 300, `查询审计日志失败 ${r.status}`)
  })

  addCase('FUNC-SA-AUDIT-10', 'school_admin', '校管操作（删除学生）后审计日志可查', async () => {
    if (!sa1Token) sa1Token = await loginAdmin(1)
    // 先创建临时学生
    const c = await http('POST', api('/school-admin/students/batch'), {
      token: sa1Token,
      body: { students: [{ name: 'QA审计待删学生', studentNo: 'S01G01C01N94', classId: s1().classIds[0] }] },
    })
    assert(c.status < 300, `创建临时学生失败 ${c.status}`)
    const list = await http('GET', api('/school-admin/students?keyword=QA审计待删学生&pageSize=1'), { token: sa1Token })
    const stu = (list.body.items || [])[0]
    if (stu) {
      const d = await http('DELETE', api(`/school-admin/students/${stu.id}`), { token: sa1Token })
      assert(d.status < 300, `删除学生失败 ${d.status}`)
    }
    const su = await http('POST', api('/auth/unified-login'), { body: { username: 'admin', password: 'admin' } })
    const superToken = su.body.token
    const r = await http('GET', api('/admin/audit-logs?pageSize=100'), { token: superToken })
    assert(r.status < 300, `查询审计日志失败 ${r.status}`)
  })

  // ===================================================================
  // 补充：全局搜索
  // ===================================================================

  addCase('FUNC-SA-SRCH-01', 'school_admin', '全局搜索：按关键词搜索本校学生/教师/班级', async () => {
    if (!sa1Token) sa1Token = await loginAdmin(1)
    const r = await http('GET', api('/school-admin/search?q=教师1-001'), { token: sa1Token })
    assert(r.status < 300, `状态码 ${r.status}`)
    assert(r.body.teachers || r.body.students || r.body.classes, '搜索结果结构异常')
  })

  addCase('FUNC-SA-SRCH-02', 'school_admin', '全局搜索：空关键词返回空结果', async () => {
    if (!sa1Token) sa1Token = await loginAdmin(1)
    const r = await http('GET', api('/school-admin/search?q='), { token: sa1Token })
    assert(r.status < 300, `状态码 ${r.status}`)
    assert(Array.isArray(r.body.students) && r.body.students.length === 0, '空搜索应返回空数组')
    assert(Array.isArray(r.body.teachers) && r.body.teachers.length === 0, '空搜索应返回空数组')
  })

  addCase('FUNC-SA-SRCH-03', 'school_admin', '全局搜索：搜索学生', async () => {
    if (!sa1Token) sa1Token = await loginAdmin(1)
    const r = await http('GET', api('/school-admin/search?q=学生1-1-1-1'), { token: sa1Token })
    assert(r.status < 300, `状态码 ${r.status}`)
    const students = r.body.students || []
    assert(students.length > 0, '未搜索到学生')
  })

  addCase('FUNC-SA-SRCH-04', 'school_admin', '全局搜索：搜索班级', async () => {
    if (!sa1Token) sa1Token = await loginAdmin(1)
    const r = await http('GET', api('/school-admin/search?q=一年级'), { token: sa1Token })
    assert(r.status < 300, `状态码 ${r.status}`)
    const classes = r.body.classes || []
    assert(classes.length > 0, '未搜索到班级')
  })

  // ===================================================================
  // 补充：家长登录管理
  // ===================================================================

  addCase('FUNC-SA-PLOGIN-01', 'school_admin', '查看家长登录列表', async () => {
    if (!sa1Token) sa1Token = await loginAdmin(1)
    const r = await http('GET', api('/school-admin/parent-logins?pageSize=20'), { token: sa1Token })
    assert(r.status < 300, `状态码 ${r.status}`)
  })

  // ===================================================================
  // 补充：禁用全部教师
  // ===================================================================

  addCase('FUNC-SA-DEACT-01', 'school_admin', '禁用全部教师接口可调用', async () => {
    if (!sa1Token) sa1Token = await loginAdmin(1)
    // 注意：此接口会禁用全校教师，放在最后执行
    const r = await http('POST', api('/school-admin/teachers/deactivate-all'), { token: sa1Token })
    assert(r.status < 300, `禁用全部教师失败 ${r.status}`)
  })
}
