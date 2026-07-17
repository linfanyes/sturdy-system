import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { Controller } from '@nestjs/common'
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

  /** 删除考试计划时级联删除对应成绩 */
  async remove(id: string, teacherId: string) {
    await this.gradeRepo.delete({ examId: id, teacherId } as any)
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
