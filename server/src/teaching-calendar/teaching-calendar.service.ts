import { Injectable, NotFoundException } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { TeachingCalendarItem } from './teaching-calendar.entity'
import { CrudService } from '../common/crud/base.service'

@Injectable()
export class TeachingCalendarService extends CrudService<TeachingCalendarItem> {
  constructor(
    @InjectRepository(TeachingCalendarItem) repo: Repository<TeachingCalendarItem>,
  ) {
    super(repo)
  }

  /** 按教师ID查找，按日期排序 */
  async findAll(teacherId: string, skip = 0, take = 500) {
    const [items, total] = await this.repo.findAndCount({
      where: { teacherId } as any,
      order: { date: 'ASC' } as any,
      skip,
      take,
    })
    return { items, total }
  }

  /** 按月份范围查询 */
  async findByMonth(teacherId: string, year: number, month: number) {
    const monthStr = `${year}-${String(month).padStart(2, '0')}`
    const items = await this.repo
      .createQueryBuilder('cal')
      .where('cal.teacherId = :teacherId', { teacherId })
      .andWhere('cal.date LIKE :prefix', { prefix: `${monthStr}%` })
      .orderBy('cal.date', 'ASC')
      .getMany()
    return { items, total: items.length }
  }

  /** 按类型筛选 */
  async findByType(teacherId: string, type: string) {
    const items = await this.repo.find({
      where: { teacherId, type } as any,
      order: { date: 'ASC' } as any,
    })
    return { items, total: items.length }
  }
}
