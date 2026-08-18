import { Repository, FindOptionsWhere, In, Not, IsNull } from 'typeorm'
import { HttpException, HttpStatus, NotFoundException, ForbiddenException } from '@nestjs/common'
import { ClassMemberService } from '../../class-members/class-members.module'
import { BusinessException } from '../exceptions/business.exception'

/**
 * 通用 CRUD 服务基类，统一按 teacherId 做数据隔离。
 * 各业务模块继承此类，仅需传入对应实体的 Repository。
 *
 * 对"班级维度"实体（有 classId 字段的实体），支持按"当前教师任教的班级集合"过滤：
 * - 班主任能看到自己创建的班级数据
 * - 科任老师能看到同班其他老师创建的班级数据（协作）
 * - 通过 ClassMemberService 查询教师可访问的 classId 列表
 */
export class CrudService<T extends { id: string; teacherId: string }> {
  /** 可选的班级成员服务，用于按班级集合过滤（非所有模块都需要） */
  // P2-16 严格模式适配：用 definite assignment 断言（子类在构造时通过 withClassMemberService 注入），
  // 避免所有 this.classMemberSvc.* 调用在 strictNullChecks 下被判定为「possibly null」。
  protected classMemberSvc!: ClassMemberService

  /** 子类可覆盖：创建时必须提供的业务字段（缺省将返回 400，不再落到 DB 层报错） */
  protected requiredCreateFields: string[] = []

  constructor(protected readonly repo: Repository<T>) {}

  /** 注入班级成员服务（由需要班级协作的模块在构造时调用） */
  withClassMemberService(svc: ClassMemberService): this {
    this.classMemberSvc = svc
    return this
  }

  /**
   * 查询列表：按 teacherId 过滤，或按班级集合过滤（如启用）。
   * @param teacherId 当前教师 id
   * @param classId 可选班级过滤
   * @param term  可选学期过滤（前端切换学期时传入，按该学期任教班级集合过滤；不传=所有学期，兼容旧前端）
   */
  async findAll(teacherId: string, classId?: string, skip = 0, take = 500, term?: string, date?: string): Promise<{ items: T[]; total: number }> {
    const where: FindOptionsWhere<T> = {} as FindOptionsWhere<T>

    if (classId) {
      // 指定 classId 时：校验教师是否有权访问该班级（term 可选，不传=任一学期可访问即可）
      if (this.classMemberSvc) {
        const canAccess = await this.classMemberSvc.canAccess(teacherId, classId, term)
        if (!canAccess) return { items: [], total: 0 }
      }
      // 缺陷修复：部分实体（如 checkins 按学生记录）没有 classId 列，
      // 原实现无条件附加 classScopeField 过滤导致查询恒 500。
      // 仅当实体确有该列时按班级过滤，否则回退 teacherId 严格隔离。
      const scopeField = this.classScopeField()
      const hasClassCol = this.repo.metadata.columns.some((c) => c.propertyName === scopeField)
      if (hasClassCol) {
        (where as any)[scopeField] = classId
        // 班级维度：按班级字段过滤，不再按 teacherId 过滤（同班协作）
        if (!this.isClassScopedEntity()) {
          (where as any).teacherId = teacherId
        }
      } else {
        (where as any).teacherId = teacherId
      }
    } else if (this.isClassScopedEntity() && this.classMemberSvc) {
      // 未指定 classId 且为班级维度实体：按教师可访问的班级集合过滤（按学期，不传=所有学期）
      const classIds = await this.classMemberSvc.getClassIdsByTeacher(teacherId, term)
      if (!classIds.length) return { items: [], total: 0 };
      (where as any)[this.classScopeField()] = In(classIds)
    } else {
      // 默认：按 teacherId 严格隔离
      (where as any).teacherId = teacherId
    }

    // 可选 date 过滤：仅当实体确实存在 date 列时生效，避免无 date 列的实体被误过滤
    if (date) {
      const hasDateCol = this.repo.metadata.columns.some((c) => c.propertyName === 'date')
      if (hasDateCol) (where as any).date = date
    }

    // 软删除过滤：默认排除已删除记录
    const hasDeletedAt = this.repo.metadata.columns.some((c) => c.propertyName === 'deletedAt')
    if (hasDeletedAt) (where as any).deletedAt = IsNull()

    try {
      const [items, total] = await this.repo.findAndCount({
        where,
        order: { createdAt: 'DESC' } as any,
        skip,
        take,
      })
      return { items, total }
    } catch (e) {
      // 查询异常不应静默返回空列表（会把系统故障伪装成“没有数据”），抛 500 便于端侧感知与排障
      console.error('[CrudService.findAll] 查询失败:', (e as Error)?.message)
      throw new HttpException('查询失败，请稍后重试', HttpStatus.INTERNAL_SERVER_ERROR)
    }
  }

