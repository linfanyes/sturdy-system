import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { NotificationItem } from './notification.entity'

@Injectable()
export class NotificationService {
  constructor(
    @InjectRepository(NotificationItem) private readonly repo: Repository<NotificationItem>,
  ) {}

  /** 创建通知 */
  async create(teacherId: string, title: string, content?: string, type = 'info', link?: string) {
    const n = this.repo.create({ teacherId, title, content, type, link })
    return this.repo.save(n)
  }

  /** 获取未读通知数 */
  async unreadCount(teacherId: string): Promise<number> {
    return this.repo.count({ where: { teacherId, read: false } })
  }

  /** 获取通知列表 */
  async list(teacherId: string, skip = 0, take = 50) {
    const [items, total] = await this.repo.findAndCount({
      where: { teacherId },
      order: { createdAt: 'DESC' },
      skip, take,
    })
    return { items, total, unread: items.filter(n => !n.read).length }
  }

  /** 标记已读 */
  async markRead(teacherId: string, id: string) {
    return this.repo.update({ id, teacherId }, { read: true })
  }

  /** 全部已读 */
  async markAllRead(teacherId: string) {
    return this.repo.update({ teacherId, read: false }, { read: true })
  }
}
