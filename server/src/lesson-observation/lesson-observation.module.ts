import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { Entity, Column } from 'typeorm'
import { Controller } from '@nestjs/common'
import { BaseEntity } from '../common/entities/base.entity'
import { CrudService } from '../common/crud/base.service'
import { CrudController } from '../common/crud/base.controller'

@Entity('lesson_observations')
export class LessonObservation extends BaseEntity {
  @Column() classId: string
  @Column({ default: '' }) className: string
  @Column() teacherName: string
  @Column({ default: '' }) subject: string
  @Column() topic: string
  @Column() date: string
  @Column({ type: 'text', nullable: true }) strengths: string
  @Column({ type: 'text', nullable: true }) suggestions: string
  @Column({ default: '良好' }) overallRating: string
}

class LessonObsService extends CrudService<LessonObservation> {
  constructor(@InjectRepository(LessonObservation) repo: Repository<LessonObservation>) {
    super(repo)
  }
}

@Controller('lesson-observations')
class LessonObsController extends CrudController<LessonObservation> {
  constructor(s: LessonObsService) {
    super(s)
  }
}

@Module({
  imports: [TypeOrmModule.forFeature([LessonObservation])],
  providers: [LessonObsService],
  controllers: [LessonObsController],
})
export class LessonObservationModule {}
