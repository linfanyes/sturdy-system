import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { Message } from './message.entity'
import { MessageService } from './message.service'
import { MessageController } from './message.controller'
import { ParentContact } from '../parent-contact/parent-contact.entity'
import { ClassItem } from '../classes/class.entity'
import { Student } from '../students/student.entity'
import { User } from '../users/user.entity'
import { SchoolAdmin } from '../school-admin/school-admin.entity'
import { School } from '../school/school.entity'

@Module({
  imports: [TypeOrmModule.forFeature([Message, ParentContact, ClassItem, Student, User, SchoolAdmin, School])],
  providers: [MessageService],
  controllers: [MessageController],
  exports: [MessageService],
})
export class MessagesModule {}
