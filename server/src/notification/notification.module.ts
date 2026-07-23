import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { NotificationItem } from './notification.entity'
import { NotificationService } from './notification.service'
import { NotificationController } from './notification.controller'

@Module({
  imports: [TypeOrmModule.forFeature([NotificationItem])],
  providers: [NotificationService],
  controllers: [NotificationController],
  exports: [NotificationService],
})
export class NotificationModule {}
