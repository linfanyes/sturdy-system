import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { AuthService } from './auth.service'
import { AuthController } from './auth.controller'
import { WechatService } from './wechat.service'
import { WechatAuthService } from './wechat-auth.service'
import { UsersModule } from '../users/users.module'
import { SchoolAdmin } from '../school-admin/school-admin.entity'
import { Student } from '../students/student.entity'
import { School } from '../school/school.entity'
import { Parent } from '../parent/parent.entity'
import { AuditModule } from '../audit/audit.module'
import { StudentParentModule } from '../student-parent/student-parent.module'

@Module({
  imports: [
    UsersModule,
    TypeOrmModule.forFeature([SchoolAdmin, Student, School, Parent]),
    AuditModule,
    StudentParentModule,
  ],
  providers: [AuthService, WechatService, WechatAuthService],
  controllers: [AuthController],
  exports: [AuthService, WechatService, WechatAuthService],
})
export class AuthModule {}
