import { Module, UseGuards } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { Controller } from '@nestjs/common'
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard'
import { Feature } from '../common/decorators/feature.decorator'
import { FeatureGuard } from '../common/feature/feature.guard'
import { AwardRecord, AwardCategory } from './award.entity'
import { CrudService } from '../common/crud/base.service'
import { CrudController } from '../common/crud/base.controller'
import { Roles } from '../common/decorators/roles.decorator'

class AwardService extends CrudService<AwardRecord> {
  constructor(@InjectRepository(AwardRecord) repo: Repository<AwardRecord>) {
    super(repo)
  }
}
@Roles('teacher')
@Feature('rewards')
@UseGuards(JwtAuthGuard, FeatureGuard)
@Controller('award-records')
class AwardController extends CrudController<AwardRecord> {
  constructor(s: AwardService) {
    super(s)
  }
}

class CategoryService extends CrudService<AwardCategory> {
  constructor(@InjectRepository(AwardCategory) repo: Repository<AwardCategory>) {
    super(repo)
  }
}
@Roles('teacher')
@Feature('rewards')
@UseGuards(JwtAuthGuard, FeatureGuard)
@Controller('award-categories')
class CategoryController extends CrudController<AwardCategory> {
  constructor(s: CategoryService) {
    super(s)
  }
}

@Module({
  imports: [TypeOrmModule.forFeature([AwardRecord, AwardCategory])],
  providers: [AwardService, CategoryService],
  controllers: [AwardController, CategoryController],
})
export class AwardModule {}
