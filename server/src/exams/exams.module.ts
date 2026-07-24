import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { Controller, NotFoundException } from '@nestjs/common'
import { Exam } from './exam.entity'
import { Grade } from '../grades/grade.entity'
import { ClassItem } from '../classes/class.entity'
import { CrudService } from '../common/crud/base.service'
import { CrudController } from '../common/crud/base.controller'
import { ClassMemberService, ClassMembersModule } from '../class-members/class-members.module'

class ExamsService extends CrudService<Exam> {
  constructor(
    @InjectRepository(Exam) repo: Repository<Exam>,
    @InjectRepository(Grade) private gradeRepo: Repository<Grade>,
    @InjectRepository(ClassItem) private classRepo: Repository<ClassItem>,
    classMemberSvc: ClassMemberService,
  ) {
    super(repo)
    this.withClassMemberService(classMemberSvc)
  }

  /** 考试是班级维度实体 */
  protected isClassScopedEntity(): boolean {
    return true
  }

  /**
   * 考试按班级共享：同班教师可互看。
   * 安全约束：传入 classId 时必须先校验班级归属当前教师，否则返回空，
   * 杜绝用任意 classId 越权读取其他教师班级考试；不传 classId 时按 teacherId 过滤。
   */
  async findAll(teacherId: string, classId?: string, skip = 0, take = 500) {
    const where: any = {}
    if (classId) {
      const owned = await this.classRepo.findOne({ where: { id: classId, teacherId } } as any)
      if (!owned) return { items: [], total: 0 }
      where.classId = classId
    } else {
      where.teacherId = teacherId
    }
    const [items, total] = await this.repo.findAndCount({
      where,
      order: { createdAt: 'DESC' } as any,
      skip,
      take,
    })
    return { items, total }
  }

  /** 创建考试计划时，为每个科目自动建一条空成绩记录 */
  async create(teacherId: string, dto: any): Promise<Exam> {
    const exam = await super.create(teacherId, dto)
    for (const subject of dto.subjects || []) {
      await this.gradeRepo.save(
        this.gradeRepo.create({
          teacherId,
          classId: dto.classId,
          subject,
          examName: dto.name,
          examId: exam.id,
          date: dto.date,
          scores: [],
        } as any),
      )
    }
    return exam
  }

  /** 删除考试：仅创建者可操作 */
  async remove(id: string, teacherId: string) {
    const exam = await this.repo.findOne({ where: { id } as any })
    if (!exam) throw new NotFoundException('考试不存在')
    if (exam.teacherId !== teacherId) throw new NotFoundException('只有创建者可以删除考试')
    await this.gradeRepo.delete({ examId: id } as any)
    return super.remove(id, teacherId)
  }
}

@Controller('exams')
class ExamsController extends CrudController<Exam> {
  constructor(s: ExamsService) {
    super(s)
  }
}

@Module({
  imports: [TypeOrmModule.forFeature([Exam, Grade, ClassItem]), ClassMembersModule],
  providers: [ExamsService],
  controllers: [ExamsController],
})
export class ExamsModule {}
