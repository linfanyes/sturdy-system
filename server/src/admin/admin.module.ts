import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { Controller } from '@nestjs/common'
import { LessonObservation, WorkLog, LessonPlanTemplate } from './admin.entity'
import { CrudService } from '../common/crud/base.service'
import { CrudController } from '../common/crud/base.controller'
import { AdminController } from './admin.controller'
import { AdminService } from './admin.service'
import { User } from '../users/user.entity'
import { School } from '../school/school.entity'
import { SchoolAdmin } from '../school-admin/school-admin.entity'
import { ClassItem } from '../classes/class.entity'
import { Student } from '../students/student.entity'
import { AuditModule } from '../audit/audit.module'

// ... 已有的 Obs/Log/Plan 控制器们 ...

class ObsService extends CrudService<LessonObservation> {
  constructor(@InjectRepository(LessonObservation) repo: Repository<LessonObservation>) { super(repo) }
}
@Controller('lesson-observations')
class ObsController extends CrudController<LessonObservation> { constructor(s: ObsService) { super(s) } }

class LogService extends CrudService<WorkLog> {
  constructor(@InjectRepository(WorkLog) repo: Repository<WorkLog>) { super(repo) }
}
@Controller('work-logs')
class LogController extends CrudController<WorkLog> { constructor(s: LogService) { super(s) } }

class PlanService extends CrudService<LessonPlanTemplate> {
  constructor(@InjectRepository(LessonPlanTemplate) repo: Repository<LessonPlanTemplate>) { super(repo) }
}
@Controller('lesson-plan-templates')
class PlanController extends CrudController<LessonPlanTemplate> { constructor(s: PlanService) { super(s) } }

@Module({
  imports: [TypeOrmModule.forFeature([LessonObservation, WorkLog, LessonPlanTemplate, User, School, SchoolAdmin, ClassItem, Student]), AuditModule],
  providers: [ObsService, LogService, PlanService, AdminService],
  controllers: [ObsController, LogController, PlanController, AdminController],
  exports: [AdminService],
})
export class AdminModule {}
