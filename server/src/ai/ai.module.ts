import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { AiService } from './ai.service'
import { AiController } from './ai.controller'
import { ConfigModule } from '../config/config.module'
import { User } from '../users/user.entity'
import { ClassItem } from '../classes/class.entity'
import { Student } from '../students/student.entity'
import { Teacher } from '../teacher/teacher.entity'
import { Grade } from '../grades/grade.entity'
import { Exam } from '../exams/exam.entity'
import { AwardRecord } from '../award/award.entity'
import { NoteItem } from '../notes/notes.entity'

@Module({
  // 注入常见实体用于在 AI 对话中自动构造本地上下文
  imports: [
    ConfigModule,
    TypeOrmModule.forFeature([User, ClassItem, Student, Teacher, Grade, Exam, AwardRecord, NoteItem]),
  ],
  providers: [AiService],
  controllers: [AiController],
  exports: [AiService],
})
export class AiModule {}
