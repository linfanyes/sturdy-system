import { Controller, Post, Body, UseGuards, Get, Req } from '@nestjs/common'
import { AuthService } from './auth.service'
import { WechatLoginDto } from './dto/wechat-login.dto'
import { UnifiedLoginDto, AdminLoginDto } from './dto/unified-login.dto'
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard'
import { createRateLimitGuard } from '../common/guards/rate-limit.guard'

// 密码登录类接口：每分钟最多 10 次（按 IP + 用户名 防暴力破解）
const LoginRateLimit = createRateLimitGuard(60_000, 10)

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  /** 统一登录：user + pass → 自动识别超管/学校管理员/教师/家长 */
  @Post('unified-login')
  @UseGuards(LoginRateLimit)
  unifiedLogin(@Body() b: UnifiedLoginDto) {
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
  bindParent(@Body() b: { code?: string; studentNo?: string; password?: string }) {
    return this.auth.bindWechatParent(b?.code || '', b?.studentNo || '', b?.password)
  }

  /** 微信统一绑定：输入教师编号或学生学号，自动判别身份 */
  @Post('bind-by-number')
  bindByNumber(@Body() b: { code?: string; number?: string; nickName?: string; password?: string }) {
    return this.auth.bindByNumber(b?.code || '', b?.number || '', b?.nickName || '', b?.password)
  }

  /** 教师密码登录（已由学校管理员绑定学校） */
  @Post('password-login')
  @UseGuards(LoginRateLimit)
  passwordLogin(@Body() b: { username?: string; password?: string }) {
    return this.auth.passwordLogin(b?.username || '', b?.password || '')
  }

  /**
   * 当前登录态功能档案：返回 role / schoolId / effectiveFeatures（学校级∩教师级实际可用）
   * / rawFeatures（原始教师级配置）/ schoolFeatureFlags（学校级开关）/ user。
   * 供 Web / 小程序登录后刷新权限、做「有效权限预览」与菜单显隐。
   */
  @Get('me')
  @UseGuards(JwtAuthGuard)
  me(@Req() req: any) {
    return this.auth.me(req.user)
  }
}
