import 'reflect-metadata'
import fs from 'fs'
import path from 'path'
import { ParentAuthService } from '../src/parent-auth/parent-auth.service'
import { ParentQueryService } from '../src/parent-auth/parent-query.service'
import { ParentAuthModule } from '../src/parent-auth/parent-auth.module'
import { UnauthorizedException, BadRequestException } from '@nestjs/common'
import { hashPassword } from '../src/common/utils/password.util'

/**
 * ParentAuthService 重构验证
 *
 * 重构内容：将家长端只读查询（成绩、考勤、行为、课表、作业、通知等）
 * 从 ParentAuthService 中拆分为独立的 ParentQueryService。
 *
 * ParentAuthService 专注于：登录认证 / 密码修改 / 微信绑定 / 角色切换 等非查询能力。
 * ParentQueryService 封装：所有家长视角的数据读取逻辑。
 *
 * 验证目标：
 * - ParentQueryService 导出只读查询方法
 * - ParentAuthService 保留登录/绑定方法
 * - 两个服务均在 ParentAuthModule 中注册
 */

/** 构造 mock repo */
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

describe('ParentAuthService 重构验证', () => {
  // ========== 源码结构断言 ==========
  describe('源码结构：方法归属正确', () => {
    let authSrc: string
    let querySrc: string

    beforeAll(() => {
      authSrc = fs.readFileSync(
        path.resolve(__dirname, '../src/parent-auth/parent-auth.service.ts'),
        'utf8',
      )
      querySrc = fs.readFileSync(
        path.resolve(__dirname, '../src/parent-auth/parent-query.service.ts'),
        'utf8',
      )
    })

    it('ParentQueryService 应导出只读查询方法', () => {
      expect(querySrc).toMatch(/export class ParentQueryService/)
      expect(querySrc).toMatch(/async findKids/)
      expect(querySrc).toMatch(/async findStudentByNoForLogin/)
      expect(querySrc).toMatch(/async getNotices/)
      expect(querySrc).toMatch(/async getExams/)
      expect(querySrc).toMatch(/async getHomework/)
      expect(querySrc).toMatch(/async getAttendance/)
      expect(querySrc).toMatch(/async getBehavior/)
      expect(querySrc).toMatch(/async getSchedule/)
      expect(querySrc).toMatch(/async getCommunications/)
      expect(querySrc).toMatch(/async getTeachers/)
      expect(querySrc).toMatch(/async getKidsComparison/)
    })

    it('ParentQueryService 应在 ParentAuthModule 中注册', () => {
      const moduleSrc = fs.readFileSync(
        path.resolve(__dirname, '../src/parent-auth/parent-auth.module.ts'),
        'utf8',
      )
      expect(moduleSrc).toMatch(/ParentQueryService/)
      // providers 中包含
      expect(moduleSrc).toMatch(/providers:\s*\[ParentAuthService,\s*ParentQueryService\]/)
      // exports 中也包含
      expect(moduleSrc).toMatch(/exports:\s*\[ParentAuthService,\s*ParentQueryService\]/)
    })

    it('parent-auth.service.ts 应保留登录/绑定方法', () => {
      expect(authSrc).toMatch(/export class ParentAuthService/)
      expect(authSrc).toMatch(/async login/)
      expect(authSrc).toMatch(/async changePassword/)
      expect(authSrc).toMatch(/async getMe/)
      expect(authSrc).toMatch(/async switchStudent/)
      expect(authSrc).toMatch(/async activateParent/)
      expect(authSrc).toMatch(/bindWechat/)
      expect(authSrc).toMatch(/async getBindings/)
      expect(authSrc).toMatch(/subscribe/)
      expect(authSrc).toMatch(/getImUserSig/)
    })

    it('parent-auth.service.ts 不应再包含只读查询方法（已拆分）', () => {
      // 以下方法应有 ParentQueryService 实现，不应再出现在 ParentAuthService
      expect(authSrc).not.toMatch(/async getNotices/)
      expect(authSrc).not.toMatch(/async getHomework/)
      expect(authSrc).not.toMatch(/async getAttendance/)
      expect(authSrc).not.toMatch(/async getBehavior/)
      expect(authSrc).not.toMatch(/async getSchedule/)
      expect(authSrc).not.toMatch(/async getCommunications/)
      expect(authSrc).not.toMatch(/async getTeachers/)
      expect(authSrc).not.toMatch(/async getKidsComparison/)
    })

    it('ParentAuthService 应注入 ParentQueryService 并委托查询', () => {
      // login 中通过 query.findStudentByNoForLogin 查学生
      expect(authSrc).toMatch(/query\.findStudentByNoForLogin/)
      // getMe 中通过 query.findKids 查孩子
      expect(authSrc).toMatch(/query\.findKids/)
      // switchStudent 中通过 query.findKids
      expect(authSrc).toMatch(/query\.findKids/)
      // activateParent
      expect(authSrc).toMatch(/query\.findKids/)
    })

    it('ParentAuthModule 应同时注册 ParentAuthService 和 ParentQueryService', () => {
      const moduleSrc = fs.readFileSync(
        path.resolve(__dirname, '../src/parent-auth/parent-auth.module.ts'),
        'utf8',
      )
      // import 两个服务
      expect(moduleSrc).toMatch(/import.*ParentAuthService.*from.*parent-auth\.service/)
      expect(moduleSrc).toMatch(/import.*ParentQueryService.*from.*parent-query\.service/)
      // providers 中注册两个服务
      expect(moduleSrc).toMatch(/providers:\s*\[ParentAuthService,\s*ParentQueryService\]/)
      // exports 中导出两个服务
      expect(moduleSrc).toMatch(/exports:\s*\[ParentAuthService,\s*ParentQueryService\]/)
    })
  })

  // ========== 行为功能验证 ==========
  describe('行为验证：拆分后双服务可用', () => {
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
      wechat = { code2Session: jest.fn().mockResolvedValue({ openid: 'wx-openid-xyz' }) }
      studentParentSvc = {
        listByParent: jest.fn().mockResolvedValue([]),
        listByOpenid: jest.fn().mockResolvedValue([]),
        bind: jest.fn().mockResolvedValue({ needsUpdateStudentParentId: false }),
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

      parentQuery = new ParentQueryService(
        studentRepo, usersRepo, pcRepo, noticeRepo, homeworkRepo,
        gradeRepo, examRepo, classRepo, checkinRepo, scheduleRepo,
        behaviorRepo, dutyRepo, classMemberRepo,
        studentParentSvc as any, cache as any,
      )

      parentAuth = new ParentAuthService(
        parentRepo, usersRepo, studentRepo,
        jwt as any, im as any, config as any, wechat as any,
        studentParentSvc as any, parentQuery,
      )
    })

    // -- ParentAuthService 核心功能 --
    it('ParentAuthService.login 学号正确+密码正确应返回 token', async () => {
      studentRepo.find.mockResolvedValue([{
        id: 'stu-1', name: '小明', classId: 'cls-1', studentNo: '20240001',
        parentName: '张爸爸', parentLoginEnabled: true,
        parentPasswordHash: sha256('pass1234'),
      }])

      const res = await parentAuth.login('20240001', 'pass1234')
      expect(res.token).toBe('parent-token')
      expect(res.parent.studentId).toBe('stu-1')
      expect(res.parent.studentName).toBe('小明')
    })

    it('ParentAuthService.login 密码错误应抛出 UnauthorizedException', async () => {
      studentRepo.find.mockResolvedValue([{
        id: 'stu-1', name: '小明', classId: 'cls-1', studentNo: '20240001',
        parentName: '张爸爸', parentLoginEnabled: true,
        parentPasswordHash: sha256('pass1234'),
      }])

      await expect(parentAuth.login('20240001', 'wrong_password'))
        .rejects.toThrow(UnauthorizedException)
    })

    it('ParentAuthService.changePassword 校验旧密码后修改', async () => {
      studentRepo.findOne.mockResolvedValue({
        id: 'stu-1', parentPasswordHash: sha256('oldpass8'),
      })

      const res = await parentAuth.changePassword({ studentId: 'stu-1' }, 'oldpass8', 'newpass123')
      expect(res.ok).toBe(true)
      expect(studentRepo.save).toHaveBeenCalled()
    })

    it('ParentAuthService.getMe 返回家长信息及 kids 列表', async () => {
      parentRepo.findOne.mockResolvedValue({
        id: 'parent-1', parentName: '张爸爸', openId: 'wx-openid-bound',
      })
      // findKids 通过 query 内部查
      studentParentSvc.listByParent.mockResolvedValue([{ studentId: 'stu-1' }])
      studentRepo.find.mockResolvedValue([
        { id: 'stu-1', name: '小明', studentNo: '20240001', classId: 'cls-1', gender: '男', birthDate: '', parentName: '张爸爸', parentPhone: '', studentPhone: '', address: '', note: '' },
      ])

      const res = await parentAuth.getMe({ parentId: 'parent-1', studentId: 'stu-1' })

      expect(res).not.toBeNull()
      expect(res!.parentName).toBe('张爸爸')
      expect(res!.kids).toHaveLength(1)
      expect(res!.wechat.bound).toBe(true)
    })

    it('ParentAuthService.switchStudent 应切换激活的孩子并返回新 token', async () => {
      parentRepo.findOne.mockResolvedValue({ id: 'parent-1', parentName: '张爸爸' })
      studentParentSvc.listByParent.mockResolvedValue([
        { studentId: 'stu-1' },
        { studentId: 'stu-2' },
      ])
      studentRepo.find.mockResolvedValue([
        { id: 'stu-1', name: '小明', studentNo: '20240001', classId: 'cls-1' },
        { id: 'stu-2', name: '小红', studentNo: '20240002', classId: 'cls-2' },
      ])

      jwt.sign.mockReturnValue('new-token')

      const res = await parentAuth.switchStudent({ parentId: 'parent-1', studentId: 'stu-1' }, 'stu-2')

      expect(res.token).toBe('new-token')
      expect(res.studentId).toBe('stu-2')
      expect(res.studentName).toBe('小红')
    })

    it('ParentAuthService.bindWechat 应绑定微信', async () => {
      studentRepo.findOne.mockResolvedValue({
        id: 'stu-1', parentName: '张爸爸', classId: 'cls-1', parentId: '', teacherId: 't1',
      })
      parentRepo.findOne.mockResolvedValue(null)
      parentRepo.create.mockReturnValue({ id: 'parent-1', openId: 'wx-openid-xyz' })
      parentRepo.save.mockResolvedValue({ id: 'parent-1', openId: 'wx-openid-xyz' })

      const res = await parentAuth.bindWechat('wx-code', { studentId: 'stu-1' }, '张爸爸')

      expect(res.ok).toBe(true)
      expect(res.openIdTail).toBe('id-xyz')
      expect(res.parentId).toBe('parent-1')
    })

    // -- ParentQueryService 查询功能 --
    it('ParentQueryService.findKids 有 bindings 时应返回绑定学生', async () => {
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
    })

    it('ParentQueryService.findKids 无 bindings 时回退到 Student.parentId', async () => {
      studentParentSvc.listByParent.mockResolvedValue([])
      studentRepo.find.mockResolvedValue([
        { id: 'stu-1', name: '小明', studentNo: '20240001', classId: 'cls-1' },
      ])

      const kids = await parentQuery.findKids('parent-1')
      expect(kids).toHaveLength(1)
    })

    it('ParentQueryService.getExams 应返回考试成绩', async () => {
      studentRepo.findOne.mockResolvedValue({ id: 'stu-1', classId: 'cls-1' })
      examRepo.find.mockResolvedValue([
        { id: 'exam1', name: '期中', date: '2024-04-01', term: '2024春', subjectFullScores: { 语文: 100 } },
      ])
      gradeRepo.find.mockResolvedValue([
        { examId: 'exam1', subject: '语文', scores: [{ studentId: 'stu-1', score: 92 }, { studentId: 'stu-2', score: 85 }] },
      ])
      studentRepo.find.mockResolvedValue([{ id: 'stu-1' }, { id: 'stu-2' }])

      const res = await parentQuery.getExams({ classId: 'cls-1', studentId: 'stu-1' })
      expect(res.exams).toHaveLength(1)
      expect(res.exams[0].totalScore).toBe(92)
      expect(res.exams[0].classRank).toBe(1) // 92 最高
    })

    it('ParentQueryService.getNotices 应返回班级通知列表', async () => {
      noticeRepo.find.mockResolvedValue([
        { id: 'n1', title: '通知1', content: '内容', classId: 'cls-1', pinned: false, ended: false, createdAt: new Date() },
      ])

      const res = await parentQuery.getNotices('cls-1')
      expect(res).toHaveLength(1)
      expect(res[0].title).toBe('通知1')
    })

    it('ParentQueryService.getHomework 应返回班级作业列表', async () => {
      studentRepo.findOne.mockResolvedValue({ id: 'stu-1', classId: 'cls-1' })
      homeworkRepo.find.mockResolvedValue([
        { id: 'h1', subject: '语文', title: '作业1', content: '内容', startDate: '', deadline: '', status: '待批改' },
      ])

      const res = await parentQuery.getHomework({ classId: 'cls-1', studentId: 'stu-1' })
      expect(res).toHaveLength(1)
      expect(res[0].title).toBe('作业1')
    })

    it('ParentQueryService.getAttendance 应返回考勤汇总', async () => {
      checkinRepo.find.mockResolvedValue([
        { id: 'c1', type: 'reading', date: '2024-01-01', count: 1, note: '' },
        { id: 'c2', type: 'sport', date: '2024-01-02', count: 1, note: '' },
      ])

      const res = await parentQuery.getAttendance({ studentId: 'stu-1' })
      expect(res.total).toBe(2)
      expect(summaryReader(res.summary)).toBeDefined()
    })

    it('ParentQueryService.getBehavior 应返回行为记录汇总', async () => {
      behaviorRepo.find.mockResolvedValue([
        { id: 'b1', date: '2024-01-01', behavior: '表扬：优秀表现', note: '' },
        { id: 'b2', date: '2024-01-02', behavior: '违纪：迟到', note: '' },
      ])

      const res = await parentQuery.getBehavior({ studentId: 'stu-1' })
      expect(res.total).toBe(2)
      expect(res.summary.praise).toBe(1)
      expect(res.summary.violation).toBe(1)
    })

    it('ParentQueryService.getTeachers 应返回班级科任老师信息', async () => {
      classMemberRepo.find.mockResolvedValue([
        { teacherId: 't1', role: 'head', subjects: ['语文'] },
        { teacherId: 't2', role: 'subject', subjects: ['数学'] },
      ])
      usersRepo.find.mockResolvedValue([
        { id: 't1', name: '张老师', subject: '语文', phone: '13800000001', avatar: '' },
        { id: 't2', name: '李老师', subject: '数学', phone: '13800000002', avatar: '' },
      ])

      const res = await parentQuery.getTeachers({ classId: 'cls-1' })
      expect(res).toHaveLength(2)
      expect(res[0].roleLabel).toBe('班主任')
      expect(res[1].roleLabel).toBe('科任老师')
    })

    it('两个服务均为可实例化的独立类', () => {
      expect(typeof ParentAuthService).toBe('function')
      expect(typeof ParentQueryService).toBe('function')
      expect(parentAuth).toBeInstanceOf(ParentAuthService)
      expect(parentQuery).toBeInstanceOf(ParentQueryService)
    })
  })
})

function summaryReader(s: any): any { return s }
