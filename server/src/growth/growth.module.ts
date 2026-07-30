import { Module, UseGuards } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { Controller } from '@nestjs/common'
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard'
import { Feature } from '../common/decorators/feature.decorator'
import { FeatureGuard } from '../common/feature/feature.guard'
import { GrowthEntry, BehaviorRecord } from './growth.entity'
import { CrudService } from '../common/crud/base.service'
import { CrudController } from '../common/crud/base.controller'
import { Roles } from '../common/decorators/roles.decorator'

class GrowthService extends CrudService<GrowthEntry> {
  constructor(@InjectRepository(GrowthEntry) repo: Repository<GrowthEntry>) {
    super(repo)
  }
}
@Roles('teacher')
@Feature('growth')
@UseGuards(JwtAuthGuard, FeatureGuard)
@Controller('growth-entries')
class GrowthController extends CrudController<GrowthEntry> {
  constructor(s: GrowthService) {
    super(s)
  }
}

class BehaviorService extends CrudService<BehaviorRecord> {
  constructor(@InjectRepository(BehaviorRecord) repo: Repository<BehaviorRecord>) {
    super(repo)
  }
}
@Roles('teacher')
@Feature('behavior')
@UseGuards(JwtAuthGuard, FeatureGuard)
@Controller('behavior-records')
class BehaviorController extends CrudController<BehaviorRecord> {
  constructor(s: BehaviorService) {
    super(s)
  }
}

@Module({
  imports: [TypeOrmModule.forFeature([GrowthEntry, BehaviorRecord])],
  providers: [GrowthService, BehaviorService],
  controllers: [GrowthController, BehaviorController],
})
export class GrowthModule {}
