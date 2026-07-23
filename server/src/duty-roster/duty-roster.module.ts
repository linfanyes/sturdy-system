import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { Controller } from '@nestjs/common'
import { DutyRoster } from './duty.entity'
import { CrudService } from '../common/crud/base.service'
import { CrudController } from '../common/crud/base.controller'

class DutyRosterService extends CrudService<DutyRoster> {
  constructor(@InjectRepository(DutyRoster) repo: Repository<DutyRoster>) {
    super(repo)
  }
}

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
