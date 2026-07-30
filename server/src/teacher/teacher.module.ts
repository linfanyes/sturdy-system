import { Module, UseGuards } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { Controller } from '@nestjs/common'
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard'
import { Feature } from '../common/decorators/feature.decorator'
import { FeatureGuard } from '../common/feature/feature.guard'
import { Teacher } from './teacher.entity'
import { CrudService } from '../common/crud/base.service'
import { CrudController } from '../common/crud/base.controller'
import { Roles } from '../common/decorators/roles.decorator'

class TeacherService extends CrudService<Teacher> {
  constructor(@InjectRepository(Teacher) repo: Repository<Teacher>) {
    super(repo)
  }
}

@Roles('teacher')
@Feature('teachers')
@UseGuards(JwtAuthGuard, FeatureGuard)
@Controller('teachers')
class TeacherController extends CrudController<Teacher> {
  constructor(s: TeacherService) {
    super(s)
  }
}

@Module({
  imports: [TypeOrmModule.forFeature([Teacher])],
  providers: [TeacherService],
  controllers: [TeacherController],
})
export class TeacherModule {}
