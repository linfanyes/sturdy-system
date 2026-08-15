import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { Assignment } from './assignment.entity'
import { Student } from '../students/student.entity'

@Injectable()
export class AssignmentService {
  constructor(
    @InjectRepository(Assignment) private readonly repo: Repository<Assignment>,
    @InjectRepository(Student) private readonly stuRepo: Repository<Student>,
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
      order: { createdAt: 'DESC' },
    } as any)
  }

  async update(teacherId: string, id: string, dto: any) {
    const e = await this.repo.findOne({ where: { id, teacherId } } as any)
    if (!e) throw new NotFoundException('作业不存在')
    delete dto.teacherId
    delete dto.id
    Object.assign(e, dto)
    return this.repo.save(e)
  }

  async remove(teacherId: string, id: string) {
    const e = await this.repo.findOne({ where: { id, teacherId } } as any)
    if (!e) throw new NotFoundException('作业不存在')
    await this.repo.remove(e)
    return { ok: true }
  }

  /** 家长端：取当前学生所在班级的作业 */
  async parentList(studentId: string) {
    const teacherId = await this.resolveTeacherId(studentId)
    const s = await this.stuRepo.findOne({ where: { id: studentId } } as any)
    const classId = (s as any).classId as string
    const items = await this.repo.find({
      where: { teacherId, classId } as any,
      order: { createdAt: 'DESC' },
    } as any)
    return { classId, items }
  }
}
