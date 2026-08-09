import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { AnalysisService } from './analysis.service'
import { AnalysisController } from './analysis.controller'
import { Exam } from '../exams/exam.entity'
import { Grade } from '../grades/grade.entity'
import { Student } from '../students/student.entity'
import { ClassItem } from '../classes/class.entity'

@Module({
  imports: [TypeOrmModule.forFeature([Exam, Grade, Student, ClassItem])],
  providers: [AnalysisService],
  controllers: [AnalysisController],
  exports: [AnalysisService],
})
export class AnalysisModule {}