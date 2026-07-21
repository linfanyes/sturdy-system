import { Injectable, BadRequestException } from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { ParentContact } from '../parent-contact/parent-contact.entity'
import { Student } from '../students/student.entity'
import { ImService } from '../im/im.module'
import { parentImUserId } from '../im/parent-im.util'

/**
 * 家长端登录：凭手机号（需出现在班级通讯录 / 学生表的家长电话中）换取家长 JWT。
 * 家长 IM 账号由（studentId + parentName）规范派生，与教师花名册里的账号一致，
 * 因此老师从花名册发起的会话，家长能在自己手机上原样收到。
 */
@Injectable()
export class ParentAuthService {
  constructor(
    @InjectRepository(ParentContact) private readonly pcRepo: Repository<ParentContact>,
    @InjectRepository(Student) private readonly studentRepo: Repository<Student>,
    private readonly jwt: JwtService,
    private readonly im: ImService,
  ) {}

  private async findByPhone(phone: string) {
    const contact = await this.pcRepo.findOne({ where: { phone } })
    if (contact) {
      return {
        studentId: contact.studentId,
        studentName: contact.studentName,
        classId: contact.classId,
        parentName: contact.parentName,
        phone: contact.phone,
      }
    }
    const stu = await this.studentRepo.findOne({ where: { parentPhone: phone } })
    if (stu) {
      return {
        studentId: stu.id,
        studentName: stu.name,
        classId: stu.classId,
        parentName: stu.parentName,
        phone: stu.parentPhone,
      }
    }
    return null
  }

  async login(phone: string) {
    if (!phone || !/^\d{6,20}$/.test(phone)) throw new BadRequestException('请输入正确的手机号')
    const rec = await this.findByPhone(phone)
    if (!rec) throw new BadRequestException('未找到该手机号对应的家长，请确认是否在班级通讯录中')
    const imUserId = parentImUserId({ studentId: rec.studentId, relation: '家长', parentName: rec.parentName })
    const token = this.jwt.sign({
      sub: imUserId,
      type: 'parent',
      phone: rec.phone,
      parentName: rec.parentName,
      studentName: rec.studentName,
      classId: rec.classId,
    })
    return { token, parent: { imUserId, ...rec } }
  }

  /** 当前家长信息 + 其所有孩子（同一手机号可能对应多个孩子） */
  async getMe(payload: any) {
    const kids: any[] = []
    const contacts = await this.pcRepo.find({ where: { phone: payload.phone } })
    for (const c of contacts) {
      kids.push({ studentId: c.studentId, studentName: c.studentName, classId: c.classId, parentName: c.parentName })
    }
    if (!kids.length) {
      const stus = await this.studentRepo.find({ where: { parentPhone: payload.phone } })
      for (const s of stus) {
        kids.push({ studentId: s.id, studentName: s.name, classId: s.classId, parentName: s.parentName })
      }
    }
    return {
      phone: payload.phone,
      parentName: payload.parentName,
      imUserId: payload.sub,
      kids,
    }
  }

  /** 签发家长 IM UserSig（复用教师端的签名逻辑） */
  getImUserSig(payload: any) {
    return this.im.getUserSig(payload.sub)
  }
}
