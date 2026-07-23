import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { TeachingCalendarItem } from './teaching-calendar.entity'
import { TeachingCalendarService } from './teaching-calendar.service'
import { TeachingCalendarController } from './teaching-calendar.controller'

@Module({
  imports: [TypeOrmModule.forFeature([TeachingCalendarItem])],
  providers: [TeachingCalendarService],
  controllers: [TeachingCalendarController],
  exports: [TeachingCalendarService],
})
export class TeachingCalendarModule {}
