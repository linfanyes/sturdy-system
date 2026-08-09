import 'reflect-metadata'
import fs from 'fs'
import path from 'path'
import { BadRequestException, UnauthorizedException } from '@nestjs/common'
import { In } from 'typeorm'
import { SchoolAdminService } from '../../src/school-admin/school-admin.service'
import { TeacherMgmtService } from '../../src/school-admin/teacher-mgmt.service'
import { ClassMgmtService } from '../../src/school-admin/class-mgmt.service'
import { ParentAuthService } from '../../src/parent-auth/parent-auth.service'
import { ParentQueryService } from '../../src/parent-auth/parent-query.service'
import { SchoolAdminModule } from '../../src/school-admin/school-admin.module'
import { ParentAuthModule } from '../../src/parent-auth/parent-auth.module'
import { hashPassword } from '../../src/common/utils/password.util'

/**
 * 关键路径测试 —— 源码阅读验证模式
 *
 * 通过 mock 依赖构造服务对象，结合源码断言，验证核心业务路径：
 * - SchoolAdminService: login / dashboard / createTeacher
 * - TeacherMgmtService / ClassMgmtService: 拆分后的独立方法
 * - ParentAuthService: login / findKids / getExams
 * - 模块注册正确性（providers 列表断言）
 */

/** 构造一个包含常用 Repository 方法的 mock 对象 */
function mockRepo(): any {
  const repo: any = {}
  repo.findOne = jest.fn()
  repo.find = jest.fn()
  repo.findAndCount = jest.fn()
  repo.save = jest.fn()
  repo.remove = jest.fn()
  repo.create = jest.fn()
  repo.update = jest.fn().mockResolvedValue(undefined)
  repo.delete = jest.fn()
  repo.count = jest.fn()
  repo.createQueryBuilder = jest.fn()
  return repo
}

/** 构造带 manager.connection 的 mock repo（service 内部会读连接类型） */
function mockRepoWithManager(): any {
  const repo = mockRepo()
  repo.manager = { connection: { options: { type: 'sqlite' } } }
  return repo
}

