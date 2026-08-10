import { Test } from '@nestjs/testing'
import { Reflector } from '@nestjs/core'
import { JwtService } from '@nestjs/jwt'
import { getRepositoryToken } from '@nestjs/typeorm'
import { UnauthorizedException } from '@nestjs/common'
import { JwtAuthGuard } from './jwt-auth.guard'
import { User } from '../../users/user.entity'
import { SchoolAdmin } from '../../school-admin/school-admin.entity'
import { Student } from '../../students/student.entity'

describe('JwtAuthGuard', () => {
  let guard: JwtAuthGuard
  const userRepo = { findOne: jest.fn() }
  const saRepo = { findOne: jest.fn() }
  const studentRepo = { findOne: jest.fn() }
  const reflector = { getAllAndOverride: jest.fn().mockReturnValue(undefined) }

  const makeCtx = (overrides: any = {}) => {
    const req: any = {
      headers: {},
      user: undefined,
      ...overrides.req,
    }
    return {
      switchToHttp: () => ({ getRequest: () => req }),
      getHandler: () => ({}),
      getClass: () => ({}),
    } as any
  }

  beforeEach(async () => {
    jest.clearAllMocks()
    const moduleRef = await Test.createTestingModule({
      providers: [
        JwtAuthGuard,
        { provide: JwtService, useValue: { verify: jest.fn() } },
        { provide: Reflector, useValue: reflector },
        { provide: getRepositoryToken(User), useValue: userRepo },
        { provide: getRepositoryToken(SchoolAdmin), useValue: saRepo },
        { provide: getRepositoryToken(Student), useValue: studentRepo },
      ],
    }).compile()
    guard = moduleRef.get(JwtAuthGuard)
    ;(guard as any).jwt = { verify: jest.fn() }
  })

  it('无 Authorization 头时拒绝（未登录或缺少令牌）', async () => {
    await expect(guard.canActivate(makeCtx())).rejects.toThrow('未登录或缺少令牌')
  })

  it('Authorization 无 Bearer 前缀时拒绝', async () => {
    await expect(guard.canActivate(makeCtx({ req: { headers: { authorization: 'Token abc' } } }))).rejects.toThrow(
      '未登录或缺少令牌',
    )
  })

  it('令牌无效/过期时拒绝', async () => {
    ;(guard as any).jwt.verify.mockImplementation(() => {
      throw new Error('jwt expired')
    })
    await expect(guard.canActivate(makeCtx({ req: { headers: { authorization: 'Bearer bad' } } }))).rejects.toThrow(
      '登录已过期，请重新登录',
    )
  })

  it('teacher 令牌且账号被禁用时立即拒绝', async () => {
    ;(guard as any).jwt.verify.mockReturnValue({ sub: 1, role: 'teacher' })
    userRepo.findOne.mockResolvedValue({ id: 1, enabled: false })
    await expect(guard.canActivate(makeCtx({ req: { headers: { authorization: 'Bearer ok' } } }))).rejects.toThrow(
      '账号已被禁用',
    )
  })

  it('teacher 令牌且账号存在未禁用时放行', async () => {
    ;(guard as any).jwt.verify.mockReturnValue({ sub: 1, role: 'teacher' })
    userRepo.findOne.mockResolvedValue({ id: 1, enabled: true })
    await expect(guard.canActivate(makeCtx({ req: { headers: { authorization: 'Bearer ok' } } }))).resolves.toBe(true)
  })

  it('school_admin 令牌且账号被禁用时拒绝', async () => {
    ;(guard as any).jwt.verify.mockReturnValue({ sub: 2, role: 'school_admin' })
    saRepo.findOne.mockResolvedValue({ id: 2, enabled: false })
    await expect(guard.canActivate(makeCtx({ req: { headers: { authorization: 'Bearer ok' } } }))).rejects.toThrow(
      '账号已被禁用',
    )
  })

  it('parent 令牌映射 type=parent -> role=parent 且学生存在时放行', async () => {
    ;(guard as any).jwt.verify.mockReturnValue({ sub: 3, type: 'parent', studentId: 9 })
    studentRepo.findOne.mockResolvedValue({ id: 9, parentLoginEnabled: true })
    const ctx = makeCtx({ req: { headers: { authorization: 'Bearer ok' } } })
    await expect(guard.canActivate(ctx)).resolves.toBe(true)
    expect(ctx.switchToHttp().getRequest().user.role).toBe('parent')
  })

  it('parent 令牌但学生不存在或家长登录关闭时拒绝', async () => {
    ;(guard as any).jwt.verify.mockReturnValue({ sub: 3, type: 'parent', studentId: 9 })
    studentRepo.findOne.mockResolvedValue(null)
    await expect(guard.canActivate(makeCtx({ req: { headers: { authorization: 'Bearer ok' } } }))).rejects.toThrow(
      '家长登录已关闭或学生不存在',
    )
  })

  it('@Roles 声明但角色不匹配时拒绝', async () => {
    ;(guard as any).jwt.verify.mockReturnValue({ sub: 1, role: 'teacher' })
    userRepo.findOne.mockResolvedValue({ id: 1, enabled: true })
    reflector.getAllAndOverride.mockReturnValue(['super'])
    await expect(guard.canActivate(makeCtx({ req: { headers: { authorization: 'Bearer ok' } } }))).rejects.toThrow(
      '权限不足',
    )
  })

  it('@Roles 声明且角色匹配时放行', async () => {
    ;(guard as any).jwt.verify.mockReturnValue({ sub: 1, role: 'teacher' })
    userRepo.findOne.mockResolvedValue({ id: 1, enabled: true })
    reflector.getAllAndOverride.mockReturnValue(['teacher', 'super'])
    await expect(guard.canActivate(makeCtx({ req: { headers: { authorization: 'Bearer ok' } } }))).resolves.toBe(true)
  })

  it('超管令牌（无库校验角色）放行', async () => {
    ;(guard as any).jwt.verify.mockReturnValue({ sub: 99, role: 'super' })
    await expect(guard.canActivate(makeCtx({ req: { headers: { authorization: 'Bearer ok' } } }))).resolves.toBe(true)
  })
})
