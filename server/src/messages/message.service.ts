import { Injectable, NotFoundException } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository, Not, In } from 'typeorm'
import { Message } from './message.entity'
import { CreateMessageDto } from './dto/create-message.dto'
import { ParentContact } from '../parent-contact/parent-contact.entity'
import { ClassItem } from '../classes/class.entity'
import { Student } from '../students/student.entity'

@Injectable()
export class MessageService {
  constructor(
    @InjectRepository(Message) private readonly repo: Repository<Message>,
    @InjectRepository(ParentContact)
    private readonly pcRepo: Repository<ParentContact>,
    @InjectRepository(ClassItem)
    private readonly classRepo: Repository<ClassItem>,
    @InjectRepository(Student)
    private readonly studentRepo: Repository<Student>,
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

  /** 当前用户发送的消息列表 */
  async listSent(senderId: string, senderRole: string, skip = 0, take = 20) {
    const [items, total] = await this.repo.findAndCount({
      where: { senderId, senderRole },
      order: { createdAt: 'DESC' },
      skip,
      take,
    })
    return { items, total }
  }

  /** 当前用户未读消息数 */
  async unreadCount(recipientId: string, recipientRole: string) {
    const count = await this.repo.count({
      where: { recipientId, recipientRole, isRead: false },
    })
    return { count }
  }

  /**
   * 教师可发消息的收件人列表：
   * 从 parent_contacts 和 students 表中提取家长信息，按 studentId + parentName 去重。
   */
  async listRecipients(teacherId: string) {
    const map = new Map<string, any>()
    const ensure = (item: {
      studentId: string
      studentName: string
      classId: string
      parentName: string
      relation: string
      phone: string
    }) => {
      const key = `${item.studentId}|${item.parentName}`
      if (item.studentId && item.parentName && !map.has(key)) {
        map.set(key, {
          id: `${item.studentId}_${item.parentName}`,
          name: item.parentName,
          role: 'parent',
          studentName: item.studentName,
          studentId: item.studentId,
          classId: item.classId,
          relation: item.relation || '家长',
          phone: item.phone || '',
        })
      }
    }
    // 1) 家校联系日志中的家长
    const contacts = await this.pcRepo.find({
      where: { teacherId },
      order: { createdAt: 'DESC' },
    })
    for (const c of contacts) {
      ensure({
        studentId: c.studentId,
        studentName: c.studentName,
        classId: c.classId,
        parentName: c.parentName,
        relation: c.relation,
        phone: c.phone,
      })
    }
    // 2) 学生表中带 parentName 的家长
    const myClasses = await this.classRepo.find({
      where: { teacherId },
      select: ['id'],
    })
    const classIds = myClasses.map((c) => c.id)
    if (classIds.length) {
      const students = await this.studentRepo.find({
        where: { classId: In(classIds), parentName: Not('') },
      })
      for (const s of students) {
        ensure({
          studentId: s.id,
          studentName: s.name,
          classId: s.classId,
          parentName: s.parentName || '',
          relation: '家长',
          phone: s.parentPhone || '',
        })
      }
    }
    return Array.from(map.values())
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
      type: dto.type || 'direct',
      isRead: false,
    })
    return this.repo.save(msg)
  }

  /** 标记单条已读（仅收件人本人可标记） */
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

  /** 一键全部已读 */
  async markAllRead(recipientId: string, recipientRole: string) {
    await this.repo.update(
      { recipientId, recipientRole, isRead: false },
      { isRead: true },
    )
    return { ok: true }
  }

  /** 删除消息（仅收件人或发件人可删除） */
  async remove(id: string, userId: string, userRole: string) {
    const msg = await this.repo.findOne({ where: { id } })
    if (!msg) throw new NotFoundException('消息不存在')
    if (
      !(msg.recipientId === userId && msg.recipientRole === userRole) &&
      !(msg.senderId === userId && msg.senderRole === userRole)
    ) {
      throw new NotFoundException('您无权删除此消息')
    }
    await this.repo.remove(msg)
    return { id, deleted: true }
  }
}


