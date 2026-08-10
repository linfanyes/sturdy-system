/**
 * 直连云托管生产后端 · 自播种集成测试
 *
 * 覆盖范围：健康 / 认证 / 超管 / 校管 / 教师 / 家长 全角色 + 全部 API 模块。
 * 策略：beforeAll 自播种（唯一后缀，避免与云上真实/遗留数据冲突），逐个端点断言
 *       200 + 响应结构 / 数据完整性；afterAll 逆序清理（教师用校管 token）。
 *
 * 约定（来自实时侦察）：该后端对 GET 返回 200、对 POST/登录返回 201、PATCH/DELETE 返回 200。
 * 若断言期望正确契约（200 + 结构）却得到错误响应，即为「源码缺陷」，不会被弱化以掩盖问题。
 *
 * 运行门控：生产后端禁止默认弱口令 admin/admin（启动即拒绝），需通过环境变量提供
 * 超管凭据才会真正执行：
 *   CLOUD_SUPER_USER / CLOUD_SUPER_PASSWORD
 * 未提供时整个套件跳过（skip），避免在本地/CI 无凭据环境下产生大面积假失败。
 *
 * 云基址： https://tec-work-283329-8-1440166408.sh.run.tcloudbase.com/api
 */
import {
  apiRequest,
  uniqueSuffix,
  schoolPrefix,
  extractId,
  expectOk,
  expectCreated,
  expectFields,
  expectListShape,
  sleep,
} from '../data/cloud-helpers'

jest.setTimeout(120000)

// ---------- 运行门控：需通过环境变量提供超管凭据 ----------
const CLOUD_SUPER_USER = process.env.CLOUD_SUPER_USER || ''
const CLOUD_SUPER_PASSWORD = process.env.CLOUD_SUPER_PASSWORD || ''
const HAS_CLOUD_CREDS = !!(CLOUD_SUPER_USER && CLOUD_SUPER_PASSWORD)
// 未提供凭据时整套件跳过，避免本地/CI 无凭据环境产生大面积假失败
const describeCloud = HAS_CLOUD_CREDS ? describe : describe.skip
if (!HAS_CLOUD_CREDS) {
  // eslint-disable-next-line no-console
  console.log('[cloud-backend] 未设置 CLOUD_SUPER_USER / CLOUD_SUPER_PASSWORD，跳过云后端集成测试')
}

// ---------- 种子状态 ----------
interface SeedState {
  ST: string // 超管 token
  AT: string // 校管 token
  TT: string // 教师 token
  PT: string // 家长 token
  schoolId: string
  schoolCode: string
  schoolName: string
  adminId: string
  teacherId: string
  teacherNo: string
  classId: string
  studentId: string
  studentNo: string
  noticeId: string
  cleanupErrors: string[]
}

const S: SeedState = {
  ST: '',
  AT: '',
  TT: '',
  PT: '',
  schoolId: '',
  schoolCode: '',
  schoolName: '',
  adminId: '',
  teacherId: '',
  teacherNo: '',
  classId: '',
  studentId: '',
  studentNo: '',
  noticeId: '',
  cleanupErrors: [],
}

const SUF = uniqueSuffix()
const PREFIX = schoolPrefix()

// 带限流保护的登录封装（登录限流 10 次/分钟/IP+用户名）
async function loginUnified(username: string, password: string) {
  await sleep(1200)
  return apiRequest('/auth/unified-login', 'POST', { username, password })
}
async function loginSchoolAdmin(username: string, password: string) {
  await sleep(1200)
  return apiRequest('/school-admin/login', 'POST', { username, password })
}
async function loginTeacher(username: string, password: string) {
  await sleep(1200)
  return apiRequest('/auth/password-login', 'POST', { username, password })
}

