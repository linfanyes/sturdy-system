import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { Controller } from '@nestjs/common'
import { GrowthEntry, BehaviorRecord } from './growth.entity'
import { CrudService } from '../common/crud/base.service'
import { CrudController } from '../common/crud/base.controller'

class GrowthService extends CrudService<GrowthEntry> {
  constructor(@InjectRepository(GrowthEntry) repo: Repository<GrowthEntry>) {
    super(repo)
  }
}
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
