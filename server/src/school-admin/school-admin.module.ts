import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { SchoolAdmin } from './school-admin.entity'
import { User } from '../users/user.entity'
import { Student } from '../students/student.entity'
import { School } from '../school/school.entity'
import { ClassItem } from '../classes/class.entity'
import { Grade } from '../grades/grade.entity'
import { Exam } from '../exams/exam.entity'
import { Notice, Attendance, Homework } from '../school/school.entity'
import { ClassMember } from '../class-members/class-member.entity'
import { ClassMembersModule } from '../class-members/class-members.module'
import { SchoolAdminService } from './school-admin.service'
import { SchoolAdminController } from './school-admin.controller'
import { AuditModule } from '../audit/audit.module'
import { AiModule } from '../ai/ai.module'

@Module({
  imports: [
    TypeOrmModule.forFeature([SchoolAdmin, User, Student, School, ClassItem, Grade, Exam, Notice, Attendance, Homework, ClassMember]),
    AuditModule,
    ClassMembersModule,
    AiModule,
  ],
  providers: [SchoolAdminService],
  controllers: [SchoolAdminController],
  exports: [SchoolAdminService],
})
export class SchoolAdminModule {}
