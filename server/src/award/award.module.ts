import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { Controller } from '@nestjs/common'
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
