import { Module, UseGuards } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { Controller } from '@nestjs/common'
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard'
import { Feature } from '../common/decorators/feature.decorator'
import { FeatureGuard } from '../common/feature/feature.guard'
import { DutyRoster } from './duty.entity'
import { CrudService } from '../common/crud/base.service'
import { CrudController } from '../common/crud/base.controller'
import { Roles } from '../common/decorators/roles.decorator'

class DutyRosterService extends CrudService<DutyRoster> {
  constructor(@InjectRepository(DutyRoster) repo: Repository<DutyRoster>) {
    super(repo)
  }
}

@Roles('teacher')
@Feature('duty')
@UseGuards(JwtAuthGuard, FeatureGuard)
@Controller('duty-rosters')
class DutyRosterController extends CrudController<DutyRoster> {
  constructor(s: DutyRosterService) {
    super(s)
  }
}

@Module({
  imports: [TypeOrmModule.forFeature([DutyRoster])],
  providers: [DutyRosterService],
  controllers: [DutyRosterController],
})
export class DutyRosterModule {}
