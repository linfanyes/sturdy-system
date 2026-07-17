import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import {
  Controller,
  Post,
  Body,
  UseGuards,
} from '@nestjs/common'
import { Grade } from './grade.entity'
import { CrudService } from '../common/crud/base.service'
import { CrudController } from '../common/crud/base.controller'
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard'
import { CurrentTeacher } from '../common/decorators/current-teacher.decorator'

class GradesService extends CrudService<Grade> {
  constructor(@InjectRepository(Grade) repo: Repository<Grade>) {
    super(repo)
  }

  /** 幂等导入：按 班级+考试名+科目 存在则更新分数，否则新建 */
  async mergeGrade(teacherId: string, dto: any) {
    const existing = await this.repo.findOne({
      where: {
        classId: dto.classId,
        examName: dto.examName,
        subject: dto.subject,
        teacherId,
      } as any,
    })
    if (existing) {
      existing.scores = dto.scores
      existing.date = dto.date
      existing.examId = dto.examId ?? existing.examId
      await this.repo.save(existing)
      return { created: false, id: existing.id }
    }
    const g = await this.create(teacherId, dto)
    return { created: true, id: g.id }
  }
}

@Controller('grades')
class GradesController extends CrudController<Grade> {
  constructor(s: GradesService) {
    super(s)
  }

  @Post('merge')
  @UseGuards(JwtAuthGuard)
  merge(@Body() dto: any, @CurrentTeacher() t: any) {
    return (this.service as GradesService).mergeGrade(t.sub, dto)
  }
}

@Module({
  imports: [TypeOrmModule.forFeature([Grade])],
  providers: [GradesService],
  controllers: [GradesController],
})
export class GradesModule {}
