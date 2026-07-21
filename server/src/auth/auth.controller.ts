import { Controller, Post, Body } from '@nestjs/common'
import { AuthService } from './auth.service'
import { WechatLoginDto } from './dto/wechat-login.dto'

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post('wechat-login')
  wechatLogin(@Body() dto: WechatLoginDto) {
    return this.auth.wechatLogin(dto.code)
  }

  @Post('password-login')
  passwordLogin(@Body() b: { username?: string; password?: string }) {
    return this.auth.passwordLogin(b?.username || '', b?.password || '')
  }
}
