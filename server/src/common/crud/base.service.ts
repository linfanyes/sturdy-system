import { Repository, FindOptionsWhere } from 'typeorm'
import { NotFoundException } from '@nestjs/common'

/**
 * 通用 CRUD 服务基类，统一按 teacherId 做数据隔离。
 * 各业务模块继承此类，仅需传入对应实体的 Repository。
 */
export class CrudService<T extends { id: string; teacherId: string }> {
  constructor(protected readonly repo: Repository<T>) {}

  findAll(teacherId: string): Promise<T[]> {
    return this.repo.find({
      where: { teacherId } as FindOptionsWhere<T>,
      order: { createdAt: 'DESC' } as any,
    })
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
