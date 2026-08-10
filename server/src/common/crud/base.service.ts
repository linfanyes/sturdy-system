import { Repository, FindOptionsWhere, In } from 'typeorm'
import { HttpException, HttpStatus, NotFoundException } from '@nestjs/common'
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
  protected classMemberSvc: ClassMemberService | null = null

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

    if (this.isClassScopedEntity() && this.classMemberSvc) {
      // 班级维度：先查记录，再校验教师是否有权访问该记录所属班级
      const e = await this.repo.findOne({ where })
      if (!e) throw new NotFoundException('记录不存在或无权访问')
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

    // 默认：按 teacherId 严格隔离
    const e = await this.repo.findOne({ where: { ...where, teacherId } as FindOptionsWhere<T> })
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

  /**
   * 班级维度实体用于按"班级集合"过滤的字段名。
   * 多数业务实体用 classId（记录归属的班级）；但班级实体本身（ClassItem）没有 classId 列，
   * 其 id 即班级 id，故在子类中覆盖为 'id'。
   */
  protected classScopeField(): 'classId' | 'id' {
    return 'classId'
  }
}
