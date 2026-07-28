import 'reflect-metadata'
import { NotFoundException } from '@nestjs/common'
import { CrudService } from '../src/common/crud/base.service'

/**
 * CRUD 基类服务全量测试
 * 覆盖：数据隔离、分页、班级协作、错误兜底、边界条件
 */

// 模拟实体
interface MockEntity {
  id: string
  teacherId: string
  classId?: string
  createdAt: Date
  name: string
}

class MockCrudService extends CrudService<MockEntity> {
  constructor(repo: any) {
    super(repo)
  }
  protected isClassScopedEntity(): boolean {
    return false
  }
  protected classScopeField(): 'classId' | 'id' {
    return 'classId'
  }
}

class MockClassScopedService extends CrudService<MockEntity> {
  constructor(repo: any) {
    super(repo)
  }
  protected isClassScopedEntity(): boolean {
    return true
  }
  protected classScopeField(): 'classId' | 'id' {
    return 'classId'
  }
}

describe('CrudService - 全量测试', () => {
  let repo: { findAndCount: jest.Mock; findOne: jest.Mock; remove: jest.Mock; save: jest.Mock }
  let service: MockCrudService

  beforeEach(() => {
    repo = {
      findAndCount: jest.fn(),
      findOne: jest.fn(),
      remove: jest.fn(),
      save: jest.fn(),
    }
    service = new MockCrudService(repo as any)
  })

  // ============ 数据隔离 ============
  describe('数据隔离（teacherId）', () => {
    it('TC-CRUD-001: findAll 默认按 teacherId 过滤', async () => {
      repo.findAndCount.mockResolvedValue([[{ id: '1', teacherId: 't1', name: 'A', createdAt: new Date() }], 1])
      const res = await service.findAll('t1')
      expect(repo.findAndCount).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ teacherId: 't1' }),
        })
      )
      expect(res.items).toHaveLength(1)
      expect(res.total).toBe(1)
    })

    it('TC-CRUD-002: 不同教师数据完全隔离', async () => {
      repo.findAndCount.mockResolvedValue([[], 0])
      await service.findAll('t2')
      expect(repo.findAndCount).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ teacherId: 't2' }),
        })
      )
    })

    it('TC-CRUD-003: findOne 按 teacherId 校验权限', async () => {
      repo.findOne.mockResolvedValue({ id: '1', teacherId: 't1', name: 'A' })
      const res = await service.findOne('1', 't1')
      expect(res.name).toBe('A')
    })

    it('TC-CRUD-004: findOne 记录不存在抛出 NotFoundException', async () => {
      repo.findOne.mockResolvedValue(null)
      await expect(service.findOne('nonexist', 't1')).rejects.toThrow(NotFoundException)
      await expect(service.findOne('nonexist', 't1')).rejects.toThrow('记录不存在或无权访问')
    })

    it('TC-CRUD-005: findOne 记录属于其他教师抛出 NotFoundException', async () => {
      repo.findOne.mockResolvedValue({ id: '1', teacherId: 't-other', name: 'B' })
      await expect(service.findOne('1', 't1')).rejects.toThrow(NotFoundException)
    })
  })

  // ============ 分页 ============
  describe('分页', () => {
    it('TC-CRUD-010: 默认 take=500（MAX_TAKE）', async () => {
      repo.findAndCount.mockResolvedValue([[], 0])
      await service.findAll('t1')
      expect(repo.findAndCount).toHaveBeenCalledWith(
        expect.objectContaining({ take: 500, skip: 0 })
      )
    })

    it('TC-CRUD-011: 自定义 skip/take', async () => {
      repo.findAndCount.mockResolvedValue([[], 0])
      await service.findAll('t1', undefined, 10, 20)
      expect(repo.findAndCount).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 10, take: 20 })
      )
    })

    it('TC-CRUD-012: 返回 items + total 结构', async () => {
      const items = Array.from({ length: 5 }, (_, i) => ({
        id: `${i}`, teacherId: 't1', name: `Item${i}`, createdAt: new Date(),
      }))
      repo.findAndCount.mockResolvedValue([items, 25])
      const res = await service.findAll('t1', undefined, 0, 5)
      expect(res.items).toHaveLength(5)
      expect(res.total).toBe(25)
    })

    it('TC-CRUD-013: 空结果返回 {items:[], total:0}', async () => {
      repo.findAndCount.mockResolvedValue([[], 0])
      const res = await service.findAll('t1')
      expect(res).toEqual({ items: [], total: 0 })
    })
  })

  // ============ 班级维度过滤 ============
  describe('班级维度过滤（classId）', () => {
    it('TC-CRUD-020: 指定 classId 过滤', async () => {
      repo.findAndCount.mockResolvedValue([[], 0])
      await service.findAll('t1', 'class-001')
      expect(repo.findAndCount).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ classId: 'class-001' }),
        })
      )
    })

    it('TC-CRUD-021: 班级维度实体使用 ClassMemberService 获取可访问班级', async () => {
      const classScoped = new MockClassScopedService(repo as any)
      const mockMemberSvc = {
        getClassIdsByTeacher: jest.fn().mockResolvedValue(['c1', 'c2']),
        canAccess: jest.fn().mockResolvedValue(true),
      }
      classScoped.withClassMemberService(mockMemberSvc as any)
      repo.findAndCount.mockResolvedValue([[], 0])
      await classScoped.findAll('t1')
      expect(mockMemberSvc.getClassIdsByTeacher).toHaveBeenCalledWith('t1', undefined)
    })

    it('TC-CRUD-022: 班级维度实体无可访问班级返回空', async () => {
      const classScoped = new MockClassScopedService(repo as any)
      const mockMemberSvc = {
        getClassIdsByTeacher: jest.fn().mockResolvedValue([]),
        canAccess: jest.fn(),
      }
      classScoped.withClassMemberService(mockMemberSvc as any)
      const res = await classScoped.findAll('t1')
      expect(res).toEqual({ items: [], total: 0 })
      expect(repo.findAndCount).not.toHaveBeenCalled()
    })

    it('TC-CRUD-023: 指定 classId 但无权限访问返回空', async () => {
      const classScoped = new MockClassScopedService(repo as any)
      const mockMemberSvc = {
        getClassIdsByTeacher: jest.fn(),
        canAccess: jest.fn().mockResolvedValue(false),
      }
      classScoped.withClassMemberService(mockMemberSvc as any)
      const res = await classScoped.findAll('t1', 'class-forbidden')
      expect(res).toEqual({ items: [], total: 0 })
    })
  })

  // ============ 错误兜底 ============
  describe('错误兜底', () => {
    it('TC-CRUD-030: 数据库查询异常返回空结果而非 500', async () => {
      repo.findAndCount.mockRejectedValue(new Error('Connection lost'))
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation()
      const res = await service.findAll('t1')
      expect(res).toEqual({ items: [], total: 0 })
      consoleSpy.mockRestore()
    })

    it('TC-CRUD-031: 字段缺失异常兜底', async () => {
      repo.findAndCount.mockRejectedValue(new Error('Unknown column'))
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation()
      const res = await service.findAll('t1', 'class-001')
      expect(res).toEqual({ items: [], total: 0 })
      consoleSpy.mockRestore()
    })
  })

  // ============ 排序 ============
  describe('排序', () => {
    it('TC-CRUD-040: 默认按 createdAt DESC 排序', async () => {
      repo.findAndCount.mockResolvedValue([[], 0])
      await service.findAll('t1')
      expect(repo.findAndCount).toHaveBeenCalledWith(
        expect.objectContaining({
          order: { createdAt: 'DESC' },
        })
      )
    })
  })

  // ============ 删除 ============
  describe('删除', () => {
    it('TC-CRUD-050: remove 调用 repo.remove', async () => {
      const entity = { id: '1', teacherId: 't1', name: 'A' }
      repo.findOne.mockResolvedValue(entity)
      repo.remove.mockResolvedValue(entity)
      await service.remove('1', 't1')
      expect(repo.remove).toHaveBeenCalledWith(entity)
    })

    it('TC-CRUD-051: remove 记录不存在抛出 NotFoundException', async () => {
      repo.findOne.mockResolvedValue(null)
      await expect(service.remove('nonexist', 't1')).rejects.toThrow(NotFoundException)
    })
  })
})
