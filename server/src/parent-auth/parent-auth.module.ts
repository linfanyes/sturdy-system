import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { ParentContact } from '../parent-contact/parent-contact.entity'
import { Student } from '../students/student.entity'
import { Notice, Homework } from '../school/school.entity'
import { Grade } from '../grades/grade.entity'
import { Exam } from '../exams/exam.entity'
import { ImModule } from '../im/im.module'
import { AuthModule } from '../auth/auth.module'
import { ParentAuthService } from './parent-auth.service'
import { ParentAuthController } from './parent-auth.controller'

@Module({
  imports: [TypeOrmModule.forFeature([ParentContact, Student, Notice, Homework, Grade, Exam, ClassItem]), ImModule, AuthModule],
  providers: [ParentAuthService],
  controllers: [ParentAuthController],
  exports: [ParentAuthService],
})
export class ParentAuthModule {}
