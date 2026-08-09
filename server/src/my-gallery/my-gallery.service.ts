import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { MyGallery } from './my-gallery.entity'
import { CrudService } from '../common/crud/base.service'

@Injectable()
export class MyGalleryService extends CrudService<MyGallery> {
  constructor(@InjectRepository(MyGallery) r: Repository<MyGallery>) { super(r) }
}