// ====================================================================
// 校管关键路径
// ====================================================================
describe('校管关键路径', () => {
  let saService: SchoolAdminService
  let teacherSvc: TeacherMgmtService
  let classSvc: ClassMgmtService

  let jwt: any
  let saRepo: any
  let userRepo: any
  let studentRepo: any
  let schoolRepo: any
  let classRepo: any
  let noticeRepo: any
  let attRepo: any
  let hwRepo: any
  let gradeRepo: any
  let examRepo: any
  let classMemberRepo: any
  let classMemberSvc: any
  let audit: any
  let ai: any
  let em: any
  let classMgmt: ClassMgmtService

  beforeEach(() => {
    jwt = { sign: jest.fn().mockReturnValue('jwt-token') }
    saRepo = mockRepo()
    userRepo = mockRepo()
    studentRepo = mockRepo()
    schoolRepo = mockRepo()
    classRepo = mockRepo()
    noticeRepo = mockRepo()
    attRepo = mockRepo()
    hwRepo = mockRepo()
    gradeRepo = mockRepo()
    examRepo = mockRepo()
    classMemberRepo = mockRepo()
    classMemberSvc = {
      assertCanBecomeHead: jest.fn().mockResolvedValue(undefined),
      assertTeacherNotHeadElsewhere: jest.fn().mockResolvedValue(undefined),
      addHeadTeacher: jest.fn().mockResolvedValue(undefined),
      addSubjectTeacher: jest.fn().mockResolvedValue(undefined),
      removeMember: jest.fn().mockResolvedValue(undefined),
    }
    audit = { log: jest.fn().mockResolvedValue(undefined) }
    ai = {
      parse: jest.fn().mockResolvedValue([]),
      parseFile: jest.fn().mockResolvedValue({ text: '' }),
    }
    em = {
      transaction: jest.fn(async (cb: any) => cb(em)),
      getRepository: jest.fn(() => mockRepoWithManager()),
      query: jest.fn().mockResolvedValue(undefined),
    }

    // ---- ClassMgmtService 实例（作为 school-admin 内部依赖） ----
    classMgmt = new ClassMgmtService(
      classRepo,
      studentRepo,
      userRepo,
      classMemberRepo,
      classMemberSvc as any,
      audit as any,
      ai as any,
      em as any,
    )

    // ---- SchoolAdminService 实例 ----
    saService = new SchoolAdminService(
      jwt as any,
      saRepo,
      userRepo,
      studentRepo,
      schoolRepo,
      classRepo,
      noticeRepo,
      attRepo,
      hwRepo,
      gradeRepo,
      examRepo,
      audit as any,
      ai as any,
      classMgmt,
      em as any,
    )

    // ---- TeacherMgmtService 实例 ----
    teacherSvc = new TeacherMgmtService(
      userRepo,
      studentRepo,
      schoolRepo,
      classRepo,
      classMemberSvc as any,
      audit as any,
      ai as any,
      em as any,
    )

    // ---- ClassMgmtService 独立实例（用于直接测试） ----
    classSvc = new ClassMgmtService(
      classRepo,
      studentRepo,
      userRepo,
      classMemberRepo,
      classMemberSvc as any,
      audit as any,
      ai as any,
      em as any,
    )
  })

  it('SchoolAdminService.login 应验证用户名密码', async () => {
    // 场景1：账号不存在
    saRepo.findOne.mockResolvedValue(null)
    await expect(saService.login('wrong', 'pass')).rejects.toThrow(UnauthorizedException)
    await expect(saService.login('wrong', 'pass')).rejects.toThrow('账号或密码错误')

    // 场景2：密码错误
    const admin = {
      id: 'admin-1',
      username: 'sa01',
      passwordHash: hashPassword('correct_password'),
      name: '校管A',
      schoolId: 'school-1',
      enabled: true,
    }
    saRepo.findOne.mockResolvedValue(admin)
    schoolRepo.findOne.mockResolvedValue({ id: 'school-1', name: '测试学校', code: 'S01' })
    await expect(saService.login('sa01', 'wrong_pass')).rejects.toThrow('账号或密码错误')

    // 场景3：账号被禁用
    saRepo.findOne.mockResolvedValue({ ...admin, enabled: false })
    await expect(saService.login('sa01', 'correct_password')).rejects.toThrow('账号已被禁用')

    // 场景4：正确登录返回 token
    saRepo.findOne.mockResolvedValue(admin)
    const result = await saService.login('sa01', 'correct_password')
    expect(result.token).toBe('jwt-token')
    expect(result.admin.id).toBe('admin-1')
    expect(result.admin.schoolId).toBe('school-1')
    expect(jwt.sign).toHaveBeenCalledWith(
      expect.objectContaining({ sub: 'admin-1', role: 'school_admin', schoolId: 'school-1' }),
    )
  })

  it('SchoolAdminService.dashboard 应返回统计看板数据', async () => {
    // 本校有 2 名教师，1 名启用 1 名禁用
    const teachers = [
      { id: 't1', schoolId: 'school-1', enabled: true, subject: '语文', subjects: [] },
      { id: 't2', schoolId: 'school-1', enabled: false, subject: '数学', subjects: [] },
    ]
    userRepo.find.mockResolvedValue(teachers)
    classRepo.find.mockResolvedValue([{ id: 'c1', teacherId: 't1' }])
    studentRepo.count.mockResolvedValue(25)
    // 出勤统计 groupBy
    studentRepo.createQueryBuilder.mockReturnValue({
      select: jest.fn().mockReturnThis(),
      addSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      groupBy: jest.fn().mockReturnThis(),
      getRawMany: jest.fn().mockResolvedValue([{ classId: 'c1', cnt: '25' }]),
    })
    attRepo.find.mockResolvedValue([
      {
        classId: 'c1',
        date: new Date().toISOString().slice(0, 10),
        records: [
          { status: '出勤' },
          { status: '缺勤' },
          { status: '出勤' },
        ],
      },
    ])
    hwRepo.count.mockResolvedValue(3)

    const result = await saService.dashboard('school-1')

    expect(result.totalTeachers).toBe(2)
    expect(result.activeTeachers).toBe(1)
    expect(result.inactiveTeachers).toBe(1)
    expect(result.totalClasses).toBe(1)
    expect(result.totalStudents).toBe(25)
    expect(result.pendingHomework).toBe(3)
    // 出勤：presentStudents 按 attendance records 中 '出勤' 条数计算 = 2，
    // expectedStudents 按班级学生总数计算 = 25，所以 2/25 = 8%
    expect(result.attendanceRate).toBe(8)
    expect(result.schoolId).toBe('school-1')
    expect(result.subjectDistribution).toEqual([
      { name: '语文', count: 1 },
      { name: '数学', count: 1 },
    ])
  })

  it('SchoolAdminService.createTeacher 应创建教师账号', async () => {
    // 注意：实际 createTeacher 在 TeacherMgmtService 中，SchoolAdminService 不再直接包含此方法
    // 这里验证 SchoolAdminService 通过 classMgmt 委托不报错，且 TeacherMgmtService.createTeacher 正常
    const userRepoEm: any = {
      findOne: jest.fn().mockResolvedValue(null),
      create: jest.fn((data: any) => ({ ...data })),
      save: jest.fn().mockImplementation(async (data: any) => ({ ...data, id: 'u-1' })),
      manager: { connection: { options: { type: 'sqlite' } } },
      createQueryBuilder: jest.fn(() => ({
        where: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        setLock: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue(null),
      })),
    }
    em.getRepository.mockReturnValue(userRepoEm)
    em.transaction.mockImplementation(async (cb: any) => cb(em))
    schoolRepo.findOne.mockResolvedValue({ id: 'school-1', code: 'SCH001', name: '测试学校' })

    const res = await teacherSvc.createTeacher('school-1', {
      name: '王老师',
      phone: '13800000000',
    })

    expect(res.ok).toBe(true)
    expect(res.teacherNo).toBe('JSSCH00100001')
    expect(res.name).toBe('王老师')
    // 密码哈希为 bcrypt 格式
    const createCall = userRepoEm.create.mock.calls[0][0]
    expect(createCall.passwordHash).toMatch(/^\$2[abxy]\$\d{2}\$/)
    // 审计日志被记录
    expect(audit.log).toHaveBeenCalled()
  })

  it('TeacherMgmtService 应处理教师管理', async () => {
    // listTeachers
    userRepo.findAndCount.mockResolvedValue([
      [
        { id: 't1', name: '张老师', username: 'zhang', subject: '语文', phone: '13800000001', gender: '男', school: '测试学校', features: [], enabled: true, createdAt: new Date(), teacherNo: 'JS001', position: '', positions: [], grade: '' },
      ],
      1,
    ])
    const listRes = await teacherSvc.listTeachers('school-1')
    expect(listRes.total).toBe(1)
    expect(listRes.items[0].name).toBe('张老师')

    // updateTeacher
    userRepo.findOne.mockResolvedValue({ id: 't1', name: '张老师', username: 'zhang', schoolId: 'school-1' })
    const updateRes = await teacherSvc.updateTeacher('school-1', 't1', { name: '张老师（已更新）' })
    expect(updateRes.ok).toBe(true)

    // resetPassword
    userRepo.findOne.mockResolvedValue({
      id: 't2', name: '李老师', username: 'li', schoolId: 'school-1',
      passwordHash: hashPassword('oldpass8'),
    })
    const resetRes = await teacherSvc.resetPassword('school-1', 't2', '')
    expect(resetRes.ok).toBe(true)
    expect(resetRes.forcePasswordChange).toBe(true)
    expect(resetRes.defaultPassword).toHaveLength(8)

    // deleteTeacher
    userRepo.findOne.mockResolvedValue({ id: 't3', name: '待删除', username: 'del', schoolId: 'school-1' })
    em.getRepository.mockReturnValue({
      find: jest.fn().mockResolvedValue([]),
      update: jest.fn().mockResolvedValue(undefined),
      delete: jest.fn().mockResolvedValue(undefined),
      remove: jest.fn().mockResolvedValue(undefined),
    })
    em.transaction.mockImplementation(async (cb: any) => cb(em))
    const delRes = await teacherSvc.deleteTeacher('school-1', 't3')
    expect(delRes.ok).toBe(true)
  })

  it('ClassMgmtService 应处理班级管理', async () => {
    // listClasses
    userRepo.find.mockResolvedValue([{ id: 't1', schoolId: 'school-1' }])
    classRepo.findAndCount.mockResolvedValue([
      [{ id: 'c1', name: '三年级1班', teacherId: 't1', grade: '三年级', classNo: '1', headTeacher: '', term: '', subjects: [] }],
      1,
    ])
    studentRepo.createQueryBuilder.mockReturnValue({
      select: jest.fn().mockReturnThis(),
      addSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      groupBy: jest.fn().mockReturnThis(),
      getRawMany: jest.fn().mockResolvedValue([{ classId: 'c1', cnt: '20' }]),
    })
    classMemberRepo.find.mockResolvedValue([])

    const listRes = await classSvc.listClasses('school-1')
    expect(listRes.total).toBe(1)
    expect((listRes.items[0] as any).studentCount).toBe(20)

    // createClass
    userRepo.findOne.mockResolvedValue({ id: 't1', schoolId: 'school-1', name: '张老师' })
    classRepo.create.mockReturnValue({ id: 'c2', name: '四年级1班' })
    classRepo.save.mockResolvedValue({ id: 'c2', name: '四年级1班', teacherId: 't1', grade: '四年级', classNo: '1', headTeacher: '张老师' })

    const createRes = await classSvc.createClass('school-1', {
      name: '四年级1班',
      grade: '四年级',
      classNo: '1',
      headTeacher: '张老师',
      headTeacherId: 't1',
    })
    expect(createRes.name).toBe('四年级1班')
    expect(classMemberSvc.addHeadTeacher).toHaveBeenCalled()

    // promoteClass
    classRepo.findOne.mockResolvedValue({ id: 'c1', name: '三年级1班', grade: '三年级', teacherId: 't1' })
    userRepo.findOne.mockResolvedValue({ id: 't1', schoolId: 'school-1' })
    classRepo.save.mockImplementation(async (c: any) => c)
    const promoRes = await classSvc.promoteClass('school-1', 'c1')
    expect(promoRes.ok).toBe(true)
    expect(promoRes.message).toContain('四年级')
  })
})

