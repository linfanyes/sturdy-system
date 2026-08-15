import { Injectable, BadRequestException } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository, LessThanOrEqual } from 'typeorm'
import { SafetyReport, SafetyCheckin } from './safety.entity'
import { Student } from '../students/student.entity'
import { ClassItem } from '../classes/class.entity'
import { Checkin } from '../checkin/checkin.module'

@Injectable()
export class SafetyService {
  constructor(
    @InjectRepository(SafetyReport) private readonly reportRepo: Repository<SafetyReport>,
    @InjectRepository(SafetyCheckin) private readonly checkinRepo: Repository<SafetyCheckin>,
    @InjectRepository(Student) private readonly stuRepo: Repository<Student>,
    @InjectRepository(ClassItem) private readonly clsRepo: Repository<ClassItem>,
    @InjectRepository(Checkin) private readonly rawCheckinRepo: Repository<Checkin>,
  ) {}

  private async resolveTeacherId(studentId: string): Promise<{ teacherId: string; classId: string; studentName: string }> {
    const stu = await this.stuRepo.findOne({ where: { id: studentId } } as any)
    if (!stu) throw new BadRequestException('学生不存在')
    const cls = await this.clsRepo.findOne({ where: { id: stu.classId } } as any)
    if (!cls) throw new BadRequestException('班级不存在')
    return { teacherId: cls.teacherId, classId: stu.classId, studentName: (stu as any).name }
  }

  /** 提交匿名举报（家长/学生端，内部按学生解析 teacherId） */
  async submitReport(studentId: string, body: any) {
    const { teacherId, classId } = await this.resolveTeacherId(studentId)
    const rep = this.reportRepo.create({
      teacherId,
      type: body?.type || 'other',
      content: body?.content || '',
      level: body?.level || 'medium',
      status: 'pending',
      anonymous: body?.anonymous !== false,
      reporterStudentId: body?.anonymous === false ? studentId : null,
      classId,
      handlerName: '',
      note: null,
    } as any)
    return this.reportRepo.save(rep as any)
  }

  /** 举报列表（教师/校管） */
  async listReports(teacherId: string, classId?: string, status?: string) {
    const where: any = { teacherId }
    if (classId) where.classId = classId
    if (status) where.status = status
    const list = await this.reportRepo.find({ where, order: { level: 'DESC', createdAt: 'DESC' } } as any)
    return list
  }

  /** 处理举报（班主任/校管跟进） */
  async respond(teacherId: string, id: string, body: any) {
    const rep = await this.reportRepo.findOne({ where: { id, teacherId } } as any)
    if (!rep) throw new BadRequestException('举报不存在')
    if (body?.status) rep.status = body.status
    if (body?.level) rep.level = body.level
    if (body?.note !== undefined) rep.note = body.note
    if (body?.handlerName !== undefined) rep.handlerName = body.handlerName
    return this.reportRepo.save(rep as any)
  }

  /** 安全打卡（家长协助 / 教师记录，内部按学生解析 teacherId） */
  async submitCheckin(studentId: string, body: any) {
    const { teacherId, classId, studentName } = await this.resolveTeacherId(studentId)
    const now = new Date()
    const ci = this.checkinRepo.create({
      teacherId,
      studentId,
      studentName,
      classId,
      type: body?.type || 'leave',
      date: now.toISOString().slice(0, 10),
      time: now.toTimeString().slice(0, 5),
      note: body?.note || null,
    } as any)
    return this.checkinRepo.save(ci as any)
  }

  async listCheckins(teacherId: string, classId?: string, studentId?: string) {
    const where: any = { teacherId }
    if (classId) where.classId = classId
    if (studentId) where.studentId = studentId
    return this.checkinRepo.find({ where, order: { createdAt: 'DESC' } } as any)
  }

  /** 考勤异常预警：近 7 天无任何打卡记录的学生（启发式，基于 checkin 表） */
  async getAnomalies(teacherId: string, classId: string) {
    const students = await this.stuRepo.find({ where: { classId, teacherId } } as any)
    if (!students.length) return { classId, anomalies: [] }
    const since = new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10)
    const recent = await this.rawCheckinRepo.find({ where: { classId, teacherId, date: LessThanOrEqual(new Date().toISOString().slice(0, 10)) } } as any)
    const active = new Set(recent.filter((c: any) => c.date >= since).map((c: any) => c.studentId))
    const anomalies = students.filter((s: any) => !active.has(s.id)).map((s: any) => ({ studentId: s.id, studentName: s.name }))
    return { classId, anomalies }
  }
}
