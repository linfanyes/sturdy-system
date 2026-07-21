import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { ParentContact } from '../parent-contact/parent-contact.entity'
import { Student } from '../students/student.entity'
import { ImModule } from '../im/im.module'
import { ParentAuthService } from './parent-auth.service'
import { ParentAuthController } from './parent-auth.controller'

@Module({
  imports: [TypeOrmModule.forFeature([ParentContact, Student]), ImModule],
  providers: [ParentAuthService],
  controllers: [ParentAuthController],
  exports: [ParentAuthService],
})
export class ParentAuthModule {}
