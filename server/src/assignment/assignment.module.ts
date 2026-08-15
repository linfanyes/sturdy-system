import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { Assignment } from './assignment.entity'
import { AssignmentService } from './assignment.service'
import { TeacherAssignmentController, ParentAssignmentController } from './assignment.controller'
import { Student } from '../students/student.entity'

@Module({
  imports: [TypeOrmModule.forFeature([Assignment, Student])],
  controllers: [TeacherAssignmentController, ParentAssignmentController],
  providers: [AssignmentService],
  exports: [AssignmentService],
})
export class AssignmentModule {}
