import 'reflect-metadata'
import { BadRequestException, HttpException } from '@nestjs/common'
import { AdminService } from '../src/admin/admin.service'
import { SchoolAdmin } from '../src/school-admin/school-admin.entity'
import { isBcryptHash, verifyAndUpgrade } from '../src/common/utils/password.util'
import { BusinessException } from '../src/common/exceptions/business.exception'

function buildService() {
  const jwt = { sign: jest.fn().mockReturnValue('mock-token') }
  const config = { get: jest.fn().mockReturnValue(undefined) }
  const userRepo = { count: jest.fn(), findOne: jest.fn(), save: jest.fn(), create: jest.fn(), update: jest.fn() }
  const schoolRepo = { findOne: jest.fn() }
  const saRepo = {
    findOne: jest.fn(),
    save: jest.fn((x: any) => Promise.resolve(x)),
    create: jest.fn((x: any) => x),
    delete: jest.fn(),
  }
  const classRepo = { find: jest.fn() }
  const studentRepo = { findOne: jest.fn() }
  const gradeRepo = { find: jest.fn() }
  const examRepo = { find: jest.fn() }
  const entityManager = { transaction: jest.fn() }
  const audit = { log: jest.fn() }
  // ResourceLibraryService / TextbookService 占位（seed 测试不调用）
  const resourceLib = { seedDefaults: jest.fn() }
  const textbook = { seedDefaults: jest.fn() }

  const service = new AdminService(
    config as any,
    jwt as any,
    userRepo as any,
    schoolRepo as any,
    saRepo as any,
    classRepo as any,
    studentRepo as any,
    gradeRepo as any,
    examRepo as any,
    entityManager as any,
    audit as any,
    resourceLib as any,
    textbook as any,
  )
  return { service, saRepo, schoolRepo }
}

describe('AdminService - 学校管理员密码哈希一致性', () => {
  it('createAdmin 必须使用 bcrypt 存储（不再使用 sha256）', async () => {
    const { service, saRepo, schoolRepo } = buildService()
    schoolRepo.findOne.mockResolvedValue({ id: 's1', name: '测试学校', code: 'T01' })
    saRepo.findOne.mockResolvedValue(null) // 用户名不重复

    const res = await service.createAdmin({
      username: 'sa_test',
      password: 'P@ssw0rd',
      name: '测试管理员',
      schoolId: 's1',
    })

    const saved = saRepo.create.mock.calls[0][0] as SchoolAdmin
    expect(isBcryptHash(saved.passwordHash)).toBe(true)
    expect(saved.passwordHash).not.toBe('P@ssw0rd')
    expect(res.username).toBe('sa_test')
  })

  it('resetAdminPassword 写入 bcrypt，且新密码可经 verifyAndUpgrade 校验通过（模拟登录）', async () => {
    const { service, saRepo } = buildService()
    const admin = { id: 'a1', username: 'sa_test', passwordHash: '$2b$10$oldhashplaceholderoldhashplaceholderoldhas', schoolId: 's1' }
    saRepo.findOne.mockResolvedValue(admin)

    await service.resetAdminPassword('a1', 'NewP@ss123')

    // save 应写入 bcrypt 新哈希
    const updated = saRepo.save.mock.calls[0][0]
    expect(isBcryptHash(updated.passwordHash)).toBe(true)

    // 模拟登录校验：新密码应通过，旧密码应失败
    const okNew = verifyAndUpgrade('NewP@ss123', updated.passwordHash)
    expect(okNew.valid).toBe(true)
    const failOld = verifyAndUpgrade('P@ssw0rd', updated.passwordHash)
    expect(failOld.valid).toBe(false)
  })

  it('createAdmin 必填项缺失应抛 BusinessException(ADMIN_FIELDS_REQUIRED)', async () => {
    const { service } = buildService()
    let caught: any
    try {
      await service.createAdmin({ username: '', password: '', name: '', schoolId: '' })
    } catch (e) {
      caught = e
    }
    expect(caught).toBeInstanceOf(BusinessException)
    expect(caught).toBeInstanceOf(HttpException)
    expect(caught.code).toBe('ADMIN_FIELDS_REQUIRED')
    expect(caught.message).toBe('学校/用户名/密码/姓名必填')
  })
})
