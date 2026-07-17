import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { Controller } from '@nestjs/common'
import { LessonObservation, WorkLog, LessonPlanTemplate } from './admin.entity'
import { CrudService } from '../common/crud/base.service'
import { CrudController } from '../common/crud/base.controller'

class ObsService extends CrudService<LessonObservation> {
  constructor(@InjectRepository(LessonObservation) repo: Repository<LessonObservation>) {
    super(repo)
  }
}
@Controller('lesson-observations')
class ObsController extends CrudController<LessonObservation> {
  constructor(s: ObsService) {
    super(s)
  }
}

class LogService extends CrudService<WorkLog> {
  constructor(@InjectRepository(WorkLog) repo: Repository<WorkLog>) {
    super(repo)
  }
}
@Controller('work-logs')
class LogController extends CrudController<WorkLog> {
  constructor(s: LogService) {
    super(s)
  }
}

class PlanService extends CrudService<LessonPlanTemplate> {
  constructor(@InjectRepository(LessonPlanTemplate) repo: Repository<LessonPlanTemplate>) {
    super(repo)
  }
}
@Controller('lesson-plan-templates')
class PlanController extends CrudController<LessonPlanTemplate> {
  constructor(s: PlanService) {
    super(s)
  }
}

@Module({
  imports: [TypeOrmModule.forFeature([LessonObservation, WorkLog, LessonPlanTemplate])],
  providers: [ObsService, LogService, PlanService],
  controllers: [ObsController, LogController, PlanController],
})
export class AdminModule {}