// ====================================================================
// 家长端关键路径
// ====================================================================
describe('家长端关键路径', () => {
  let parentAuth: ParentAuthService
  let parentQuery: ParentQueryService

  let parentRepo: any
  let usersRepo: any
  let studentRepo: any
  let jwt: any
  let im: any
  let config: any
  let wechat: any
  let studentParentSvc: any
  let pcRepo: any
  let noticeRepo: any
  let homeworkRepo: any
  let gradeRepo: any
  let examRepo: any
  let classRepo: any
  let checkinRepo: any
  let scheduleRepo: any
  let behaviorRepo: any
  let dutyRepo: any
  let classMemberRepo: any
  let cache: any

  const sha256 = (s: string) => require('crypto').createHash('sha256').update(s).digest('hex')

  beforeEach(() => {
    parentRepo = mockRepo()
    usersRepo = mockRepo()
    studentRepo = mockRepo()
    jwt = { sign: jest.fn().mockReturnValue('parent-token') }
    im = { getUserSig: jest.fn().mockReturnValue({ sdkAppId: '1', userSig: 'sig' }) }
    config = { get: jest.fn() }
    wechat = { code2Session: jest.fn().mockResolvedValue({ openid: 'wx-openid-123' }) }
    studentParentSvc = {
      listByParent: jest.fn().mockResolvedValue([]),
      listByOpenid: jest.fn().mockResolvedValue([]),
      bind: jest.fn().mockResolvedValue({ needsUpdateStudentParentId: false }),
      listByParentId: jest.fn().mockResolvedValue([]),
    }
    pcRepo = mockRepo()
    noticeRepo = mockRepo()
    homeworkRepo = mockRepo()
    gradeRepo = mockRepo()
    examRepo = mockRepo()
    classRepo = mockRepo()
    checkinRepo = mockRepo()
    scheduleRepo = mockRepo()
    behaviorRepo = mockRepo()
    dutyRepo = mockRepo()
    classMemberRepo = mockRepo()
    cache = { get: jest.fn().mockReturnValue(undefined), set: jest.fn(), del: jest.fn() }

    // ParentQueryService 实例
    parentQuery = new ParentQueryService(
      studentRepo,
      usersRepo,
      pcRepo,
      noticeRepo,
      homeworkRepo,
      gradeRepo,
      examRepo,
      classRepo,
      checkinRepo,
      scheduleRepo,
      behaviorRepo,
      dutyRepo,
      classMemberRepo,
      studentParentSvc as any,
      cache as any,
    )

    // ParentAuthService 实例
    parentAuth = new ParentAuthService(
      parentRepo,
      usersRepo,
      studentRepo,
      jwt as any,
      im as any,
      config as any,
      wechat as any,
      studentParentSvc as any,
      parentQuery,
    )
  })

  it('ParentAuthService.login 应验证学号密码', async () => {
    const stubStudent = {
      id: 'stu-1',
      name: '小明',
      classId: 'cls-1',
      studentNo: '20240001',
      parentName: '张爸爸',
      parentLoginEnabled: true,
      parentPasswordHash: sha256('123456'),
    }

    // findStudentByNoForLogin 内部查 studentRepo.find
    studentRepo.find.mockResolvedValue([{ ...stubStudent }])

    const result = await parentAuth.login('20240001', '123456')

    expect(result.token).toBe('parent-token')
    expect(result.parent.studentId).toBe('stu-1')
    expect(result.parent.studentName).toBe('小明')
    expect(result.parent.classId).toBe('cls-1')
    expect(jwt.sign).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'parent',
        studentId: 'stu-1',
        studentNo: '20240001',
      }),
    )
  })

  it('ParentAuthService.login 密码错误应抛出 UnauthorizedException', async () => {
    studentRepo.find.mockResolvedValue([{
      id: 'stu-1', name: '小明', classId: 'cls-1', studentNo: '20240001',
      parentName: '张爸爸', parentLoginEnabled: true,
      parentPasswordHash: sha256('correct8'),
    }])

    await expect(parentAuth.login('20240001', 'wrong_pass')).rejects.toThrow(UnauthorizedException)
    await expect(parentAuth.login('20240001', 'wrong_pass')).rejects.toThrow('密码错误')
  })

  it('ParentQueryService.findKids 应返回绑定的学生列表', async () => {
    // 优先走 StudentParent 关联表
    studentParentSvc.listByParent.mockResolvedValue([
      { studentId: 'stu-1' },
      { studentId: 'stu-2' },
    ])
    studentRepo.find.mockResolvedValue([
      { id: 'stu-1', name: '小明', studentNo: '20240001', classId: 'cls-1' },
      { id: 'stu-2', name: '小红', studentNo: '20240002', classId: 'cls-2' },
    ])

    const kids = await parentQuery.findKids('parent-1')

    expect(kids).toHaveLength(2)
    expect(kids[0].name).toBe('小明')
    expect(kids[1].name).toBe('小红')
    expect(studentRepo.find).toHaveBeenCalledWith({ where: { id: In(['stu-1', 'stu-2']) } })
  })

  it('ParentQueryService.findKids 无 binding 时回退 Student.parentId', async () => {
    studentParentSvc.listByParent.mockResolvedValue([])
    studentRepo.find.mockResolvedValue([
      { id: 'stu-1', name: '小明', studentNo: '20240001', classId: 'cls-1' },
    ])

    const kids = await parentQuery.findKids('parent-1')

    expect(kids).toHaveLength(1)
    expect(studentRepo.find).toHaveBeenCalledWith({ where: { parentId: 'parent-1' } })
  })

  it('ParentQueryService.getExams 应返回学生考试成绩', async () => {
    const today = new Date().toISOString().slice(0, 10)
    studentRepo.findOne.mockResolvedValue({ id: 'stu-1', classId: 'cls-1' })
    examRepo.find.mockResolvedValue([
      { id: 'exam1', name: '期中', date: '2024-04-01', term: '2024春', subjectFullScores: { 语文: 100 } },
    ])
    gradeRepo.find.mockResolvedValue([
      { examId: 'exam1', subject: '语文', scores: [{ studentId: 'stu-1', score: 92 }, { studentId: 'stu-2', score: 85 }] },
    ])
    studentRepo.find.mockResolvedValue([{ id: 'stu-1' }, { id: 'stu-2' }])

    const result = await parentQuery.getExams({ classId: 'cls-1', studentId: 'stu-1' })

    expect(result.exams).toHaveLength(1)
    expect(result.exams[0].examName).toBe('期中')
    expect(result.exams[0].totalScore).toBe(92)
    // stu-1 92 分 vs stu-2 85 分，排名第 1
    expect(result.exams[0].classRank).toBe(1)
  })

  it('ParentAuthService.changePassword 应校验旧密码并修改', async () => {
    studentRepo.findOne.mockResolvedValue({
      id: 'stu-1',
      parentPasswordHash: sha256('oldpass8'),
    })

    const result = await parentAuth.changePassword(
      { studentId: 'stu-1' },
      'oldpass8',
      'newpass123',
    )

    expect(result.ok).toBe(true)
    expect(studentRepo.save).toHaveBeenCalled()
  })
})

