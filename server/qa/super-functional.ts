/**
 * 超级管理员全功能覆盖测试用例
 * 覆盖功能域：登录认证、学校管理、校管管理、平台配置、功能包、审计日志、成绩审计、权限管控、数据隔离
 * 用例 ID 格式：FUNC-SUP-XXX
 */
import { http } from './harness'
import { addCase, assert, assertEq, assertIncludes } from './framework'
import {
  SeedResult, SUPER_USER, SUPER_PASS, ADMIN_PASS, TEACHER_PASS, PARENT_PASS,
  adminUser, teacherUser, studentNo, SCHOOL_COUNT, SUBJECTS,
  TEACHERS_PER_SCHOOL, CLASSES_PER_SCHOOL, STUDENTS_PER_CLASS, EXAMS_PER_CLASS,
  GRADES_PER_SCHOOL, CLASSES_PER_GRADE, TEACHERS_PER_CLASS,
} from './seed'

export function registerSuperFunctionalCases(baseUrl: string, seed: SeedResult) {
  const api = (path: string) => `${baseUrl}${path}`
  let superToken = ''
  const s1 = () => seed.schools[0]
  const s2 = () => seed.schools[1]

  /* ================= 1. 登录与认证 ================= */

  addCase('FUNC-SUP-100', 'super', '超管统一登录返回 token 与 role=super', async () => {
    const r = await http('POST', api('/auth/unified-login'), { body: { username: SUPER_USER, password: SUPER_PASS } })
    assert(r.status < 300, `登录失败 ${r.status}`)
    assertEq(r.body.role, 'super', 'role')
    assert(typeof r.body.token === 'string' && r.body.token.length > 20, 'token 缺失或长度不足')
    superToken = r.body.token
  })

  addCase('FUNC-SUP-101', 'super', '错误密码登录返回 401', async () => {
    const r = await http('POST', api('/auth/unified-login'), { body: { username: SUPER_USER, password: 'wrong-password' } })
    assertEq(r.status, 401, '状态码')
  })

  addCase('FUNC-SUP-102', 'super', 'SQL 注入参数登录被拒绝（4xx）', async () => {
    const r = await http('POST', api('/auth/unified-login'), {
      body: { username: "admin' OR '1'='1", password: "x' OR 1=1--" },
    })
    assert(r.status >= 400 && r.status < 500, `期望 4xx，实际 ${r.status}`)
  })

  addCase('FUNC-SUP-103', 'super', '空 JSON 登录体被 DTO 拒绝（400/401）', async () => {
    const r = await http('POST', api('/auth/unified-login'), { body: {} })
    assert(r.status === 400 || r.status === 401, `期望 400/401，实际 ${r.status}`)
  })

  addCase('FUNC-SUP-104', 'super', '无 token 访问受保护接口返回 401', async () => {
    const r = await http('GET', api('/admin/schools'))
    assertEq(r.status, 401, '状态码')
  })

  addCase('FUNC-SUP-105', 'super', '篡改 JWT 签名被拒绝（401）', async () => {
    const tampered = superToken.slice(0, -3) + 'abc'
    const r = await http('GET', api('/admin/schools'), { token: tampered })
    assertEq(r.status, 401, '状态码')
  })

  /* ================= 2. 学校管理 ================= */

  addCase('FUNC-SUP-200', 'super', '学校列表包含全部种子学校（20所）', async () => {
    const r = await http('GET', api('/admin/schools?pageSize=100'), { token: superToken })
    assert(r.status < 300, `状态码 ${r.status}`)
    const names = (r.body.items || []).map((x: any) => x.name)
    for (let i = 1; i <= SCHOOL_COUNT; i++) {
      assertIncludes(names, `测试第${i}学校`, '学校列表')
    }
  })

  addCase('FUNC-SUP-201', 'super', '学校详情字段齐全（id/name/code）', async () => {
    const r = await http('GET', api(`/admin/schools/${s1().id}`), { token: superToken })
    assert(r.status < 300, `状态码 ${r.status}`)
    for (const f of ['id', 'name', 'code']) {
      assert(r.body[f] != null, `字段 ${f} 缺失`)
    }
  })

  addCase('FUNC-SUP-202', 'super', '创建学校成功并返回 id', async () => {
    const r = await http('POST', api('/admin/schools'), {
      token: superToken,
      body: { name: 'QA新建学校', prefix: 'QA' },
    })
    assert(r.status < 300, `创建学校失败 ${r.status} ${JSON.stringify(r.body).slice(0, 120)}`)
    assert(r.body.id, '学校 id 缺失')
  })

  addCase('FUNC-SUP-203', 'super', '更新学校信息闭环', async () => {
    const r = await http('PATCH', api(`/admin/schools/${s1().id}`), {
      token: superToken,
      body: { name: 'QA更新学校名' },
    })
    assert(r.status < 300, `更新学校失败 ${r.status}`)
    const g = await http('GET', api(`/admin/schools/${s1().id}`), { token: superToken })
    assertEq(g.body.name, 'QA更新学校名', '学校名未更新')
  })

  addCase('FUNC-SUP-204', 'super', '导出学校数据返回成功', async () => {
    const r = await http('GET', api('/admin/schools/export'), { token: superToken })
    assert(r.status < 300, `导出学校数据失败 ${r.status}`)
  })

  addCase('FUNC-SUP-205', 'super', '不存在的学校详情返回 404/400 不崩溃', async () => {
    const r = await http('GET', api('/admin/schools/non-existent-id'), { token: superToken })
    assert(r.status === 404 || r.status === 400, `期望 404/400，实际 ${r.status}`)
  })

  addCase('FUNC-SUP-206', 'super', '超长学校名（120字符）被拒绝或安全处理', async () => {
    const r = await http('POST', api('/admin/schools'), {
      token: superToken,
      body: { name: '超'.repeat(120), prefix: 'QA' },
    })
    assert(r.status === 400 || r.status === 201, `意外状态码 ${r.status}`)
    if (r.status === 201) {
      assert((r.body.name || '').length <= 120, '名称存储异常')
    }
  })

  /* ================= 3. 校管管理 ================= */

  addCase('FUNC-SUP-300', 'super', '校管列表返回各校管理员（≥20人）', async () => {
    const r = await http('GET', api('/admin/school-admins?pageSize=100'), { token: superToken })
    assert(r.status < 300, `状态码 ${r.status}`)
    assert((r.body.items || []).length >= SCHOOL_COUNT, '校管数量不足')
  })

  addCase('FUNC-SUP-301', 'super', '创建校管成功', async () => {
    const r = await http('POST', api('/admin/school-admins'), {
      token: superToken,
      body: { username: 'qacrt_admin01', password: 'QaCrt@12345', name: '新建校管1', schoolId: s1().id },
    })
    assert(r.status < 300, `创建校管失败 ${r.status} ${JSON.stringify(r.body).slice(0, 120)}`)
    assert(r.body.id, '校管 id 缺失')
  })

  addCase('FUNC-SUP-302', 'super', '重复校管用户名被拒绝', async () => {
    const r = await http('POST', api('/admin/school-admins'), {
      token: superToken,
      body: { username: adminUser(1), password: ADMIN_PASS, name: '重复校管', schoolId: s1().id },
    })
    assert(r.status >= 400, `重复用户名应被拒绝，实际 ${r.status}`)
  })

  addCase('FUNC-SUP-303', 'super', '校管弱密码（<6位）被 DTO 拒绝', async () => {
    const r = await http('POST', api('/admin/school-admins'), {
      token: superToken,
      body: { username: 'qaedge_weak', password: '123', name: '弱密码校管', schoolId: s1().id },
    })
    assertEq(r.status, 400, '状态码')
  })

  addCase('FUNC-SUP-304', 'super', '批量创建校管成功', async () => {
    const r = await http('POST', api('/admin/school-admins/batch'), {
      token: superToken,
      body: {
        admins: [
          { username: 'qabatch_admin01', password: 'QaBatch@123', name: '批量校管1', schoolId: s1().id },
          { username: 'qabatch_admin02', password: 'QaBatch@123', name: '批量校管2', schoolId: s2().id },
        ],
      },
    })
    assert(r.status < 300, `批量创建校管失败 ${r.status} ${JSON.stringify(r.body).slice(0, 120)}`)
  })

  addCase('FUNC-SUP-305', 'super', '批量创建校管空数组被拒绝', async () => {
    const r = await http('POST', api('/admin/school-admins/batch'), {
      token: superToken,
      body: { admins: [] },
    })
    assertEq(r.status, 400, '状态码')
  })

  addCase('FUNC-SUP-306', 'super', '重置校管密码后用新密码登录', async () => {
    const list = await http('GET', api('/admin/school-admins?pageSize=100'), { token: superToken })
    const items = list.body.items || []
    const target = items.find((a: any) => a.username === adminUser(1))
    assert(target, '校管缺失')
    const rs = await http('PATCH', api(`/admin/school-admins/${target.id}/password`), {
      token: superToken,
      body: { password: 'QaReset@123' },
    })
    assert(rs.status < 300, `重置密码失败 ${rs.status}`)
    const lg = await http('POST', api('/auth/unified-login'), { body: { username: adminUser(1), password: 'QaReset@123' } })
    assert(lg.status < 300, `新密码登录失败 ${lg.status}`)
    // 还原
    await http('PATCH', api(`/admin/school-admins/${target.id}/password`), {
      token: superToken,
      body: { password: ADMIN_PASS },
    })
  })

  addCase('FUNC-SUP-307', 'super', '删除校管成功', async () => {
    // 先创建一个临时校管
    const c = await http('POST', api('/admin/school-admins'), {
      token: superToken,
      body: { username: 'qadel_admin01', password: 'QaDel@12345', name: '待删校管', schoolId: s1().id },
    })
    assert(c.status < 300, `创建临时校管失败 ${c.status}`)
    const r = await http('DELETE', api(`/admin/school-admins/${c.body.id}`), { token: superToken })
    assert(r.status < 300, `删除校管失败 ${r.status}`)
  })

  /* ================= 4. 平台配置 ================= */

  addCase('FUNC-SUP-400', 'super', '读取平台配置返回配置项列表', async () => {
    const r = await http('GET', api('/config/app'), { token: superToken })
    assert(r.status < 300, `读取配置失败 ${r.status}`)
    assert(Array.isArray(r.body) || typeof r.body === 'object', '配置响应结构异常')
  })

  addCase('FUNC-SUP-401', 'super', '更新平台配置闭环（PUT /config/app）', async () => {
    const g = await http('GET', api('/config/app'), { token: superToken })
    assert(g.status < 300, `读取失败 ${g.status}`)
    const items = Array.isArray(g.body) ? g.body : []
    const u = await http('PUT', api('/config/app'), {
      token: superToken,
      body: { items: items.slice(0, 3).map((it: any) => ({ key: it.key, value: it.value })) },
    })
    assert(u.status < 300, `更新失败 ${u.status}`)
  })

  addCase('FUNC-SUP-402', 'super', '单 key 更新配置（PUT /config/app/:key）', async () => {
    const r = await http('PUT', api('/config/app/theme'), {
      token: superToken,
      body: { value: 'light' },
    })
    assert(r.status < 300, `单 key 更新失败 ${r.status}`)
  })

  addCase('FUNC-SUP-403', 'super', 'AI 服务商列表查询', async () => {
    const r = await http('GET', api('/ai-providers'), { token: superToken })
    assert(r.status < 300, `查询 AI 服务商失败 ${r.status}`)
    assert(Array.isArray(r.body), '应为数组')
  })

  addCase('FUNC-SUP-404', 'super', '创建 AI 服务商配置', async () => {
    const r = await http('POST', api('/ai-providers'), {
      token: superToken,
      body: {
        code: 'qa-test-provider',
        name: 'QA测试服务商',
        baseUrl: 'https://api.example.com/v1',
        textModels: ['gpt-4', 'gpt-3.5-turbo'],
        visionModels: ['gpt-4-vision'],
        imageModels: ['dall-e-3'],
        videoModels: [],
      },
    })
    assert(r.status < 300, `创建 AI 服务商失败 ${r.status} ${JSON.stringify(r.body).slice(0, 120)}`)
  })

  addCase('FUNC-SUP-405', 'super', '更新 AI 服务商配置', async () => {
    const r = await http('PATCH', api('/ai-providers/qa-test-provider'), {
      token: superToken,
      body: { name: 'QA测试服务商-更新' },
    })
    assert(r.status < 300, `更新 AI 服务商失败 ${r.status}`)
  })

  addCase('FUNC-SUP-406', 'super', '删除 AI 服务商配置', async () => {
    const r = await http('DELETE', api('/ai-providers/qa-test-provider'), { token: superToken })
    assert(r.status < 300, `删除 AI 服务商失败 ${r.status}`)
  })

  addCase('FUNC-SUP-407', 'super', 'AI 服务商缺必填字段被拒绝', async () => {
    const r = await http('POST', api('/ai-providers'), {
      token: superToken,
      body: { name: '缺code的服务商' },
    })
    assertEq(r.status, 400, '状态码')
  })

  /* ================= 5. 学校功能包 ================= */

  addCase('FUNC-SUP-500', 'super', '查询学校功能包配置', async () => {
    const r = await http('GET', api(`/admin/schools/${s1().id}/features`), { token: superToken })
    assert(r.status < 300, `状态码 ${r.status}`)
    assert(r.body != null, '响应为空')
  })

  addCase('FUNC-SUP-501', 'super', '更新学校功能包开关', async () => {
    const r = await http('PATCH', api(`/admin/schools/${s1().id}/features`), {
      token: superToken,
      body: { featureFlags: ['grades', 'homework', 'notices'] },
    })
    assert(r.status < 300, `更新功能包失败 ${r.status}`)
  })

  addCase('FUNC-SUP-502', 'super', '清空学校功能包（恢复全量）', async () => {
    const r = await http('PATCH', api(`/admin/schools/${s1().id}/features`), {
      token: superToken,
      body: { featureFlags: [] },
    })
    assert(r.status < 300, `清空功能包失败 ${r.status}`)
  })

  /* ================= 6. 审计日志 ================= */

  addCase('FUNC-SUP-600', 'super', '查询审计日志返回列表', async () => {
    const r = await http('GET', api('/admin/audit-logs?pageSize=50'), { token: superToken })
    assert(r.status < 300, `状态码 ${r.status}`)
    assert(Array.isArray(r.body.items) || Array.isArray(r.body), '响应结构异常')
  })

  addCase('FUNC-SUP-601', 'super', '审计日志分页（pageSize=10）', async () => {
    const r = await http('GET', api('/admin/audit-logs?page=1&pageSize=10'), { token: superToken })
    assert(r.status < 300, `状态码 ${r.status}`)
    const items = r.body.items || r.body || []
    assert(items.length <= 10, '分页上限被突破')
  })

  addCase('FUNC-SUP-602', 'super', '审计日志分页边界（pageSize=0/负数）不崩溃', async () => {
    const r1 = await http('GET', api('/admin/audit-logs?page=1&pageSize=0'), { token: superToken })
    const r2 = await http('GET', api('/admin/audit-logs?page=-1&pageSize=-5'), { token: superToken })
    assert(r1.status < 500, `pageSize=0 不应 5xx（${r1.status}）`)
    assert(r2.status < 500, `负数分页不应 5xx（${r2.status}）`)
  })

  addCase('FUNC-SUP-603', 'super', '按学校过滤审计日志', async () => {
    const r = await http('GET', api(`/admin/audit-logs?schoolId=${s1().id}&pageSize=20`), { token: superToken })
    assert(r.status < 300, `状态码 ${r.status}`)
  })

  /* ================= 7. 成绩审计 ================= */

  addCase('FUNC-SUP-700', 'super', '成绩审计列表查询', async () => {
    const r = await http('GET', api('/admin/audit-grades?pageSize=20'), { token: superToken })
    assert(r.status < 300, `状态码 ${r.status}`)
  })

  addCase('FUNC-SUP-701', 'super', '按学校过滤成绩审计', async () => {
    const r = await http('GET', api(`/admin/audit-grades?schoolId=${s1().id}&pageSize=20`), { token: superToken })
    assert(r.status < 300, `状态码 ${r.status}`)
  })

  addCase('FUNC-SUP-702', 'super', '按班级+科目过滤成绩审计', async () => {
    const r = await http('GET', api(`/admin/audit-grades?classId=${s1().classIds[0]}&subject=语文&pageSize=20`), { token: superToken })
    assert(r.status < 300, `状态码 ${r.status}`)
  })

  addCase('FUNC-SUP-703', 'super', '成绩审计汇总接口', async () => {
    const r = await http('GET', api('/admin/audit-grade-summary'), { token: superToken })
    assert(r.status < 300, `状态码 ${r.status}`)
  })

  addCase('FUNC-SUP-704', 'super', '考试审计列表查询', async () => {
    const r = await http('GET', api('/admin/audit-exams?pageSize=20'), { token: superToken })
    assert(r.status < 300, `状态码 ${r.status}`)
  })

  /* ================= 8. 权限管控 ================= */

  addCase('FUNC-SUP-800', 'super', '超管访问教师专用接口被角色守卫拒绝', async () => {
    // /config/app-config 为 @Roles('teacher') 接口
    const r = await http('GET', api('/config/app-config'), { token: superToken })
    assert(r.status === 401 || r.status === 403, `超管访问应被拒绝，实际 ${r.status}`)
  })

  addCase('FUNC-SUP-801', 'super', '超管访问校管专用接口被角色守卫拒绝', async () => {
    // /school-admin/dashboard 为 @Roles('school_admin') 接口
    const r = await http('GET', api('/school-admin/dashboard'), { token: superToken })
    assert(r.status === 401 || r.status === 403, `超管访问校管接口应被拒绝，实际 ${r.status}`)
  })

  addCase('FUNC-SUP-802', 'super', '超管 token 无法访问家长接口', async () => {
    const r = await http('GET', api('/parent-auth/me'), { token: superToken })
    assert(r.status === 401 || r.status === 403, `超管访问家长接口应被拒绝，实际 ${r.status}`)
  })

  /* ================= 9. 数据隔离 ================= */

  addCase('FUNC-SUP-900', 'super', '校管越权访问超管接口被拒绝（学校列表）', async () => {
    const r = await http('GET', api('/admin/schools'), { token: s1().adminToken })
    assert(r.status === 401 || r.status === 403, `期望 401/403，实际 ${r.status}`)
  })

  addCase('FUNC-SUP-901', 'super', '校管越权访问超管接口被拒绝（校管列表）', async () => {
    const r = await http('GET', api('/admin/school-admins'), { token: s1().adminToken })
    assert(r.status === 401 || r.status === 403, `期望 401/403，实际 ${r.status}`)
  })

  addCase('FUNC-SUP-902', 'super', '校管越权访问超管接口被拒绝（审计日志）', async () => {
    const r = await http('GET', api('/admin/audit-logs'), { token: s1().adminToken })
    assert(r.status === 401 || r.status === 403, `期望 401/403，实际 ${r.status}`)
  })

  addCase('FUNC-SUP-903', 'super', '校管越权创建校管被拒绝', async () => {
    const r = await http('POST', api('/admin/school-admins'), {
      token: s1().adminToken,
      body: { username: 'qahack_admin', password: 'QaHack@123', name: '越权校管', schoolId: s1().id },
    })
    assert(r.status === 401 || r.status === 403, `期望 401/403，实际 ${r.status}`)
  })

  /* ================= 10. 超管只读审计视图 ================= */

  addCase('FUNC-SUP-1000', 'super', '超管查看跨校教师列表', async () => {
    const r = await http('GET', api('/admin/teachers?pageSize=500'), { token: superToken })
    assert(r.status < 300, `状态码 ${r.status}`)
    const total = r.body.total ?? (r.body.items || []).length
    assert(total >= TEACHERS_PER_SCHOOL, `教师总数应≥${TEACHERS_PER_SCHOOL}，实际 ${total}`)
  })

  addCase('FUNC-SUP-1001', 'super', '超管查看跨校班级列表', async () => {
    const r = await http('GET', api('/admin/classes?pageSize=500'), { token: superToken })
    assert(r.status < 300, `状态码 ${r.status}`)
    const total = r.body.total ?? (r.body.items || []).length
    assert(total >= CLASSES_PER_SCHOOL, `班级总数应≥${CLASSES_PER_SCHOOL}，实际 ${total}`)
  })

  addCase('FUNC-SUP-1002', 'super', '超管查看跨校学生列表', async () => {
    const r = await http('GET', api('/admin/students?pageSize=500'), { token: superToken })
    assert(r.status < 300, `状态码 ${r.status}`)
    const total = r.body.total ?? (r.body.items || []).length
    assert(total >= STUDENTS_PER_CLASS * CLASSES_PER_SCHOOL, `学生总数不足`)
  })

  /* ================= 11. 缓存管理 ================= */

  addCase('FUNC-SUP-1100', 'super', '查看缓存统计', async () => {
    const r = await http('GET', api('/admin/cache/stats'), { token: superToken })
    assert(r.status < 300, `状态码 ${r.status}`)
  })

  addCase('FUNC-SUP-1101', 'super', '清空缓存', async () => {
    const r = await http('POST', api('/admin/cache/clear'), { token: superToken })
    assert(r.status < 300, `状态码 ${r.status}`)
  })

  /* ================= 12. 超管消息系统 ================= */

  addCase('FUNC-SUP-1200', 'super', '超管收件人列表包含全部校管', async () => {
    const r = await http('GET', api('/messages/recipients'), { token: superToken })
    assert(r.status < 300, `查询失败 ${r.status}`)
    const items = Array.isArray(r.body) ? r.body : []
    assert(items.length >= 5, `超管应能看到所有校管，实际 ${items.length}`)
    const hasAdmin = items.some((x: any) => x.role === 'school_admin')
    assert(hasAdmin, '超管收件人列表应包含校管')
  })

  addCase('FUNC-SUP-1201', 'super', '超管查看消息列表', async () => {
    const r = await http('GET', api('/messages?pageSize=20'), { token: superToken })
    assert(r.status < 300, `状态码 ${r.status}`)
  })

  addCase('FUNC-SUP-1202', 'super', '超管查看未读消息数', async () => {
    const r = await http('GET', api('/messages/unread-count'), { token: superToken })
    assert(r.status < 300, `状态码 ${r.status}`)
  })

  /* ================= 13. 学校批量操作 ================= */

  addCase('FUNC-SUP-1300', 'super', '批量禁用/启用学校', async () => {
    const r = await http('POST', api('/admin/schools/batch-toggle'), {
      token: superToken,
      body: { ids: [s1().id], enabled: true },
    })
    assert(r.status < 300, `批量切换学校状态失败 ${r.status}`)
  })

  /* ================= 14. 超管功能档案 ================= */

  addCase('FUNC-SUP-1400', 'super', '超管 /auth/me 返回功能档案', async () => {
    const r = await http('GET', api('/auth/me'), { token: superToken })
    assert(r.status < 300, `状态码 ${r.status}`)
    assert(r.body.role, 'role 缺失')
  })
}
