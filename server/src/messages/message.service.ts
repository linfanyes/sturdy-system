import { Injectable, NotFoundException } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository, Not, In } from 'typeorm'
import { Message } from './message.entity'
import { CreateMessageDto } from './dto/create-message.dto'
import { ParentContact } from '../parent-contact/parent-contact.entity'
import { ClassItem } from '../classes/class.entity'
import { Student } from '../students/student.entity'
import { User } from '../users/user.entity'
import { SchoolAdmin } from '../school-admin/school-admin.entity'
import { School } from '../school/school.entity'
import { parentImUserId } from '../im/parent-im.util'

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
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(SchoolAdmin)
    private readonly saRepo: Repository<SchoolAdmin>,
    @InjectRepository(School)
    private readonly schoolRepo: Repository<School>,
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

  /** 根据当前用户角色列出可发送的收件人（支持四角色互通） */
  async listRecipients(userId: string, role: string, schoolId?: string) {
    const map = new Map<string, any>()
    const put = (item: {
      id: string
      name: string
      role: string
      schoolId?: string
      extra?: Record<string, any>
    }) => {
      const key = `${item.role}|${item.id}`
      if (!map.has(key)) map.set(key, item)
    }

    if (role === 'teacher') {
      // 教师 → 本班家长
      const ensure = (item: {
        studentId: string
        studentName: string
        classId: string
        parentName: string
        relation: string
        phone: string
      }) => {
        const imUserId = parentImUserId({
          studentId: item.studentId,
          relation: '家长',
          parentName: item.parentName || '家长',
        })
        put({
          id: imUserId,
          name: item.parentName || '家长',
          role: 'parent',
          extra: {
            studentName: item.studentName,
            studentId: item.studentId,
            classId: item.classId,
            relation: item.relation || '家长',
            phone: item.phone || '',
          },
        })
      }
      const contacts = await this.pcRepo.find({
        where: { teacherId: userId },
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
      const myClasses = await this.classRepo.find({
        where: { teacherId: userId },
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
      // 教师 → 本校校管
      const adminIds = await this.listSchoolAdminIdsByTeacher(userId)
      for (const sa of adminIds) {
        put({ id: sa.id, name: sa.name, role: 'school_admin', schoolId: sa.schoolId })
      }
    } else if (role === 'parent') {
      // 家长 → 自己孩子的班主任 / 科任老师
      const student = await this.findStudentByParent(userId)
      if (student) {
        const cls = await this.classRepo.findOne({ where: { id: student.classId } })
        if (cls) {
          if (cls.teacherId) {
            const t = await this.userRepo.findOne({ where: { id: cls.teacherId } })
            if (t) put({ id: t.id, name: t.name, role: 'teacher', schoolId: t.schoolId, extra: { className: cls.name } })
          }
          // 科任老师列表
          const teacherIds = Array.isArray(cls.teachers) ? cls.teachers : []
          for (const tid of teacherIds) {
            if (tid === cls.teacherId) continue
            const t = await this.userRepo.findOne({ where: { id: tid } })
            if (t) put({ id: t.id, name: t.name, role: 'teacher', schoolId: t.schoolId, extra: { className: cls.name } })
          }
          // 家长 → 校管
          const sa = await this.saRepo.findOne({ where: { schoolId: cls.teacherId ? (await this.userRepo.findOne({ where: { id: cls.teacherId } }))?.schoolId : undefined } })
          if (sa) put({ id: sa.id, name: sa.name, role: 'school_admin', schoolId: sa.schoolId })
        }
      }
    } else if (role === 'school_admin') {
      // 校管 → 本校教师
      const teachers = await this.userRepo.find({ where: { schoolId: userId ? (await this.saRepo.findOne({ where: { id: userId } }))?.schoolId : schoolId } })
      for (const t of teachers) {
        if (t.id === userId) continue
        put({ id: t.id, name: t.name, role: 'teacher', schoolId: t.schoolId })
      }
      // 校管 → 其他校管（同校+其他校）
      const admins = await this.saRepo.find({})
      for (const sa of admins) {
        if (sa.id === userId) continue
        put({ id: sa.id, name: sa.name, role: 'school_admin', schoolId: sa.schoolId })
      }
      // 校管 → 超管
      put({ id: 'super', name: '超级管理员', role: 'super' })
    } else if (role === 'super') {
      // 超管 → 全部校管
      const admins = await this.saRepo.find({})
      for (const sa of admins) {
        const school = await this.schoolRepo.findOne({ where: { id: sa.schoolId } })
        put({
          id: sa.id,
          name: sa.name,
          role: 'school_admin',
          schoolId: sa.schoolId,
          extra: { schoolName: school?.name || '' },
        })
      }
    }

    return Array.from(map.values())
  }

  /** 辅助：根据 teacherId 找到其所在学校的校管列表 */
  private async listSchoolAdminIdsByTeacher(teacherId: string): Promise<SchoolAdmin[]> {
    const u = await this.userRepo.findOne({ where: { id: teacherId } })
    if (!u?.schoolId) return []
    return this.saRepo.find({ where: { schoolId: u.schoolId } })
  }

  /** 辅助：根据家长 IM ID 找到其关联学生 */
  private async findStudentByParent(parentId: string): Promise<Student | null> {
    const students = await this.studentRepo.find()
    // 遍历推导 parentImUserId 匹配
    for (const s of students) {
      const imId = parentImUserId({ studentId: s.id, relation: '家长', parentName: s.parentName || '家长' })
      if (imId === parentId) return s
    }
    return null
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

  /** 通知某班所有家长（按学生数去重，家长 IM 账号由 parentImUserId 派生，同学生多家长共享同一账号） */
  async notifyClassParents(teacherId: string, classId: string, title: string, content: string, type = 'class_notice') {
    const students = await this.studentRepo.find({ where: { teacherId, classId } } as any)
    if (!students.length) return 0
    const seen = new Set<string>()
    let sent = 0
    for (const s of students) {
      const imId = parentImUserId({ studentId: s.id, relation: '家长', parentName: s.parentName || '家长' })
      if (seen.has(imId)) continue
      seen.add(imId)
      await this.send('system', 'system', { recipientId: imId, recipientRole: 'parent', title, content, type })
      sent++
    }
    return sent
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