  /**
   * 查询单条：按 teacherId 过滤，或按班级集合过滤（如启用）。
   */
  async findOne(id: string, teacherId: string): Promise<T> {
    const where: FindOptionsWhere<T> = { id } as FindOptionsWhere<T>
    const hasDeletedAt = this.repo.metadata.columns.some((c) => c.propertyName === 'deletedAt')

    if (this.isClassScopedEntity() && this.classMemberSvc) {
      // 班级维度：先查记录，再校验教师是否有权访问该记录所属班级
      const e = await this.repo.findOne({ where })
      if (!e || (hasDeletedAt && (e as any).deletedAt)) throw new NotFoundException('记录不存在或无权访问')
      const recordClassId = (e as any)[this.classScopeField()]
      if (recordClassId) {
        const canAccess = await this.classMemberSvc.canAccess(teacherId, recordClassId)
        if (!canAccess) throw new NotFoundException('记录不存在或无权访问')
      } else if ((e as any).teacherId !== teacherId) {
        // 记录缺失班级归属时回退为创建者校验，避免越权读取
        throw new NotFoundException('记录不存在或无权访问')
      }
      return e
    }

    // 默认：按 teacherId 严格隔离 + 排除已软删除记录
    const e = await this.repo.findOne({ where: { ...where, teacherId, ...(hasDeletedAt ? { deletedAt: IsNull() } : {}) } as FindOptionsWhere<T> })
    if (!e) throw new NotFoundException('记录不存在或无权访问')
    return e
  }

  async create(teacherId: string, dto: any): Promise<T> {
    const missing = (this.requiredCreateFields || []).filter((f) => {
      const v = (dto as any)?.[f]
      return v === undefined || v === null || v === ''
    })
    if (missing.length) {
      throw new BusinessException('MISSING_REQUIRED_FIELD', '请完整填写必填项（缺少: ' + missing.join('、') + '）')
    }
    // 班级维度实体：校验创建时指定的 classId 对当前教师可访问，防止跨班级写入数据越权
    if (this.isClassScopedEntity() && this.classMemberSvc) {
      const scopeField = this.classScopeField()
      const newClassId = (dto as any)?.[scopeField]
      if (newClassId) {
        const canAccess = await this.classMemberSvc.canAccess(teacherId, newClassId)
        if (!canAccess) {
          throw new ForbiddenException('无权在该班级创建记录')
        }
      }
    }
    const e = this.repo.create({ ...dto, teacherId } as any)
    return (await this.repo.save(e)) as unknown as T
  }

  async update(id: string, teacherId: string, dto: any): Promise<T> {
    const e = await this.findOne(id, teacherId)
    // 班级归属校验：班级维度实体若在更新时尝试改动所属班级（classId），
    // 且新班级不属于当前教师可访问范围，则拒绝，防止跨班级数据迁移越权。
    if (this.isClassScopedEntity() && this.classMemberSvc) {
      const scopeField = this.classScopeField()
      const recordClassId = (e as any)[scopeField]
      const newClassId = (dto as any)?.[scopeField]
      if (newClassId && recordClassId && newClassId !== recordClassId) {
        const canAccessNew = await this.classMemberSvc.canAccess(teacherId, newClassId)
        if (!canAccessNew) {
          throw new ForbiddenException('无权将记录迁移到其他班级')
        }
      }
    }
    Object.assign(e, dto, { teacherId })
    return (await this.repo.save(e)) as unknown as T
  }

