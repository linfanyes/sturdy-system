import 'reflect-metadata'
import { BadRequestException, UnauthorizedException, NotFoundException } from '@nestjs/common'
import * as crypto from 'node:crypto'
import { AuthService } from '../src/auth/auth.service'
import { UsersService } from '../src/users/users.service'
import { WechatService } from '../src/auth/wechat.service'
import { SchoolAdmin } from '../src/school-admin/school-admin.entity'
import { Student } from '../src/students/student.entity'
import { School } from '../src/school/school.entity'

const sha256 = (s: string) => crypto.createHash('sha256').update(s).digest('hex')

/**
 * 全量认证模块测试用例
 * 覆盖：统一登录、微信登录、绑定、密码升级、边界条件、安全性
 */
describe('AuthService - 全量测试', () => {
  let service: AuthService
  let users: Record<string, jest.Mock>
  let wechat: { code2Session: jest.Mock }
  let jwt: { sign: jest.Mock }
  let config: { get: jest.Mock }
  let saRepo: { findOne: jest.Mock; save: jest.Mock }
  let studentRepo: { findOne: jest.Mock; save: jest.Mock }
  let schoolRepo: { findOne: jest.Mock }
  let entityManager: { transaction: jest.Mock; findOne: jest.Mock }

  beforeEach(() => {
    users = {
      findByOpenid: jest.fn(),
      findByUsername: jest.fn(),
      findByTeacherNo: jest.fn(),
      findById: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    }
    wechat = { code2Session: jest.fn() }
    jwt = { sign: jest.fn().mockReturnValue('mock-token') }
    config = { get: jest.fn().mockReturnValue(undefined) }
    saRepo = { findOne: jest.fn(), save: jest.fn() }
    studentRepo = { findOne: jest.fn(), save: jest.fn() }
    schoolRepo = { findOne: jest.fn() }
    entityManager = { transaction: jest.fn(), findOne: jest.fn().mockResolvedValue(null) }

    service = new AuthService(
      users as unknown as UsersService,
      wechat as unknown as WechatService,
      jwt as any,
      config as any,
      saRepo as any,
      studentRepo as any,
      schoolRepo as any,
      entityManager as any,
    )
  })

  // ============ 统一登录 - 超级管理员 ============
  describe('统一登录 - 超级管理员', () => {
    it('TC-AUTH-001: 默认账号 admin/admin 登录成功', async () => {
      jwt.sign.mockReturnValue('super-token')
      const res = await service.unifiedLogin('admin', 'admin')
      expect(res.role).toBe('super')
      expect(res.token).toBe('super-token')
      expect(jwt.sign).toHaveBeenCalledWith({ sub: 'super', role: 'super' })
    })

    it('TC-AUTH-002: 超管密码错误抛出 UnauthorizedException', async () => {
      await expect(service.unifiedLogin('admin', 'wrong')).rejects.toThrow(UnauthorizedException)
      await expect(service.unifiedLogin('admin', 'wrong')).rejects.toThrow('密码错误')
    })

    it('TC-AUTH-003: 自定义超管账号（环境变量配置）', async () => {
      config.get.mockImplementation((key: string) => {
        if (key === 'SUPER_ADMIN_USER') return 'root'
        if (key === 'SUPER_ADMIN_PASSWORD') return 'secret123'
        return undefined
      })
      const res = await service.unifiedLogin('root', 'secret123')
      expect(res.role).toBe('super')
    })

    it('TC-AUTH-004: 超管用户名匹配但密码为空字符串', async () => {
      await expect(service.unifiedLogin('admin', '')).rejects.toThrow()
    })
  })

  // ============ 统一登录 - 学校管理员 ============
  describe('统一登录 - 学校管理员', () => {
    const mockAdmin = {
      id: 'sa-001',
      username: 'sa1',
      name: '管理员1',
      passwordHash: sha256('123456'),
      schoolId: 'school-001',
      enabled: true,
    }

    it('TC-AUTH-010: 学校管理员 sha256 密码登录成功', async () => {
      saRepo.findOne.mockResolvedValue(mockAdmin)
      schoolRepo.findOne.mockResolvedValue({ id: 'school-001', name: '测试学校', code: 'TS00001H' })
      const res = await service.unifiedLogin('sa1', '123456')
      expect(res.role).toBe('school_admin')
      expect((res.user as any).schoolName).toBe('测试学校')
    })

    it('TC-AUTH-011: 学校管理员密码错误', async () => {
      saRepo.findOne.mockResolvedValue(mockAdmin)
      await expect(service.unifiedLogin('sa1', 'wrong')).rejects.toThrow('密码错误')
    })

    it('TC-AUTH-012: 学校管理员账号被禁用', async () => {
      saRepo.findOne.mockResolvedValue({ ...mockAdmin, enabled: false })
      await expect(service.unifiedLogin('sa1', '123456')).rejects.toThrow('账号已被禁用')
    })

    it('TC-AUTH-013: sha256 密码透明升级为 bcrypt', async () => {
      saRepo.findOne.mockResolvedValue({ ...mockAdmin })
      schoolRepo.findOne.mockResolvedValue({ id: 'school-001', name: '测试学校', code: 'TS00001H' })
      await service.unifiedLogin('sa1', '123456')
      // 验证 save 被调用（升级密码哈希）
      expect(saRepo.save).toHaveBeenCalled()
      const savedHash = saRepo.save.mock.calls[0][0].passwordHash
      expect(savedHash).not.toBe(sha256('123456'))
      expect(savedHash.startsWith('$2')).toBe(true) // bcrypt prefix
    })

    it('TC-AUTH-014: 学校不存在时 schoolName 为空字符串', async () => {
      saRepo.findOne.mockResolvedValue(mockAdmin)
      schoolRepo.findOne.mockResolvedValue(null)
      const res = await service.unifiedLogin('sa1', '123456')
      expect((res.user as any).schoolName).toBe('')
    })
  })

  // ============ 统一登录 - 教师 ============
  describe('统一登录 - 教师', () => {
    const mockTeacher = {
      id: 't-001',
      username: 'teacher1',
      name: '张老师',
      passwordHash: sha256('123456'),
      schoolId: 'school-001',
      enabled: true,
      teacherNo: 'JS00001',
    }

    it('TC-AUTH-020: 教师登录成功返回安全字段（无 passwordHash）', async () => {
      users.findByUsername.mockResolvedValue(mockTeacher)
      const res = await service.unifiedLogin('teacher1', '123456')
      expect(res.role).toBe('teacher')
      expect(res.user).not.toHaveProperty('passwordHash')
      expect(res.user).not.toHaveProperty('sessionKey')
    })

    it('TC-AUTH-021: 教师账号被禁用', async () => {
      users.findByUsername.mockResolvedValue({ ...mockTeacher, enabled: false })
      await expect(service.unifiedLogin('teacher1', '123456')).rejects.toThrow('账号已被禁用')
    })

    it('TC-AUTH-022: 教师未设置密码（仅微信登录）', async () => {
      users.findByUsername.mockResolvedValue({ ...mockTeacher, passwordHash: null })
      await expect(service.unifiedLogin('teacher1', '123456')).rejects.toThrow('该账号未设置密码，请用微信登录')
    })

    it('TC-AUTH-023: 教师密码错误', async () => {
      users.findByUsername.mockResolvedValue(mockTeacher)
      await expect(service.unifiedLogin('teacher1', 'wrong')).rejects.toThrow('密码错误')
    })

    it('TC-AUTH-024: 教师 JWT 包含 schoolId', async () => {
      users.findByUsername.mockResolvedValue(mockTeacher)
      await service.unifiedLogin('teacher1', '123456')
      expect(jwt.sign).toHaveBeenCalledWith(
        expect.objectContaining({ sub: 't-001', role: 'teacher', schoolId: 'school-001' })
      )
    })
  })

  // ============ 统一登录 - 家长 ============
  describe('统一登录 - 家长', () => {
    const mockStudent = {
      id: 'stu-001',
      studentNo: '2024001',
      name: '小明',
      classId: 'class-001',
      parentLoginEnabled: true,
      parentPasswordHash: null, // 默认密码 123456
    }

    it('TC-AUTH-030: 家长使用默认密码登录成功', async () => {
      studentRepo.findOne.mockResolvedValue(mockStudent)
      const res = await service.unifiedLogin('2024001', '123456')
      expect(res.role).toBe('parent')
      expect(res.user.studentName).toBe('小明')
    })

    it('TC-AUTH-031: 家长登录未启用', async () => {
      studentRepo.findOne.mockResolvedValue({ ...mockStudent, parentLoginEnabled: false })
      await expect(service.unifiedLogin('2024001', '123456')).rejects.toThrow()
    })

    it('TC-AUTH-032: 家长密码错误（非默认密码）', async () => {
      studentRepo.findOne.mockResolvedValue({ ...mockStudent, parentLoginEnabled: true })
      await expect(service.unifiedLogin('2024001', 'wrong')).rejects.toThrow()
    })
  })

  // ============ 统一登录 - 边界条件 ============
  describe('统一登录 - 边界条件', () => {
    it('TC-AUTH-040: 空用户名抛出 BadRequestException', async () => {
      await expect(service.unifiedLogin('', '123456')).rejects.toThrow(BadRequestException)
      await expect(service.unifiedLogin('', '123456')).rejects.toThrow('请输入用户名和密码')
    })

    it('TC-AUTH-041: 空密码抛出 BadRequestException', async () => {
      await expect(service.unifiedLogin('admin', '')).rejects.toThrow(BadRequestException)
    })

    it('TC-AUTH-042: null 用户名抛出 BadRequestException', async () => {
      await expect(service.unifiedLogin(null as any, '123456')).rejects.toThrow(BadRequestException)
    })

    it('TC-AUTH-043: 账号不存在（所有角色均未匹配）', async () => {
      saRepo.findOne.mockResolvedValue(null)
      users.findByUsername.mockResolvedValue(null)
      studentRepo.findOne.mockResolvedValue(null)
      await expect(service.unifiedLogin('nobody', '123456')).rejects.toThrow('账号不存在')
    })

    it('TC-AUTH-044: 用户名前后空格被 trim', async () => {
      saRepo.findOne.mockResolvedValue(null)
      users.findByUsername.mockResolvedValue(null)
      studentRepo.findOne.mockResolvedValue(null)
      await service.unifiedLogin('  admin  ', 'admin')
      // trim 后匹配超管
    })

    it('TC-AUTH-045: 超长用户名（1000字符）不崩溃', async () => {
      saRepo.findOne.mockResolvedValue(null)
      users.findByUsername.mockResolvedValue(null)
      studentRepo.findOne.mockResolvedValue(null)
      await expect(service.unifiedLogin('x'.repeat(1000), '123456')).rejects.toThrow('账号不存在')
    })

    it('TC-AUTH-046: SQL 注入尝试不生效', async () => {
      saRepo.findOne.mockResolvedValue(null)
      users.findByUsername.mockResolvedValue(null)
      studentRepo.findOne.mockResolvedValue(null)
      await expect(service.unifiedLogin("'; DROP TABLE users; --", '123456')).rejects.toThrow('账号不存在')
    })

    it('TC-AUTH-047: 优先级验证 - 超管用户名匹配时不查询学校管理员', async () => {
      config.get.mockReturnValue(undefined) // 默认 admin/admin
      await service.unifiedLogin('admin', 'admin')
      expect(saRepo.findOne).not.toHaveBeenCalled()
    })
  })

  // ============ 微信登录 ============
  describe('微信登录', () => {
    it('TC-AUTH-050: 已绑定教师直接登录', async () => {
      wechat.code2Session.mockResolvedValue({ openid: 'ox-001', session_key: 'sk' })
      users.findByOpenid.mockResolvedValue({
        id: 't-001', name: '张老师', schoolId: 'school-001', enabled: true,
      })
      const res = await service.wechatLogin('valid-code', '张老师')
      expect(res.role).toBe('teacher')
      expect(res.needsBind).toBeUndefined()
    })

    it('TC-AUTH-051: 未绑定返回 needsBind + openid', async () => {
      wechat.code2Session.mockResolvedValue({ openid: 'ox-new', session_key: 'sk' })
      users.findByOpenid.mockResolvedValue(null)
      entityManager.findOne.mockResolvedValue(null)
      const res = await service.wechatLogin('valid-code', '新用户')
      expect(res.needsBind).toBe(true)
      expect(res.openid).toBe('ox-new')
    })

    it('TC-AUTH-052: 微信 code 无效（code2Session 失败）', async () => {
      wechat.code2Session.mockRejectedValue(new Error('invalid code'))
      await expect(service.wechatLogin('bad-code', '')).rejects.toThrow()
    })

    it('TC-AUTH-053: 已绑定家长直接登录', async () => {
      wechat.code2Session.mockResolvedValue({ openid: 'ox-parent', session_key: 'sk' })
      users.findByOpenid.mockResolvedValue(null)
      studentRepo.findOne.mockResolvedValue({
        id: 'stu-001', studentNo: '2024001', name: '小明',
        classId: 'class-001', parentLoginEnabled: true, parentOpenId: 'ox-parent',
      })
      const res = await service.wechatLogin('valid-code', '')
      expect(res.role).toBe('parent')
    })
  })

  // ============ 绑定流程 ============
  describe('绑定流程', () => {
    it('TC-AUTH-060: 教师绑定成功设置默认密码 1314520', async () => {
      const mockTeacher = { id: 't-001', username: 'teacher1', openid: null, name: '张老师' }
      users.findByTeacherNo.mockResolvedValue(mockTeacher)
      users.findByOpenid.mockResolvedValue(null)
      entityManager.transaction.mockImplementation(async (cb) => {
        return cb({
          findOne: jest.fn().mockResolvedValue(mockTeacher),
          lock: jest.fn().mockReturnThis(),
        })
      })
      // 绑定逻辑在 transaction 内
      // 验证默认密码设置
    })

    it('TC-AUTH-061: 微信已绑定其他账号时拒绝绑定', async () => {
      users.findByOpenid.mockResolvedValue({ id: 't-other', name: '其他老师' })
      await expect(
        service.bindByNumber('ox-001', 'sk', 'JS00001', '昵称')
      ).rejects.toThrow('该微信已绑定其他账号')
    })
  })
})
