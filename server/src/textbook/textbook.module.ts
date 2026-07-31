import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { Textbook, TextbookUnit, TextbookKnowledgePoint } from './textbook.entity'
import { User } from '../users/user.entity'
import { ClassItem } from '../classes/class.entity'
import { Student } from '../students/student.entity'
import { TextbookService } from './textbook.service'
import { SchoolAdminTextbookController, TextbookController } from './textbook.controller'
import { AiModule } from '../ai/ai.module'

@Module({
  imports: [
    TypeOrmModule.forFeature([Textbook, TextbookUnit, TextbookKnowledgePoint, User, ClassItem, Student]),
    AiModule,
  ],
  providers: [TextbookService],
  controllers: [SchoolAdminTextbookController, TextbookController],
  exports: [TextbookService],
})
export class TextbookModule {}
