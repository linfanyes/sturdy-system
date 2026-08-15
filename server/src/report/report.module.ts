import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { Report } from './report.entity'
import { ReportService } from './report.service'
import { ReportBatchService } from './report.batch.service'
import { TeacherReportController, ParentReportController } from './report.controller'
import { Grade } from '../grades/grade.entity'
import { MoodCheckIn } from '../mood/mood.entity'
import { HabitCheckin } from '../habit/habit.entity'
import { SafetyReport } from '../safety/safety.entity'
import { Student } from '../students/student.entity'
import { ClassItem } from '../classes/class.entity'
import { AiModule } from '../ai/ai.module'
import { MessagesModule } from '../messages/messages.module'

@Module({
  imports: [
    TypeOrmModule.forFeature([Report, Grade, MoodCheckIn, HabitCheckin, SafetyReport, Student, ClassItem]),
    AiModule,
    MessagesModule,
  ],
  controllers: [TeacherReportController, ParentReportController],
  providers: [ReportService, ReportBatchService],
  exports: [ReportService],
})
export class ReportModule {}
