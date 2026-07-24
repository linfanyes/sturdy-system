import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { Controller } from '@nestjs/common'
import { ClassGallery } from './gallery.entity'
import { CrudService } from '../common/crud/base.service'
import { CrudController } from '../common/crud/base.controller'
import { Roles } from '../common/decorators/roles.decorator'

class GalleryService extends CrudService<ClassGallery> {
  constructor(@InjectRepository(ClassGallery) repo: Repository<ClassGallery>) {
    super(repo)
  }
}
@Roles('teacher')
@Controller('class-galleries')
class GalleryController extends CrudController<ClassGallery> {
  constructor(s: GalleryService) {
    super(s)
  }
}

@Module({
  imports: [TypeOrmModule.forFeature([ClassGallery])],
  providers: [GalleryService],
  controllers: [GalleryController],
})
export class GalleryModule {}
