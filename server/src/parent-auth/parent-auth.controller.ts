import { Controller, Post, Get, Body, UseGuards } from '@nestjs/common'
import { ParentAuthService } from './parent-auth.service'
import { ParentAuthGuard } from './parent-auth.guard'
import { CurrentParent } from './current-parent.decorator'

@Controller('parent-auth')
export class ParentAuthController {
  constructor(private readonly s: ParentAuthService) {}

  /** 家长手机号登录：返回家长 JWT 与 IM 账号 */
  @Post('login')
  login(@Body() b: { phone?: string }) {
    return this.s.login((b && b.phone) || '')
  }

  /** 当前家长信息 + 其孩子列表 */
  @Get('me')
  @UseGuards(ParentAuthGuard)
  me(@CurrentParent() p: any) {
    return this.s.getMe(p)
  }

  /** 当前家长的 IM UserSig（前端凭此登录 tim-wx-sdk） */
  @Get('im-user-sig')
  @UseGuards(ParentAuthGuard)
  sig(@CurrentParent() p: any) {
    return this.s.getImUserSig(p)
  }

  /** 孩子所在班级的通知 */
  @Get('notices')
  @UseGuards(ParentAuthGuard)
  async notices(@CurrentParent() p: any) {
    // 先取孩子列表，再查通知
    const me = await this.s.getMe(p)
    return this.s.getNotices(me.kids)
  }
}