describeCloud('直连云托管后端 · 全角色自播种集成测试', () => {
  // ====================== 自播种 ======================
  beforeAll(async () => {
    // 1) 超管登录
    const adminLogin = await loginUnified(CLOUD_SUPER_USER, CLOUD_SUPER_PASSWORD)
    expectCreated(adminLogin, 'unified-login(admin)')
    expect(adminLogin.body.role).toBe('super')
    S.ST = adminLogin.body.token
    expect(typeof S.ST).toBe('string')

    // 2) 创建学校
    const schoolRes = await apiRequest(
      '/admin/schools',
      'POST',
      { name: `QA校${SUF}`, prefix: PREFIX },
      S.ST,
    )
    expectCreated(schoolRes, 'POST /admin/schools')
    S.schoolId = extractId(schoolRes.body)!
    S.schoolCode = schoolRes.body.code
    S.schoolName = schoolRes.body.name
    expectFields(schoolRes.body, ['id', 'code', 'name'], 'POST /admin/schools')
    expect(typeof S.schoolId).toBe('string')

    // 3) 创建校管
    const adminRes = await apiRequest(
      '/admin/school-admins',
      'POST',
      { username: `qaadmin${SUF}`, password: 'qaadmin123', name: `QA校管${SUF}`, schoolId: S.schoolId },
      S.ST,
    )
    expectCreated(adminRes, 'POST /admin/school-admins')
    S.adminId = extractId(adminRes.body)!
    expect(typeof S.adminId).toBe('string')

    // 4) 校管登录
    const saLogin = await loginSchoolAdmin(`qaadmin${SUF}`, 'qaadmin123')
    expectCreated(saLogin, 'school-admin/login')
    S.AT = saLogin.body.token
    expect(typeof S.AT).toBe('string')

    // 5) 创建教师
    const teacherRes = await apiRequest(
      '/school-admin/teachers',
      'POST',
      { username: `qateach${SUF}`, password: 'qateach123', name: `QA老师${SUF}`, subject: '语文' },
      S.AT,
    )
    expectCreated(teacherRes, 'POST /school-admin/teachers')
    S.teacherId = extractId(teacherRes.body)!
    S.teacherNo = teacherRes.body.teacherNo
    expectFields(teacherRes.body, ['id', 'teacherNo'], 'POST /school-admin/teachers')
    expect(typeof S.teacherId).toBe('string')

    // 6) 教师登录
    const tLogin = await loginTeacher(`qateach${SUF}`, 'qateach123')
    expectCreated(tLogin, 'auth/password-login')
    S.TT = tLogin.body.token
    expect(typeof S.TT).toBe('string')

    // 7) 创建班级（headTeacherId = 教师 id）
    const classRes = await apiRequest(
      '/school-admin/classes',
      'POST',
      { name: '一班', grade: '一年级', classNo: '1', headTeacher: `QA老师${SUF}`, headTeacherId: S.teacherId },
      S.AT,
    )
    expectCreated(classRes, 'POST /school-admin/classes')
    S.classId = extractId(classRes.body)!
    expect(typeof S.classId).toBe('string')

    // 8) 创建学生（教师 token，gender 必填）
    // 学号使用纯数字唯一值；并采用后端返回的规范学号用于家长登录
    S.studentNo = '9' + Date.now().toString().slice(-8) + Math.floor(Math.random() * 9000 + 1000)
    const stuRes = await apiRequest(
      '/students',
      'POST',
      { name: `QA学生${SUF}`, studentNo: S.studentNo, classId: S.classId, gender: '男' },
      S.TT,
    )
    expectCreated(stuRes, 'POST /students')
    S.studentId = extractId(stuRes.body)!
    expect(typeof S.studentId).toBe('string')
    if (stuRes.body && typeof stuRes.body.studentNo === 'string') {
      S.studentNo = stuRes.body.studentNo
    }

    // 9) 启用家长登录
    const toggle = await apiRequest(`/students/${S.studentId}/toggle-parent-login`, 'POST', undefined, S.TT)
    expectOk(toggle, 'toggle-parent-login')
    const pLogin = await apiRequest('/parent-auth/login', 'POST', {
      studentNo: S.studentNo,
      password: '123456',
    })
    expectCreated(pLogin, 'parent-auth/login')
    S.PT = pLogin.body.token
    expect(typeof S.PT).toBe('string')
  }, 120000)

  // ====================== 逆序清理 ======================
  afterAll(async () => {
    const safeDel = async (label: string, fn: () => Promise<any>) => {
      try {
        const r = await fn()
        if (r.status < 200 || r.status >= 300) {
          S.cleanupErrors.push(`${label} -> HTTP ${r.status}: ${JSON.stringify(r.body).slice(0, 160)}`)
        }
      } catch (e: any) {
        S.cleanupErrors.push(`${label} -> EXCEPTION: ${e.message}`)
      }
    }
    // 学生（教师 token）
    if (S.studentId) await safeDel('DELETE student', () => apiRequest(`/students/${S.studentId}`, 'DELETE', undefined, S.TT))
    // 通知（校管 token）
    if (S.noticeId) await safeDel('DELETE notice', () => apiRequest(`/school-admin/notices/${S.noticeId}`, 'DELETE', undefined, S.AT))
    // 班级（校管 token）
    if (S.classId) await safeDel('DELETE class', () => apiRequest(`/school-admin/classes/${S.classId}`, 'DELETE', undefined, S.AT))
    // 教师（校管 token）—— 云后端当前会因 DB_ERROR 失败，记录为源码缺陷，不阻塞
    if (S.teacherId) await safeDel('DELETE teacher', () => apiRequest(`/school-admin/teachers/${S.teacherId}`, 'DELETE', undefined, S.AT))
    // 校管（超管 token）
    if (S.adminId) await safeDel('DELETE school-admin', () => apiRequest(`/admin/school-admins/${S.adminId}`, 'DELETE', undefined, S.ST))
    // 学校（超管 token）
    if (S.schoolId) await safeDel('DELETE school', () => apiRequest(`/admin/schools/${S.schoolId}`, 'DELETE', undefined, S.ST))

    if (S.cleanupErrors.length) {
      console.log('\n[CLEANUP ISSUES]\n' + S.cleanupErrors.map((e) => '  - ' + e).join('\n'))
    } else {
      console.log('\n[CLEANUP] 全部资源已清理')
    }
  }, 120000)

  // ====================== 健康检查 ======================
  describe('健康检查', () => {
    it('GET /health → 200 + {status:"ok"}', async () => {
      const res = await apiRequest('/health')
      expectOk(res, 'health')
      expect(res.body).toHaveProperty('status', 'ok')
    })
  })

  // ====================== 认证模块 ======================
  describe('认证模块: 统一登录', () => {
    it('POST /auth/unified-login (admin) → 200/201 + role=super', async () => {
      const res = await loginUnified(CLOUD_SUPER_USER, CLOUD_SUPER_PASSWORD)
      expectCreated(res, 'unified-login')
      expect(res.body.role).toBe('super')
      expect(typeof res.body.token).toBe('string')
    })

    it('错误密码 → 401', async () => {
      const res = await apiRequest('/auth/unified-login', 'POST', { username: CLOUD_SUPER_USER, password: 'wrong-password' })
      expect(res.status).toBe(401)
    })

    it('不存在账号 → 401', async () => {
      const res = await apiRequest('/auth/unified-login', 'POST', {
        username: `ghost${SUF}`,
        password: 'whatever',
      })
      expect(res.status).toBe(401)
    })

    it('SQL 注入参数 → 4xx', async () => {
      const res = await apiRequest('/auth/unified-login', 'POST', {
        username: "admin' OR '1'='1",
        password: "x' OR 1=1--",
      })
      expect(res.status).toBeGreaterThanOrEqual(400)
      expect(res.status).toBeLessThan(500)
    })

    it('无 token 访问受保护路由 → 401', async () => {
      const res = await apiRequest('/admin/schools', 'GET')
      expect(res.status).toBe(401)
    })
  })

  // ====================== 超管模块 ======================
  describe('超管模块', () => {
    it('GET /admin/schools → 200 + {items:[], total:N}', async () => {
      const res = await apiRequest('/admin/schools?skip=0&take=50', 'GET', undefined, S.ST)
      expectListShape(res, 'GET /admin/schools')
    })

    it('POST /admin/schools → 200/201 + {id, code, name}（seeding 已创建，此处校验产物）', async () => {
      // 创建动作在 beforeAll 完成；这里校验其返回结构（避免额外孤儿学校）
      expect(typeof S.schoolId).toBe('string')
      expect(typeof S.schoolCode).toBe('string')
      expect(typeof S.schoolName).toBe('string')
    })

    it('PATCH /admin/schools/:id → 200 + 详情字段齐全', async () => {
      const res = await apiRequest(
        `/admin/schools/${S.schoolId}`,
        'PATCH',
        { name: `QA校改${SUF}` },
        S.ST,
      )
      expectOk(res, 'PATCH /admin/schools/:id')
      expectFields(res.body, ['id', 'code', 'name', 'status', 'createdAt'], 'school detail')
    })

    // [SOURCE DEFECT] 云端路由未注册，返回 404
    it('GET /admin/schools/:id → 200 + 详情', async () => {
      const res = await apiRequest(`/admin/schools/${S.schoolId}`, 'GET', undefined, S.ST)
      expectOk(res, 'GET /admin/schools/:id')
      expectFields(res.body, ['id', 'code', 'name', 'status', 'createdAt'], 'school detail')
    })

    it('GET /admin/school-admins → 200 + {items:[], total:N}', async () => {
      const res = await apiRequest('/admin/school-admins?skip=0&take=50', 'GET', undefined, S.ST)
      expectListShape(res, 'GET /admin/school-admins')
    })

    it('POST /admin/school-admins → 200/201 + {id}（seeding 已创建，此处校验产物）', async () => {
      expect(typeof S.adminId).toBe('string')
    })

    it('PATCH /admin/school-admins/:id → 200', async () => {
      const res = await apiRequest(
        `/admin/school-admins/${S.adminId}`,
        'PATCH',
        { name: `QA校管改${SUF}` },
        S.ST,
      )
      expectOk(res, 'PATCH /admin/school-admins/:id')
    })

    it('DELETE /admin/school-admins/:id → 200（临时校管，创建即删）', async () => {
      const tmp = await apiRequest(
        '/admin/school-admins',
        'POST',
        { username: `qadel${SUF}`, password: 'qadel123', name: `QA删除校管${SUF}`, schoolId: S.schoolId },
        S.ST,
      )
      expectCreated(tmp, 'POST temp school-admin')
      const del = await apiRequest(`/admin/school-admins/${extractId(tmp.body)}`, 'DELETE', undefined, S.ST)
      expectOk(del, 'DELETE /admin/school-admins/:id')
    })

    it('DELETE /admin/schools/:id → 200（临时学校，创建即删）', async () => {
      const tmp = await apiRequest(
        '/admin/schools',
        'POST',
        { name: `QA临时校${SUF}`, prefix: schoolPrefix() },
        S.ST,
      )
      expectCreated(tmp, 'POST temp school')
      const del = await apiRequest(`/admin/schools/${extractId(tmp.body)}`, 'DELETE', undefined, S.ST)
      expectOk(del, 'DELETE /admin/schools/:id')
    })

    it('GET /admin/audit-logs?skip&take → 200 + 对象响应', async () => {
      const res = await apiRequest('/admin/audit-logs?skip=0&take=20', 'GET', undefined, S.ST)
      expectOk(res, 'GET /admin/audit-logs')
      expect(typeof res.body === 'object' && res.body !== null).toBe(true)
    })
  })

  // ====================== 校管模块 ======================
  describe('校管模块', () => {
    it('GET /school-admin/dashboard → 200 + 字段齐全, 播种后 totals≥1', async () => {
      const res = await apiRequest('/school-admin/dashboard', 'GET', undefined, S.AT)
      expectOk(res, 'dashboard')
      for (const f of ['totalTeachers', 'totalClasses', 'totalStudents', 'attendanceRate']) {
        expect(res.body).toHaveProperty(f)
      }
      expect(res.body.totalTeachers).toBeGreaterThanOrEqual(1)
      expect(res.body.totalClasses).toBeGreaterThanOrEqual(1)
      expect(res.body.totalStudents).toBeGreaterThanOrEqual(1)
    })

    it('GET /school-admin/teachers → 200 + 列表含已建教师', async () => {
      const res = await apiRequest('/school-admin/teachers?skip=0&take=50', 'GET', undefined, S.AT)
      expectListShape(res, 'GET /school-admin/teachers')
      const found = (res.body.items as any[]).some((t) => t.id === S.teacherId)
      expect(found).toBe(true)
    })

    it('POST /school-admin/teachers → 200/201 + {id, teacherNo}（seeding 已创建）', async () => {
      expect(typeof S.teacherId).toBe('string')
      expect(typeof S.teacherNo).toBe('string')
    })

    it('PATCH /school-admin/teachers/:id → 200', async () => {
      const res = await apiRequest(
        `/school-admin/teachers/${S.teacherId}`,
        'PATCH',
        { name: `QA老师改${SUF}` },
        S.AT,
      )
      expectOk(res, 'PATCH /school-admin/teachers/:id')
      // 后端返回 {ok:true}，不回传完整对象
      expect(typeof res.body === 'object' && res.body !== null).toBe(true)
    })

    it('POST /school-admin/teachers/:id/reset-password → 200/201', async () => {
      const res = await apiRequest(
        `/school-admin/teachers/${S.teacherId}/reset-password`,
        'POST',
        { password: 'qateach123' },
        S.AT,
      )
      expectCreated(res, 'reset-password')
      expectFields(res.body, ['id'], 'reset-password')
    })

    it('GET /school-admin/classes → 200 + 列表含已建班级', async () => {
      const res = await apiRequest('/school-admin/classes?skip=0&take=50', 'GET', undefined, S.AT)
      expectListShape(res, 'GET /school-admin/classes')
      const found = (res.body.items as any[]).some((c) => c.id === S.classId)
      expect(found).toBe(true)
    })

    it('POST /school-admin/classes → 200/201 + {id}（seeding 已创建）', async () => {
      expect(typeof S.classId).toBe('string')
    })

    it('PATCH /school-admin/classes/:id → 200', async () => {
      const res = await apiRequest(
        `/school-admin/classes/${S.classId}`,
        'PATCH',
        { name: '二班' },
        S.AT,
      )
      expectOk(res, 'PATCH /school-admin/classes/:id')
      expectFields(res.body, ['id'], 'PATCH class')
    })

    it('POST /school-admin/notices → 200/201 + {id}', async () => {
      const res = await apiRequest(
        '/school-admin/notices',
        'POST',
        { title: `QA通知${SUF}`, content: '内容', classIds: [S.classId] },
        S.AT,
      )
      expectCreated(res, 'POST /school-admin/notices')
      S.noticeId = extractId(res.body)!
      expect(typeof S.noticeId).toBe('string')
    })

    it('GET /school-admin/notices → 200 + {items:[], total:N}', async () => {
      const res = await apiRequest('/school-admin/notices?skip=0&take=50', 'GET', undefined, S.AT)
      expectListShape(res, 'GET /school-admin/notices')
    })

    it('GET /school-admin/students → 200 + 列表含已建学生', async () => {
      const res = await apiRequest('/school-admin/students?skip=0&take=50', 'GET', undefined, S.AT)
      expectListShape(res, 'GET /school-admin/students')
      const found = (res.body.items as any[]).some((s) => s.id === S.studentId)
      expect(found).toBe(true)
    })

    it('PATCH /school-admin/students/:id → 200', async () => {
      const res = await apiRequest(
        `/school-admin/students/${S.studentId}`,
        'PATCH',
        { name: `QA学生改${SUF}` },
        S.AT,
      )
      expectOk(res, 'PATCH /school-admin/students/:id')
      expectFields(res.body, ['id'], 'PATCH student')
    })

    it('GET /school-admin/search?q= → 200 + {students,teachers,classes}', async () => {
      const res = await apiRequest(`/school-admin/search?q=${encodeURIComponent('QA学生')}`, 'GET', undefined, S.AT)
      expectOk(res, 'search')
      expect(Array.isArray(res.body.students)).toBe(true)
      expect(Array.isArray(res.body.teachers)).toBe(true)
      expect(Array.isArray(res.body.classes)).toBe(true)
    })

    it('GET /school-admin/parent-logins → 200 + {items,total}', async () => {
      const res = await apiRequest('/school-admin/parent-logins', 'GET', undefined, S.AT)
      expectOk(res, 'parent-logins')
      expect(Array.isArray(res.body.items)).toBe(true)
      expect(typeof res.body.total).toBe('number')
    })
  })

  // ====================== 教师模块 ======================
  describe('教师模块', () => {
    // [SOURCE DEFECT] 云端教师 /classes 返回 500 {}
    it('GET /classes → 200 + 列表', async () => {
      const res = await apiRequest('/classes', 'GET', undefined, S.TT)
      expectListShape(res, 'GET /classes')
    })

    it('GET /students?classId= → 200 + 列表含已建学生(字段完整)', async () => {
      const res = await apiRequest(`/students?classId=${S.classId}`, 'GET', undefined, S.TT)
      expectListShape(res, 'GET /students?classId=')
      const stu = (res.body.items as any[]).find((s) => s.id === S.studentId)
      expect(stu).toBeDefined()
      expectFields(stu, ['id', 'name', 'studentNo', 'gender', 'classId'], 'student item')
      expect(stu.classId).toBe(S.classId)
    })

    it('GET /exams → 200 + {items:[], total:N}', async () => {
      expectListShape(await apiRequest('/exams', 'GET', undefined, S.TT), 'GET /exams')
    })

    it('GET /homework → 200 + {items:[], total:N}', async () => {
      expectListShape(await apiRequest('/homework', 'GET', undefined, S.TT), 'GET /homework')
    })

    it('GET /notices → 200 + {items:[], total:N}', async () => {
      expectListShape(await apiRequest('/notices', 'GET', undefined, S.TT), 'GET /notices')
    })

    it('GET /notifications → 200 + {items:[], total:N}', async () => {
      expectListShape(await apiRequest('/notifications', 'GET', undefined, S.TT), 'GET /notifications')
    })

    it('GET /notifications/unread-count → 200 + {count:N}', async () => {
      const res = await apiRequest('/notifications/unread-count', 'GET', undefined, S.TT)
      expectOk(res, 'unread-count')
      expect(typeof res.body.count).toBe('number')
    })

    it('POST /notifications/:id/read → 200', async () => {
      const list = await apiRequest('/notifications', 'GET', undefined, S.TT)
      const items = (list.body && list.body.items) || []
      if (items.length > 0) {
        const res = await apiRequest(`/notifications/${items[0].id}/read`, 'POST', undefined, S.TT)
        expectOk(res, 'read notification')
      } else {
        // 无种子通知：用确定性 uuid 试探路由（接受 200/400/401/403/404，拒绝 5xx）
        const res = await apiRequest('/notifications/00000000-0000-0000-0000-000000000000/read', 'POST', undefined, S.TT)
        expect([200, 400, 401, 403, 404]).toContain(res.status)
      }
    })

    it('GET /reward-records?classId= → 200 + {items:[], total:N}', async () => {
      expectListShape(await apiRequest(`/reward-records?classId=${S.classId}`, 'GET', undefined, S.TT), 'GET /reward-records')
    })

    it('GET /score-records?classId= → 200 + {items:[], total:N}', async () => {
      expectListShape(await apiRequest(`/score-records?classId=${S.classId}`, 'GET', undefined, S.TT), 'GET /score-records')
    })

    it('GET /users/me → 200 + {id, name}', async () => {
      const res = await apiRequest('/users/me', 'GET', undefined, S.TT)
      expectOk(res, 'users/me')
      expectFields(res.body, ['id', 'name'], 'users/me')
    })

    // [SOURCE DEFECT] 云端 /config/* 路由未注册，返回 404
    it('GET /config/ai-settings → 200', async () => {
      const res = await apiRequest('/config/ai-settings', 'GET', undefined, S.TT)
      expectOk(res, 'GET /config/ai-settings')
    })

    it('PATCH /config/ai-settings → 200', async () => {
      const res = await apiRequest('/config/ai-settings', 'PATCH', { enabled: true }, S.TT)
      expectOk(res, 'PATCH /config/ai-settings')
    })

    it('GET /config/app-config → 200', async () => {
      const res = await apiRequest('/config/app-config', 'GET', undefined, S.TT)
      expectOk(res, 'GET /config/app-config')
    })
  })

  // ====================== 家长模块 ======================
  describe('家长模块（启用后）', () => {
    it('GET /parent-auth/me → 200 + 含 studentId', async () => {
      const res = await apiRequest('/parent-auth/me', 'GET', undefined, S.PT)
      expectOk(res, 'parent-auth/me')
      expectFields(res.body, ['studentId'], 'parent-auth/me')
    })

    it('GET /parent-auth/notices → 200 + 数组', async () => {
      const res = await apiRequest('/parent-auth/notices', 'GET', undefined, S.PT)
      expectOk(res, 'parent-auth/notices')
      expect(Array.isArray(res.body)).toBe(true)
    })

    it('GET /parent-auth/exams → 200 + {exams:[]}', async () => {
      const res = await apiRequest('/parent-auth/exams', 'GET', undefined, S.PT)
      expectOk(res, 'parent-auth/exams')
      expect(Array.isArray(res.body.exams)).toBe(true)
    })

    it('GET /parent-auth/homework → 200 + 数组', async () => {
      const res = await apiRequest('/parent-auth/homework', 'GET', undefined, S.PT)
      expectOk(res, 'parent-auth/homework')
      expect(Array.isArray(res.body)).toBe(true)
    })
  })

  // ====================== 数据完整性 ======================
  describe('数据完整性', () => {
    it('创建的教师能在 GET /school-admin/teachers 查到', async () => {
      const res = await apiRequest('/school-admin/teachers?skip=0&take=50', 'GET', undefined, S.AT)
      expectListShape(res, 'integrity teachers')
      expect((res.body.items as any[]).some((t) => t.id === S.teacherId)).toBe(true)
    })

    it('创建的班级使 dashboard.totalClasses ≥ 1', async () => {
      const res = await apiRequest('/school-admin/dashboard', 'GET', undefined, S.AT)
      expectOk(res, 'integrity dashboard')
      expect(res.body.totalClasses).toBeGreaterThanOrEqual(1)
    })

    it('创建的学生能在 GET /students?classId= 查到且字段完整', async () => {
      const res = await apiRequest(`/students?classId=${S.classId}`, 'GET', undefined, S.TT)
      expectListShape(res, 'integrity students')
      const stu = (res.body.items as any[]).find((s) => s.id === S.studentId)
      expect(stu).toBeDefined()
      expectFields(stu, ['id', 'name', 'studentNo', 'gender', 'classId'], 'integrity student')
    })
  })
})
