import { Controller, Post, Body } from '@nestjs/common'
import { AuthService } from './auth.service'
import { WechatLoginDto } from './dto/wechat-login.dto'

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  /** 统一登录：user + pass → 自动识别超管/学校管理员/教师/家长 */
  @Post('unified-login')
  unifiedLogin(@Body() b: { username?: string; password?: string }) {
    return this.auth.unifiedLogin(b?.username || '', b?.password || '')
  }

  /** 微信登录 → 若未绑定则返回 needsBind=true + openid */
  @Post('wechat-login')
  wechatLogin(@Body() dto: WechatLoginDto) {
    return this.auth.wechatLogin(dto.code)
  }

  /** 微信绑教师账号 */
  @Post('bind-teacher')
  bindTeacher(@Body() b: { code?: string; username?: string; password?: string }) {
    return this.auth.bindWechatTeacher(b?.code || '', b?.username || '', b?.password || '')
  }

  /** 微信绑家长（学号） */
  @Post('bind-parent')
  bindParent(@Body() b: { code?: string; studentNo?: string }) {
    return this.auth.bindWechatParent(b?.code || '', b?.studentNo || '')
  }

  /** 教师密码登录（已由学校管理员绑定学校） */
  @Post('password-login')
  passwordLogin(@Body() b: { username?: string; password?: string }) {
    return this.auth.passwordLogin(b?.username || '', b?.password || '')
  }
}
