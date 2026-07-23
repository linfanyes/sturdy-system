import { Repository, FindOptionsWhere } from 'typeorm'
import { NotFoundException } from '@nestjs/common'

/**
 * 通用 CRUD 服务基类，统一按 teacherId 做数据隔离。
 * 各业务模块继承此类，仅需传入对应实体的 Repository。
 */
export class CrudService<T extends { id: string; teacherId: string }> {
  constructor(protected readonly repo: Repository<T>) {}

  async findAll(teacherId: string, classId?: string, skip = 0, take = 500): Promise<{ items: T[]; total: number }> {
    const where: FindOptionsWhere<T> = { teacherId } as FindOptionsWhere<T>
    if (classId) (where as any).classId = classId
    const [items, total] = await this.repo.findAndCount({
      where,
      order: { createdAt: 'DESC' } as any,
      skip,
      take,
    })
    return { items, total }
  }

  async findOne(id: string, teacherId: string): Promise<T> {
    const e = await this.repo.findOne({
      where: { id, teacherId } as FindOptionsWhere<T>,
    })
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
}
