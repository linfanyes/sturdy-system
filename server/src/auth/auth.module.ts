import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { AuthService } from './auth.service'
import { AuthController } from './auth.controller'
import { WechatService } from './wechat.service'
import { UsersModule } from '../users/users.module'
import { School } from '../school/school.entity'

@Module({
  imports: [UsersModule, TypeOrmModule.forFeature([School])],
  providers: [AuthService, WechatService],
  controllers: [AuthController],
  exports: [AuthService],
})
export class AuthModule {}
