import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { ParentContact } from '../parent-contact/parent-contact.entity'
import { Student } from '../students/student.entity'
import { Notice, Homework, ScheduleItem } from '../school/school.entity'
import { Grade } from '../grades/grade.entity'
import { Exam } from '../exams/exam.entity'
import { ClassItem } from '../classes/class.entity'
import { Checkin } from '../checkin/checkin.module'
import { BehaviorRecord } from '../growth/growth.entity'
import { DutyRoster } from '../duty-roster/duty.entity'
import { Parent } from '../parent/parent.entity'
import { User } from '../users/user.entity'
import { ImModule } from '../im/im.module'
import { AuthModule } from '../auth/auth.module'
import { ParentAuthService } from './parent-auth.service'
import { ParentAuthController } from './parent-auth.controller'

@Module({
  imports: [TypeOrmModule.forFeature([ParentContact, Student, User, Notice, Homework, ScheduleItem, Grade, Exam, ClassItem, Checkin, BehaviorRecord, DutyRoster, Parent]), ImModule, AuthModule],
  providers: [ParentAuthService],
  controllers: [ParentAuthController],
  exports: [ParentAuthService],
})
export class ParentAuthModule {}
