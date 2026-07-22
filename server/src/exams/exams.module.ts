import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { Controller, NotFoundException } from '@nestjs/common'
import { Exam } from './exam.entity'
import { Grade } from '../grades/grade.entity'
import { CrudService } from '../common/crud/base.service'
import { CrudController } from '../common/crud/base.controller'

class ExamsService extends CrudService<Exam> {
  constructor(
    @InjectRepository(Exam) repo: Repository<Exam>,
    @InjectRepository(Grade) private gradeRepo: Repository<Grade>,
  ) {
    super(repo)
  }

  /** 同班老师共享考试：按 classId（非 teacherId）过滤 */
  async findAll(teacherId: string, classId?: string, skip = 0, take = 500) {
    const where: any = {}
    if (classId) where.classId = classId
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
  imports: [TypeOrmModule.forFeature([Exam, Grade])],
  providers: [ExamsService],
  controllers: [ExamsController],
})
export class ExamsModule {}
