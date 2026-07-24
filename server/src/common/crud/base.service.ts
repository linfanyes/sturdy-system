import { Repository, FindOptionsWhere, In } from 'typeorm'
import { NotFoundException } from '@nestjs/common'
import { ClassMemberService } from '../../class-members/class-members.module'

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
  protected classMemberSvc: ClassMemberService | null = null

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
   */
  async findAll(teacherId: string, classId?: string, skip = 0, take = 500): Promise<{ items: T[]; total: number }> {
    const where: FindOptionsWhere<T> = {} as FindOptionsWhere<T>

    if (classId) {
      // 指定 classId 时：校验教师是否有权访问该班级
      if (this.classMemberSvc) {
        const canAccess = await this.classMemberSvc.canAccess(teacherId, classId)
        if (!canAccess) return { items: [], total: 0 }
      }
      (where as any).classId = classId
      // 班级维度：按 classId 过滤，不再按 teacherId 过滤（同班协作）
      if (!this.isClassScopedEntity()) {
        (where as any).teacherId = teacherId
      }
    } else if (this.isClassScopedEntity() && this.classMemberSvc) {
      // 未指定 classId 且为班级维度实体：按教师可访问的班级集合过滤
      const classIds = await this.classMemberSvc.getClassIdsByTeacher(teacherId)
      if (!classIds.length) return { items: [], total: 0 };
      (where as any).classId = In(classIds)
    } else {
      // 默认：按 teacherId 严格隔离
      (where as any).teacherId = teacherId
    }

    const [items, total] = await this.repo.findAndCount({
      where,
      order: { createdAt: 'DESC' } as any,
      skip,
      take,
    })
    return { items, total }
  }

  /**
   * 查询单条：按 teacherId 过滤，或按班级集合过滤（如启用）。
   */
  async findOne(id: string, teacherId: string): Promise<T> {
    const where: FindOptionsWhere<T> = { id } as FindOptionsWhere<T>

    if (this.isClassScopedEntity() && this.classMemberSvc) {
      // 班级维度：先查记录，再校验教师是否有权访问该记录所属班级
      const e = await this.repo.findOne({ where })
      if (!e) throw new NotFoundException('记录不存在或无权访问')
      const recordClassId = (e as any).classId
      if (recordClassId) {
        const canAccess = await this.classMemberSvc.canAccess(teacherId, recordClassId)
        if (!canAccess) throw new NotFoundException('记录不存在或无权访问')
      }
      return e
    }

    // 默认：按 teacherId 严格隔离
    const e = await this.repo.findOne({ where: { ...where, teacherId } as FindOptionsWhere<T> })
    if (!e) throw new NotFoundException('记录不存在或无权访问')
    return e
  }

  async create(teacherId: string, dto: any): Promise<T> {
    const e = this.repo.create({ ...dto, teacherId } as any)
    return (await this.repo.save(e)) as unknown as T
  }

  async update(id: string, teacherId: string, dto: any): Promise<T> {
    const e = await this.findOne(id, teacherId)
    Object.assign(e, dto, { teacherId })
    return (await this.repo.save(e)) as unknown as T
  }

  async remove(id: string, teacherId: string): Promise<{ id: string }> {
    const e = await this.findOne(id, teacherId)
    await this.repo.remove(e)
    return { id }
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
}
