import 'reflect-metadata'
import { BadRequestException, UnauthorizedException } from '@nestjs/common'
import * as crypto from 'node:crypto'
import { ParentAuthService } from '../src/parent-auth/parent-auth.service'
import { ParentQueryService } from '../src/parent-auth/parent-query.service'

const sha256 = (s: string) => crypto.createHash('sha256').update(s).digest('hex')

/** 构造一个包含常用 Repository 方法的 mock 对象 */
function mockRepo(): any {
  const repo: any = {}
  repo.findOne = jest.fn()
  repo.find = jest.fn()
  repo.findAndCount = jest.fn()
  repo.save = jest.fn()
  repo.remove = jest.fn()
  repo.create = jest.fn()
  repo.delete = jest.fn()
  repo.count = jest.fn()
  repo.createQueryBuilder = jest.fn()
  return repo
}

describe('ParentAuthService（A04拆分后只保留认证/绑定/切换逻辑）', () => {
  let service: ParentAuthService
  let studentRepo: any
  let jwt: any
  let im: any
  let config: any
  let wechat: any
  let query: any

  beforeEach(() => {
    studentRepo = mockRepo()
    jwt = { sign: jest.fn().mockReturnValue('token-abc') }
    im = { getUserSig: jest.fn().mockResolvedValue({ sdkAppId: '1', userSig: 'sig' }) }
    config = { get: jest.fn() }
    wechat = { code2Session: jest.fn() }
    // ParentQueryService mock
    query = {
      findStudentByNoForLogin: jest.fn(),
    }
    service = new ParentAuthService(
      mockRepo(), // parentRepo
      mockRepo(), // usersRepo
      studentRepo,
      jwt as any,
      im as any,
      config as any,
      wechat as any,
      {} as any, // studentParentSvc 占位
      query as any,
    )
  })

  describe('login（密码校验修复：原来无密码可登录，现在要求密码）', () => {
    const stubStudent = {
      id: 'stu-1',
      name: '小明',
      classId: 'cls-1',
      studentNo: '20240001',
      parentName: '张爸爸',
      parentLoginEnabled: true,
      // 家长登录不再支持默认弱密码，必须初始化真实密码哈希
      parentPasswordHash: sha256('123456'),
    }

    it('空密码应抛出 BadRequestException "请输入密码"', async () => {
      query.findStudentByNoForLogin.mockResolvedValue(stubStudent)
      await expect(service.login('20240001', '')).rejects.toThrow('请输入密码')
      await expect(service.login('20240001', '')).rejects.toThrow(BadRequestException)
    })

    it('错误密码应抛出 UnauthorizedException "密码错误"（而非 BadRequest）', async () => {
      query.findStudentByNoForLogin.mockResolvedValue(stubStudent)
      await expect(service.login('20240001', 'wrong')).rejects.toThrow(UnauthorizedException)
      await expect(service.login('20240001', 'wrong')).rejects.toThrow('密码错误')
    })

    it('正确学号 + 正确密码(123456) 返回 token', async () => {
      query.findStudentByNoForLogin.mockResolvedValue(stubStudent)
      jwt.sign.mockReturnValue('token-xyz')

      const res = await service.login('20240001', '123456')

      expect(res.token).toBe('token-xyz')
      expect(res.parent.studentId).toBe('stu-1')
      expect(res.parent.studentName).toBe('小明')
      expect(res.parent.classId).toBe('cls-1')
      expect(res.parent.studentNo).toBe('20240001')
      expect(jwt.sign).toHaveBeenCalledWith(
        expect.objectContaining({
          sub: expect.any(String),
          type: 'parent',
          studentId: 'stu-1',
          studentName: '小明',
          classId: 'cls-1',
          studentNo: '20240001',
        }),
      )
    })

    it('学号不存在应抛出 BadRequestException', async () => {
      query.findStudentByNoForLogin.mockResolvedValue(null)
      await expect(service.login('99999999', '123456')).rejects.toThrow(BadRequestException)
      await expect(service.login('99999999', '123456')).rejects.toThrow('未找到该学号')
    })

    it('parentLoginEnabled=false 应抛出 BadRequestException', async () => {
      query.findStudentByNoForLogin.mockResolvedValue({ ...stubStudent, parentLoginEnabled: false })
      await expect(service.login('20240001', '123456')).rejects.toThrow(BadRequestException)
      await expect(service.login('20240001', '123456')).rejects.toThrow('尚未被老师授权')
    })

    it('非数字学号应抛出 BadRequestException "请输入正确的学号"', async () => {
      await expect(service.login('abc', '123456')).rejects.toThrow('请输入正确的学号')
      await expect(service.login('abc', '123456')).rejects.toThrow(BadRequestException)
    })

    it('空学号也应抛出 "请输入正确的学号"', async () => {
      await expect(service.login('', '123456')).rejects.toThrow('请输入正确的学号')
    })
  })
})

describe('ParentQueryService 拆分验证（原 ParentAuthService 只读查询在此服务）', () => {
  // getExams / getKids / getNotices 等方法已拆分至 ParentQueryService
  // 拆分后的详细测试见 parent-auth-refactor.spec.ts
  it.todo('getExams 行为验证见 parent-auth-refactor.spec.ts')
  it.todo('getKids/findKids 孩子列表查询见 parent-auth-refactor.spec.ts')
  it.todo('getNotices 通知列表查询见 parent-auth-refactor.spec.ts')
  it.todo('getHomework 作业列表查询见 parent-auth-refactor.spec.ts')
  it.todo('getAttendance 考勤查询见 parent-auth-refactor.spec.ts')
  it.todo('getBehavior 行为记录查询见 parent-auth-refactor.spec.ts')
  it.todo('getTeachers 班级老师查询见 parent-auth-refactor.spec.ts')
  it.todo('getSchedule 课程表查询见 parent-auth-refactor.spec.ts')
})
