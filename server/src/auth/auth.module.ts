import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { AuthService } from './auth.service'
import { AuthController } from './auth.controller'
import { WechatService } from './wechat.service'
import { UsersModule } from '../users/users.module'
import { SchoolAdmin } from '../school-admin/school-admin.entity'
import { Student } from '../students/student.entity'
import { School } from '../school/school.entity'
import { Parent } from '../parent/parent.entity'
import { AuditModule } from '../audit/audit.module'

@Module({
  imports: [UsersModule, TypeOrmModule.forFeature([SchoolAdmin, Student, School, Parent]), AuditModule],
  providers: [AuthService, WechatService],
  controllers: [AuthController],
  exports: [AuthService, WechatService],
})
export class AuthModule {}
