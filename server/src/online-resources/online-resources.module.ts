import { Module } from '@nestjs/common'
import { OnlineResourcesController } from './online-resources.controller'
import { OnlineResourcesService } from './online-resources.service'

@Module({
  controllers: [OnlineResourcesController],
  providers: [OnlineResourcesService],
})
export class OnlineResourcesModule {}
