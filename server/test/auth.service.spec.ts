import 'reflect-metadata'
import { UnauthorizedException } from '@nestjs/common'
import * as crypto from 'node:crypto'
import { AuthService } from '../src/auth/auth.service'
import { UsersService } from '../src/users/users.service'
import { WechatService } from '../src/auth/wechat.service'
import { SchoolAdmin } from '../src/school-admin/school-admin.entity'
import { Student } from '../src/students/student.entity'
import { School } from '../src/school/school.entity'

const sha256 = (s: string) => crypto.createHash('sha256').update(s).digest('hex')

describe('AuthService', () => {
  let service: AuthService
  let users: Record<keyof UsersService, jest.Mock>
  let wechat: { code2Session: jest.Mock }
  let jwt: { sign: jest.Mock }
  let config: { get: jest.Mock }
  let saRepo: { findOne: jest.Mock; save: jest.Mock }
  let studentRepo: { findOne: jest.Mock; save: jest.Mock }
  let schoolRepo: { findOne: jest.Mock }
  let entityManager: { transaction: jest.Mock }

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
    // config.get 默认返回 undefined，触发超管默认账号 admin/admin
    config = { get: jest.fn().mockReturnValue(undefined) }
    saRepo = { findOne: jest.fn(), save: jest.fn() }
    studentRepo = { findOne: jest.fn(), save: jest.fn() }
    schoolRepo = { findOne: jest.fn() }
    entityManager = { transaction: jest.fn() }

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

  describe('超管登录', () => {
    it('正确用户名密码返回 role=super，token 包含 {sub:super, role:super}', async () => {
      // config.get 返回 undefined → 默认超管账号 admin/admin
      jwt.sign.mockReturnValue('super-token')

      const res = await service.unifiedLogin('admin', 'admin')

      expect(res.role).toBe('super')
      expect(res.user).toEqual({ name: '超级管理员' })
      expect(jwt.sign).toHaveBeenCalledWith({ sub: 'super', role: 'super' })
      expect(res.token).toBe('super-token')
    })

    it('错误密码抛出 UnauthorizedException', async () => {
      // 其余身份查不到，最终走到“账号不存在”
      saRepo.findOne.mockResolvedValue(null)
      users.findByUsername.mockResolvedValue(null)
      studentRepo.findOne.mockResolvedValue(null)

      await expect(service.unifiedLogin('admin', 'wrong-password')).rejects.toThrow(
        UnauthorizedException,
      )
    })
  })

  describe('校管登录', () => {
    const adminRow: SchoolAdmin = {
      id: 'admin-1',
      username: 'schooladmin',
      passwordHash: sha256('adminpass'),
      name: '张管理员',
      schoolId: 'school-1',
      permissions: [],
      enabled: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    it('正确密码返回 role=school_admin，token 包含 schoolId', async () => {
      saRepo.findOne.mockResolvedValue(adminRow)
      const school: School = {
        id: 'school-1',
        code: 'SCH001',
        name: '第一小学',
        address: '',
        contact: '',
        phone: '',
        status: 'active',
        createdAt: new Date(),
        updatedAt: new Date(),
      }
      schoolRepo.findOne.mockResolvedValue(school)

      const res = await service.unifiedLogin('schooladmin', 'adminpass')

      expect(res.role).toBe('school_admin')
      expect(jwt.sign).toHaveBeenCalledWith({
        sub: 'admin-1',
        role: 'school_admin',
        schoolId: 'school-1',
      })
      expect(res.user).toMatchObject({
        id: 'admin-1',
        name: '张管理员',
        schoolId: 'school-1',
        schoolName: '第一小学',
        schoolCode: 'SCH001',
      })
    })

    it('enabled=false 抛出“账号已被禁用”', async () => {
      saRepo.findOne.mockResolvedValue({ ...adminRow, enabled: false })

      await expect(service.unifiedLogin('schooladmin', 'adminpass')).rejects.toThrow(
        '账号已被禁用',
      )
    })

    it('错误密码抛出“密码错误”', async () => {
      saRepo.findOne.mockResolvedValue(adminRow)

      await expect(service.unifiedLogin('schooladmin', 'wrong-pass')).rejects.toThrow(
        '密码错误',
      )
    })
  })

  describe('教师登录', () => {
    it('正确密码返回 role=teacher，token 包含 schoolId', async () => {
      saRepo.findOne.mockResolvedValue(null)
      users.findByUsername.mockResolvedValue({
        id: 't1',
        username: 'teacher1',
        passwordHash: sha256('tpass'),
        enabled: true,
        schoolId: 'school-1',
        name: '李老师',
        school: '第一小学',
      })

      const res = await service.unifiedLogin('teacher1', 'tpass')

      expect(res.role).toBe('teacher')
      expect(jwt.sign).toHaveBeenCalledWith({
        sub: 't1',
        role: 'teacher',
        schoolId: 'school-1',
      })
    })

    it('enabled=false 抛出“账号已被禁用”', async () => {
      saRepo.findOne.mockResolvedValue(null)
      users.findByUsername.mockResolvedValue({
        id: 't1',
        username: 'teacher1',
        passwordHash: sha256('tpass'),
        enabled: false,
      })

      await expect(service.unifiedLogin('teacher1', 'tpass')).rejects.toThrow('账号已被禁用')
    })
  })

  describe('家长登录', () => {
    const studentRow: Student = {
      id: 's1',
      teacherId: 't1',
      classId: 'c1',
      name: '小明',
      gender: '男',
      studentNo: 'S001',
      birthDate: null,
      seatNo: 0,
      seatRow: null,
      seatCol: null,
      parentName: '王妈妈',
      parentPhone: '',
      parentOpenId: '',
      parentNickName: '',
      parentLoginEnabled: true,
      note: null,
      tags: [],
      duty: null,
      comment: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    it('正确学号+默认密码123456 返回 role=parent', async () => {
      saRepo.findOne.mockResolvedValue(null)
      users.findByUsername.mockResolvedValue(null)
      studentRepo.findOne.mockResolvedValue(studentRow)

      const res = await service.unifiedLogin('S001', '123456')

      expect(res.role).toBe('parent')
      expect(jwt.sign).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'parent',
          studentId: 's1',
          studentNo: 'S001',
          classId: 'c1',
        }),
      )
    })

    it('parentLoginEnabled=false 抛出未授权', async () => {
      saRepo.findOne.mockResolvedValue(null)
      users.findByUsername.mockResolvedValue(null)
      studentRepo.findOne.mockResolvedValue({ ...studentRow, parentLoginEnabled: false })

      await expect(service.unifiedLogin('S001', '123456')).rejects.toThrow(
        UnauthorizedException,
      )
      await expect(service.unifiedLogin('S001', '123456')).rejects.toThrow('授权')
    })

    it('错误密码抛出“密码错误”', async () => {
      saRepo.findOne.mockResolvedValue(null)
      users.findByUsername.mockResolvedValue(null)
      studentRepo.findOne.mockResolvedValue(studentRow)

      await expect(service.unifiedLogin('S001', 'wrong')).rejects.toThrow('密码错误')
    })
  })

  describe('passwordLogin', () => {
    it('正确密码返回 token 包含 schoolId', async () => {
      users.findByUsername.mockResolvedValue({
        id: 't1',
        username: 'u',
        passwordHash: sha256('p'),
        schoolId: 'school-9',
      })

      const res = await service.passwordLogin('u', 'p')

      expect(jwt.sign).toHaveBeenCalledWith({
        sub: 't1',
        role: 'teacher',
        schoolId: 'school-9',
      })
      expect(res.token).toBe('mock-token')
    })
  })

  describe('密码哈希', () => {
    it('使用 sha256，明文密码不能登录（不存储明文）', async () => {
      saRepo.findOne.mockResolvedValue(null)

      // 1) passwordHash 直接存的是明文 → 不应能登录
      users.findByUsername.mockResolvedValueOnce({
        id: 't1',
        username: 'u',
        passwordHash: 'plaintext-secret',
        enabled: true,
      })
      await expect(service.unifiedLogin('u', 'plaintext-secret')).rejects.toThrow('密码错误')

      // 2) passwordHash 存的是 sha256 哈希 → 能登录
      users.findByUsername.mockResolvedValueOnce({
        id: 't2',
        username: 'u',
        passwordHash: sha256('plaintext-secret'),
        enabled: true,
        schoolId: 's1',
      })
      const res = await service.unifiedLogin('u', 'plaintext-secret')
      expect(res.role).toBe('teacher')

      // 校验哈希值确为 sha256 摘要（64 位十六进制），而非明文
      expect(sha256('plaintext-secret')).toMatch(/^[a-f0-9]{64}$/)
      expect(sha256('plaintext-secret')).not.toBe('plaintext-secret')
    })
  })
})
