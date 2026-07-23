import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { Controller } from '@nestjs/common'
import { RewardRecord, ScoreRecord, GroupScore } from './engagement.entity'
import { CrudService } from '../common/crud/base.service'
import { CrudController } from '../common/crud/base.controller'

class RewardService extends CrudService<RewardRecord> {
  constructor(@InjectRepository(RewardRecord) repo: Repository<RewardRecord>) {
    super(repo)
  }
}
@Controller('reward-records')
class RewardController extends CrudController<RewardRecord> {
  constructor(s: RewardService) {
    super(s)
  }
}

class ScoreService extends CrudService<ScoreRecord> {
  constructor(@InjectRepository(ScoreRecord) repo: Repository<ScoreRecord>) {
    super(repo)
  }
}
@Controller('score-records')
class ScoreController extends CrudController<ScoreRecord> {
  constructor(s: ScoreService) {
    super(s)
  }
}

class GroupService extends CrudService<GroupScore> {
  constructor(@InjectRepository(GroupScore) repo: Repository<GroupScore>) {
    super(repo)
  }
}
@Controller('group-scores')
class GroupController extends CrudController<GroupScore> {
  constructor(s: GroupService) {
    super(s)
  }
}

@Module({
  imports: [TypeOrmModule.forFeature([RewardRecord, ScoreRecord, GroupScore])],
  providers: [RewardService, ScoreService, GroupService],
  controllers: [RewardController, ScoreController, GroupController],
})
export class EngagementModule {}
