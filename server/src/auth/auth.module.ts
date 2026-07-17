import { Module } from '@nestjs/common'
import { AuthService } from './auth.service'
import { AuthController } from './auth.controller'
import { WechatService } from './wechat.service'
import { UsersModule } from '../users/users.module'

@Module({
  imports: [UsersModule],
  providers: [AuthService, WechatService],
  controllers: [AuthController],
  exports: [AuthService],
})
export class AuthModule {}
