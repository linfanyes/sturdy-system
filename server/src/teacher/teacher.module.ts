import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { Controller } from '@nestjs/common'
import { Teacher } from './teacher.entity'
import { CrudService } from '../common/crud/base.service'
import { CrudController } from '../common/crud/base.controller'

class TeacherService extends CrudService<Teacher> {
  constructor(@InjectRepository(Teacher) repo: Repository<Teacher>) {
    super(repo)
  }
}

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
