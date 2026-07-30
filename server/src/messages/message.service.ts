import { Injectable, NotFoundException } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { Message } from './message.entity'
import { CreateMessageDto } from './dto/create-message.dto'

@Injectable()
export class MessageService {
  constructor(
    @InjectRepository(Message) private readonly repo: Repository<Message>,
  ) {}

  /** 当前用户作为收件人的消息列表（按创建时间倒序分页） */
  async list(recipientId: string, recipientRole: string, skip = 0, take = 20) {
    const [items, total] = await this.repo.findAndCount({
      where: { recipientId, recipientRole },
      order: { createdAt: 'DESC' },
      skip,
      take,
    })
    return { items, total }
  }

  /** 发送消息（发件人取当前登录用户，不信任前端传入） */
  async send(senderId: string, senderRole: string, dto: CreateMessageDto) {
    const msg = this.repo.create({
      senderId,
      senderRole,
      recipientId: dto.recipientId,
      recipientRole: dto.recipientRole,
      title: dto.title,
      content: dto.content,
      type: dto.type || 'system',
      isRead: false,
    })
    return this.repo.save(msg)
  }

  /** 标记单条已读（仅收件人本人可标记；非本人/不存在返回 404） */
  async markRead(id: string, recipientId: string, recipientRole: string) {
    const res = await this.repo.update(
      { id, recipientId, recipientRole },
      { isRead: true },
    )
    if (res.affected === 0) {
      throw new NotFoundException('消息不存在或您无权操作')
    }
    return { id, isRead: true }
  }
}