  async remove(id: string, teacherId: string): Promise<{ id: string }> {
    const e = await this.findOne(id, teacherId)
    // 软删除：有 deletedAt 列则软删除，否则硬删除（兼容无软删除列的表）
    const hasDeletedAt = this.repo.metadata.columns.some((c) => c.propertyName === 'deletedAt')
    if (hasDeletedAt) {
      await this.repo.softRemove(e)
    } else {
      await this.repo.remove(e)
    }
    return { id }
  }

  /**
   * 批量软删除
   */
  async batchRemove(teacherId: string, ids: string[]): Promise<{ deleted: number }> {
    if (!Array.isArray(ids) || !ids.length) return { deleted: 0 }
    const hasDeletedAt = this.repo.metadata.columns.some((c) => c.propertyName === 'deletedAt')
    let deleted = 0
    for (const id of ids) {
      try {
        const e = await this.findOne(id, teacherId)
        if (hasDeletedAt) {
          await this.repo.softRemove(e)
        } else {
          await this.repo.remove(e)
        }
        deleted++
      } catch {
        // 忽略不存在的记录，继续处理其他
      }
    }
    return { deleted }
  }

  /**
   * 恢复软删除的记录
   */
  async restore(teacherId: string, id: string): Promise<T> {
    const hasDeletedAt = this.repo.metadata.columns.some((c) => c.propertyName === 'deletedAt')
    if (!hasDeletedAt) throw new BusinessException('NOT_SUPPORTED', '该实体不支持恢复操作')
    const e = await this.repo.findOne({ where: { id } as FindOptionsWhere<T>, withDeleted: true })
    if (!e) throw new NotFoundException('记录不存在')
    if (!(e as any).deletedAt) return e // 未删除，无需恢复
    // 权限校验
    if (this.isClassScopedEntity() && this.classMemberSvc) {
      const recordClassId = (e as any)[this.classScopeField()]
      if (recordClassId) {
        const canAccess = await this.classMemberSvc.canAccess(teacherId, recordClassId)
        if (!canAccess) throw new NotFoundException('记录不存在或无权访问')
      }
    } else if ((e as any).teacherId !== teacherId) {
      throw new NotFoundException('记录不存在或无权访问')
    }
    await this.repo.recover(e)
    return e
  }

  /**
   * 查看已删除记录（回收站）
   */
  async findDeleted(teacherId: string, skip = 0, take = 50): Promise<{ items: T[]; total: number }> {
    const hasDeletedAt = this.repo.metadata.columns.some((c) => c.propertyName === 'deletedAt')
    if (!hasDeletedAt) return { items: [], total: 0 }
    const where: any = { teacherId, deletedAt: Not(IsNull()) }
    const [items, total] = await this.repo.findAndCount({
      where,
      order: { deletedAt: 'DESC' } as any,
      skip,
      take: Math.min(take, 100),
      withDeleted: true,
    })
    return { items, total }
  }

  /**
   * 判断当前实体是否为"班级维度"实体（有 classId 字段）。
   * 子类可覆盖此方法显式声明。
   */
  protected isClassScopedEntity(): boolean {
    // 默认 false：按 teacherId 严格隔离
    // 子类（students/grades/exams/homework/notices/attendance 等）覆盖为 true
    return false
  }

  /**
   * 班级维度实体用于按"班级集合"过滤的字段名。
   * 多数业务实体用 classId（记录归属的班级）；但班级实体本身（ClassItem）没有 classId 列，
   * 其 id 即班级 id，故在子类中覆盖为 'id'。
   */
  protected classScopeField(): 'classId' | 'id' {
    return 'classId'
  }
}
