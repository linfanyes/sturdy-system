import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { MyGallery } from './my-gallery.entity'
import { MyGalleryService } from './my-gallery.service'
import { MyGalleryController } from './my-gallery.controller'

@Module({
  imports: [TypeOrmModule.forFeature([MyGallery])],
  providers: [MyGalleryService],
  controllers: [MyGalleryController],
})
export class MyGalleryModule {}
