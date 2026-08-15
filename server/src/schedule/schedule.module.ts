import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { Schedule } from './schedule.entity'
import { ScheduleService } from './schedule.service'
import { TeacherScheduleController, ParentScheduleController } from './schedule.controller'
import { MessagesModule } from '../messages/messages.module'
import { Student } from '../students/student.entity'

@Module({
  imports: [TypeOrmModule.forFeature([Schedule, Student]), MessagesModule],
  controllers: [TeacherScheduleController, ParentScheduleController],
  providers: [ScheduleService],
  exports: [ScheduleService],
})
export class ScheduleModule {}
