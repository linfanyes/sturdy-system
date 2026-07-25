import 'reflect-metadata'
import { NotFoundException } from '@nestjs/common'
import { In, Repository } from 'typeorm'
import { CrudService } from 'src/common/crud/base.service'
import { BackupService } from 'src/backup/backup.module'

/**
 * 租户隔离回归套件（对应测试报告「优化建议-3：租户隔离回归固化」ISO-01~06）。
 * 通过 mock 仓储真实驱动隔离逻辑，确保跨租户读取/写入/删除被拒绝，且写入强制归属当前教师。
 */

// ---------- CrudService 隔离契约（通用 CRUD 基类，覆盖绝大多数业务实体） ----------

interface TestEntity {
  id: string
  teacherId: string
  classId?: string
  name?: string
}

class TestCrudService extends CrudService<TestEntity> {
  private classScoped = false
  protected isClassScopedEntity(): boolean {
    return this.classScoped
  }
  setClassScoped(v: boolean) {
    this.classScoped = v
  }
}

function makeRepo(): any {
  return {
    findAndCount: jest.fn().mockResolvedValue([[], 0]),
    findOne: jest.fn().mockResolvedValue(null),
    create: jest.fn((x: any) => x),
    save: jest.fn((x: any) => Promise.resolve(x)),
    remove: jest.fn().mockResolvedValue(undefined),
  }
}

describe('租户隔离 - CrudService 契约 (ISO-01~06)', () => {
  it('ISO-01 列表查询默认按 teacherId 严格隔离', async () => {
    const svc = new TestCrudService(makeRepo())
    await svc.findAll('t1')
    const where = (svc as any).repo.findAndCount.mock.calls[0][0].where
    expect(where.teacherId).toBe('t1')
    expect(where.classId).toBeUndefined()
  })

  it('ISO-02 查询单条越权返回 404（不泄露他人记录）', async () => {
    const repo = makeRepo()
    const svc = new TestCrudService(repo)
    repo.findOne.mockResolvedValue(null)
    await expect(svc.findOne('id-other', 't1')).rejects.toThrow(NotFoundException)
    expect(repo.findOne).toHaveBeenCalledWith({ where: { id: 'id-other', teacherId: 't1' } })
  })

  it('ISO-03 创建强制注入 teacherId（忽略传入的伪造 teacherId）', async () => {
    const repo = makeRepo()
    const svc = new TestCrudService(repo)
    await svc.create('t1', { teacherId: 't-evil', name: 'x' })
    expect(repo.create).toHaveBeenCalledWith({ teacherId: 't1', name: 'x' })
  })

  it('ISO-04 更新/删除走 findOne 校验，越权抛 404', async () => {
    const repo = makeRepo()
    const svc = new TestCrudService(repo)
    // findOne 命中（归属 t1）
    repo.findOne.mockResolvedValue({ id: 'id1', teacherId: 't1' })
    await svc.update('id1', 't1', { name: 'y' })
    expect(repo.findOne).toHaveBeenCalledWith({ where: { id: 'id1', teacherId: 't1' } })

    // 越权：findOne 返回 404 → 更新也抛 404
    repo.findOne.mockResolvedValue(null)
    await expect(svc.update('id-other', 't1', { name: 'z' })).rejects.toThrow(NotFoundException)
  })

  it('ISO-05 班级维度实体：未指定 classId 时按可访问班级集合过滤', async () => {
    const repo = makeRepo()
    const svc = new TestCrudService(repo)
    svc.setClassScoped(true)
    const cms: any = {
      canAccess: jest.fn().mockResolvedValue(true),
      getClassIdsByTeacher: jest.fn().mockResolvedValue(['c1', 'c2']),
    }
    svc.withClassMemberService(cms)
    await svc.findAll('t1')
    const where = (svc as any).repo.findAndCount.mock.calls[0][0].where
    expect(cms.getClassIdsByTeacher).toHaveBeenCalledWith('t1', undefined)
    // classId 被 IN(...)，且不再按 teacherId 隔离（同班协作）
    expect(where.classId).toBeDefined()
    expect((where.classId as any).value).toEqual(['c1', 'c2'])
    expect(where.teacherId).toBeUndefined()
  })

  it('ISO-05b 班级维度：可访问班级为空时返回空列表（不查库）', async () => {
    const repo = makeRepo()
    const svc = new TestCrudService(repo)
    svc.setClassScoped(true)
    svc.withClassMemberService({ canAccess: jest.fn(), getClassIdsByTeacher: jest.fn().mockResolvedValue([]) } as any)
    const res = await svc.findAll('t1')
    expect(res).toEqual({ items: [], total: 0 })
    expect(repo.findAndCount).not.toHaveBeenCalled()
  })

  it('ISO-06 班级维度查询单条：校验班级访问权限，越权 404', async () => {
    const repo = makeRepo()
    const svc = new TestCrudService(repo)
    svc.setClassScoped(true)
    const cms: any = { canAccess: jest.fn().mockResolvedValue(false), getClassIdsByTeacher: jest.fn() }
    svc.withClassMemberService(cms)
    repo.findOne.mockResolvedValue({ id: 'id1', classId: 'cX' })
    await expect(svc.findOne('id1', 't1')).rejects.toThrow(NotFoundException)
    expect(cms.canAccess).toHaveBeenCalledWith('t1', 'cX')

    // 有权访问则返回实体
    cms.canAccess.mockResolvedValue(true)
    const e = await svc.findOne('id1', 't1')
    expect(e).toEqual({ id: 'id1', classId: 'cX' })
  })
})

// ---------- BackupService 隔离（缺陷 D1 回归：跨租户越权读/删备份） ----------

function makeAllRepos() {
  const repo: any = {
    find: jest.fn().mockResolvedValue([]),
    findOne: jest.fn().mockResolvedValue(null),
    findAndCount: jest.fn().mockResolvedValue([[], 0]),
    create: jest.fn((x: any) => x),
    save: jest.fn((x: any) => Promise.resolve(x)),
    delete: jest.fn().mockResolvedValue({ affected: 1 }),
  }
  const others: any = { findOne: jest.fn(), find: jest.fn().mockResolvedValue([]) }
  return { repo, others }
}

describe('租户隔离 - BackupService (D1 回归)', () => {
  it('list 仅返回当前教师的备份（where 带 teacherId）', async () => {
    const { repo, others } = makeAllRepos()
    const svc = new BackupService(repo, others, others, others, others, others, others, others, others, others, others)
    await svc.list('t1')
    const callArg = repo.find.mock.calls[0][0]
    expect(callArg.where.teacherId).toBe('t1')
  })

  it('get 按 { id, teacherId } 查询，跨租户读他人备份返回 null', async () => {
    const { repo, others } = makeAllRepos()
    const svc = new BackupService(repo, others, others, others, others, others, others, others, others, others, others)
    await svc.get('t1', 'b1')
    expect(repo.findOne).toHaveBeenCalledWith({ where: { id: 'b1', teacherId: 't1' } })
  })

  it('remove 按 { id, teacherId } 删除，无法删他人备份（D1）', async () => {
    const { repo, others } = makeAllRepos()
    const svc = new BackupService(repo, others, others, others, others, others, others, others, others, others, others)
    await svc.remove('t1', 'b1')
    // 关键：delete 条件必须同时含 id 与 teacherId，否则跨租户越权删除
    expect(repo.delete).toHaveBeenCalledWith({ id: 'b1', teacherId: 't1' })
  })
})