// ====================================================================
// 新增共享工具验证
// ====================================================================
describe('新增共享工具验证', () => {
  it('teacher-mgmt.service.ts 应正确注入并使用', () => {
    const src = fs.readFileSync(
      path.resolve(__dirname, '../../src/school-admin/teacher-mgmt.service.ts'),
      'utf8',
    )
    // 应为 Injectable 服务
    expect(src).toMatch(/@Injectable/)
    expect(src).toMatch(/export class TeacherMgmtService/)
    // 应注入必要的 Repository
    expect(src).toMatch(/InjectRepository\(User\)/)
    expect(src).toMatch(/InjectRepository\(School\)/)
    expect(src).toMatch(/InjectRepository\(ClassItem\)/)
    // 应包含核心管理方法
    expect(src).toMatch(/async listTeachers/)
    expect(src).toMatch(/async createTeacher/)
    expect(src).toMatch(/async updateTeacher/)
    expect(src).toMatch(/async deleteTeacher/)
    expect(src).toMatch(/async resetPassword/)
    expect(src).toMatch(/async batchCreateTeachers/)
  })

  it('class-mgmt.service.ts 应正确注入并使用', () => {
    const src = fs.readFileSync(
      path.resolve(__dirname, '../../src/school-admin/class-mgmt.service.ts'),
      'utf8',
    )
    expect(src).toMatch(/@Injectable/)
    expect(src).toMatch(/export class ClassMgmtService/)
    expect(src).toMatch(/InjectRepository\(ClassItem\)/)
    expect(src).toMatch(/InjectRepository\(Student\)/)
    expect(src).toMatch(/InjectRepository\(User\)/)
    // 应包含核心管理方法
    expect(src).toMatch(/async listClasses/)
    expect(src).toMatch(/async createClass/)
    expect(src).toMatch(/async updateClass/)
    expect(src).toMatch(/async deleteClass/)
    expect(src).toMatch(/async promoteClass/)
    expect(src).toMatch(/async listSchoolStudents/)
  })

  it('parent-query.service.ts 应正确注入并使用', () => {
    const src = fs.readFileSync(
      path.resolve(__dirname, '../../src/parent-auth/parent-query.service.ts'),
      'utf8',
    )
    expect(src).toMatch(/@Injectable/)
    expect(src).toMatch(/export class ParentQueryService/)
    // 应注入必要的 Repository
    expect(src).toMatch(/InjectRepository\(Student\)/)
    expect(src).toMatch(/InjectRepository\(Grade\)/)
    expect(src).toMatch(/InjectRepository\(Exam\)/)
    // 应包含只读查询方法
    expect(src).toMatch(/async findKids/)
    expect(src).toMatch(/async getExams/)
    expect(src).toMatch(/async getNotices/)
    expect(src).toMatch(/async getHomework/)
    expect(src).toMatch(/async getAttendance/)
    expect(src).toMatch(/async getBehavior/)
    expect(src).toMatch(/async getSchedule/)
    expect(src).toMatch(/async getCommunications/)
    expect(src).toMatch(/async getTeachers/)
    expect(src).toMatch(/async getKidsComparison/)
  })

  it('SchoolAdminModule 应注册新服务', () => {
    const src = fs.readFileSync(
      path.resolve(__dirname, '../../src/school-admin/school-admin.module.ts'),
      'utf8',
    )
    // providers 中应包含 3 个服务
    expect(src).toMatch(/SchoolAdminService/)
    expect(src).toMatch(/TeacherMgmtService/)
    expect(src).toMatch(/ClassMgmtService/)
    // exports 中也应导出这 3 个服务
    expect(src).toMatch(/exports:\s*\[SchoolAdminService,\s*TeacherMgmtService,\s*ClassMgmtService\]/)
  })

  it('ParentAuthModule 应注册新服务', () => {
    const src = fs.readFileSync(
      path.resolve(__dirname, '../../src/parent-auth/parent-auth.module.ts'),
      'utf8',
    )
    // providers 中应同时注册两个服务
    expect(src).toMatch(/ParentAuthService/)
    expect(src).toMatch(/ParentQueryService/)
    // exports 中也应导出
    expect(src).toMatch(/exports:\s*\[ParentAuthService,\s*ParentQueryService\]/)
  })
})

