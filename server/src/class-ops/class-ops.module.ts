import { Module, UseGuards } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { Controller } from '@nestjs/common'
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard'
import { Feature } from '../common/decorators/feature.decorator'
import { FeatureGuard } from '../common/feature/feature.guard'
import { ClassExpense, ClassActivity, ClassDutyConfig } from './class-ops.entity'
import { CrudService } from '../common/crud/base.service'
import { CrudController } from '../common/crud/base.controller'
import { Roles } from '../common/decorators/roles.decorator'

class ExpenseService extends CrudService<ClassExpense> {
  constructor(@InjectRepository(ClassExpense) repo: Repository<ClassExpense>) {
    super(repo)
  }
}
@Roles('teacher')
@Feature('finance')
@UseGuards(JwtAuthGuard, FeatureGuard)
@Controller('class-expenses')
class ExpenseController extends CrudController<ClassExpense> {
  constructor(s: ExpenseService) {
    super(s)
  }
}

class ActivityService extends CrudService<ClassActivity> {
  constructor(@InjectRepository(ClassActivity) repo: Repository<ClassActivity>) {
    super(repo)
  }
}
@Roles('teacher')
@Feature('activities')
@UseGuards(JwtAuthGuard, FeatureGuard)
@Controller('class-activities')
class ActivityController extends CrudController<ClassActivity> {
  constructor(s: ActivityService) {
    super(s)
  }
}

class DutyConfigService extends CrudService<ClassDutyConfig> {
  constructor(@InjectRepository(ClassDutyConfig) repo: Repository<ClassDutyConfig>) {
    super(repo)
  }
}
@Roles('teacher')
@Feature('duty')
@UseGuards(JwtAuthGuard, FeatureGuard)
@Controller('class-duty-configs')
class DutyConfigController extends CrudController<ClassDutyConfig> {
  constructor(s: DutyConfigService) {
    super(s)
  }
}

@Module({
  imports: [TypeOrmModule.forFeature([ClassExpense, ClassActivity, ClassDutyConfig])],
  providers: [ExpenseService, ActivityService, DutyConfigService],
  controllers: [ExpenseController, ActivityController, DutyConfigController],
})
export class ClassOpsModule {}
