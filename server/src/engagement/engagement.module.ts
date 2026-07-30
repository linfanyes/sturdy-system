import { Module, UseGuards } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { Controller } from '@nestjs/common'
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard'
import { Feature } from '../common/decorators/feature.decorator'
import { FeatureGuard } from '../common/feature/feature.guard'
import { RewardRecord, ScoreRecord, GroupScore } from './engagement.entity'
import { CrudService } from '../common/crud/base.service'
import { CrudController } from '../common/crud/base.controller'
import { Roles } from '../common/decorators/roles.decorator'

class RewardService extends CrudService<RewardRecord> {
  constructor(@InjectRepository(RewardRecord) repo: Repository<RewardRecord>) {
    super(repo)
  }
}
@Roles('teacher')
@Feature('rewards')
@UseGuards(JwtAuthGuard, FeatureGuard)
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
@Roles('teacher')
@Feature('rewards')
@UseGuards(JwtAuthGuard, FeatureGuard)
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
@Roles('teacher')
@Feature('rewards')
@UseGuards(JwtAuthGuard, FeatureGuard)
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
