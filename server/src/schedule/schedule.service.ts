import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { Schedule } from './schedule.entity'
import { Student } from '../students/student.entity'
import { MessageService } from '../messages/message.service'

const DAY_MAP = ['', '周一', '周二', '周三', '周四', '周五', '周六', '周日']

@Injectable()
export class ScheduleService {
  constructor(
    @InjectRepository(Schedule) private readonly repo: Repository<Schedule>,
    @InjectRepository(Student) private readonly stuRepo: Repository<Student>,
    private readonly msg: MessageService,
  ) {}

  private async resolveTeacherId(studentId: string) {
    const s = await this.stuRepo.findOne({ where: { id: studentId } } as any)
    if (!s) throw new NotFoundException('学生不存在')
    return (s as any).teacherId as string
  }

  create(teacherId: string, dto: any) {
    if (!dto?.classId) throw new BadRequestException('缺少 classId')
    const e = this.repo.create({ ...dto, teacherId } as any)
    return this.repo.save(e)
  }

  listByClass(teacherId: string, classId: string) {
    return this.repo.find({
      where: { teacherId, classId } as any,
      order: { dayOfWeek: 'ASC', period: 'ASC' },
    } as any)
  }

  async update(teacherId: string, id: string, dto: any) {
    const e = await this.repo.findOne({ where: { id, teacherId } } as any)
    if (!e) throw new NotFoundException('课表条目不存在')
    delete dto.teacherId
    delete dto.id
    Object.assign(e, dto)
    return this.repo.save(e)
  }

  async remove(teacherId: string, id: string) {
    const e = await this.repo.findOne({ where: { id, teacherId } } as any)
    if (!e) throw new NotFoundException('课表条目不存在')
    await this.repo.remove(e)
    return { ok: true }
  }

  /** 调课：标记条目为 adjusted 并通知全班家长 */
  async adjust(teacherId: string, id: string, dto: any) {
    const e = await this.repo.findOne({ where: { id, teacherId } } as any)
    if (!e) throw new NotFoundException('课表条目不存在')
    e.status = 'adjusted'
    e.adjustReason = dto.adjustReason || ''
    e.adjustToDate = dto.adjustToDate || null
    e.adjustToPeriod = dto.adjustToPeriod ?? null
    const saved = await this.repo.save(e)

    const from = `${DAY_MAP[e.dayOfWeek] || ''}第${e.period}节《${e.subject}》`
    const to = e.adjustToDate ? `，调整至 ${e.adjustToDate} 第${e.adjustToPeriod}节` : ''
    const content = `【调课通知】${e.className || ''} ${from} 调课：${e.adjustReason || '时间/地点调整'}${to}。请提醒孩子关注。`
    await this.msg.notifyClassParents(teacherId, e.classId, '课表调整通知', content, 'schedule_adjust')
    return saved
  }

  /** 家长端：取当前学生所在班级的课表 */
  async parentList(studentId: string) {
    const teacherId = await this.resolveTeacherId(studentId)
    const s = await this.stuRepo.findOne({ where: { id: studentId } } as any)
    const classId = (s as any).classId as string
    const items = await this.repo.find({
      where: { teacherId, classId } as any,
      order: { dayOfWeek: 'ASC', period: 'ASC' },
    } as any)
    return { classId, items }
  }
}
