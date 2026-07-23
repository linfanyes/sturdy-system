import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { Controller } from '@nestjs/common'
import { ClassItem } from './class.entity'
import { CrudService } from '../common/crud/base.service'
import { CrudController } from '../common/crud/base.controller'

class ClassesService extends CrudService<ClassItem> {
  constructor(@InjectRepository(ClassItem) repo: Repository<ClassItem>) {
    super(repo)
  }
}

@Controller('classes')
class ClassesController extends CrudController<ClassItem> {
  constructor(s: ClassesService) {
    super(s)
  }
}

@Module({
  imports: [TypeOrmModule.forFeature([ClassItem])],
  providers: [ClassesService],
  controllers: [ClassesController],
})
export class ClassesModule {}
