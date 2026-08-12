import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { Grade, GradeScore } from './grade.entity'
import { Student } from '../students/student.entity'
import { ClassItem } from '../classes/class.entity'
import { Exam } from '../exams/exam.entity'
import { ClassMembersModule } from '../class-members/class-members.module'
import { AiModule } from '../ai/ai.module'
import { GradesService } from './grades.service'
import { GradesController } from './grades.controller'

@Module({
  imports: [TypeOrmModule.forFeature([Grade, Student, ClassItem, Exam]), ClassMembersModule, AiModule],
  providers: [GradesService],
  controllers: [GradesController],
  exports: [GradesService],
})
export class GradesModule {}
