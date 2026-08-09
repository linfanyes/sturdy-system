import { Controller, UseGuards } from '@nestjs/common'
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard'
import { Feature } from '../common/decorators/feature.decorator'
import { FeatureGuard } from '../common/feature/feature.guard'
import { Roles } from '../common/decorators/roles.decorator'
import { MyGallery } from './my-gallery.entity'
import { MyGalleryService } from './my-gallery.service'
import { CrudController } from '../common/crud/base.controller'

@Roles('teacher')
@Feature('gallery')
@UseGuards(JwtAuthGuard, FeatureGuard)
@Controller('my-galleries')
export class MyGalleryController extends CrudController<MyGallery> {
  constructor(s: MyGalleryService) { super(s) }
}
