import { Controller, Post, Get, Body, UseGuards } from '@nestjs/common'
import { ParentAuthService } from './parent-auth.service'
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard'
import { createRateLimitGuard } from '../common/guards/rate-limit.guard'
import { Roles } from '../common/decorators/roles.decorator'
import { CurrentParent } from './current-parent.decorator'
import { ParentLoginDto, ChangePasswordDto, BindWechatDto, SubscribeDto } from './dto/parent-auth.dto'

// 家长登录防暴力破解：单 IP+学号 每分钟最多 10 次
const ParentLoginRateLimit = createRateLimitGuard(60_000, 10)

@Controller('parent-auth')
@Roles('parent')
export class ParentAuthController {
  constructor(private readonly s: ParentAuthService) {}

  /** 家长凭学生学号 + 密码登录 */
  @Post('login')
  @UseGuards(ParentLoginRateLimit)
  login(@Body() b: ParentLoginDto) {
    return this.s.login((b && b.studentNo) || '', (b && b.password) || '')
  }

  /** 家长修改登录密码（需已登录，校验原密码） */
  @Post('change-password')
  @UseGuards(JwtAuthGuard)
  changePassword(
    @Body() b: ChangePasswordDto,
    @CurrentParent() p: any,
  ) {
    return this.s.changePassword(p, (b && b.oldPassword) || '', (b && b.newPassword) || '')
  }

  /** 家长绑定微信（自动或手动） */
  @Post('bind-wechat')
  @UseGuards(JwtAuthGuard)
  bindWechat(@Body() b: BindWechatDto, @CurrentParent() p: any) {
    return this.s.bindWechat((b && b.code) || '', p, (b && b.nickName) || '')
  }

  /** 当前家长信息 + 孩子 */
  @Get('me')
  @UseGuards(JwtAuthGuard)
  me(@CurrentParent() p: any) {
    return this.s.getMe(p)
  }

  /** 孩子所在班级的通知 */
  @Get('notices')
  @UseGuards(JwtAuthGuard)
  notices(@CurrentParent() p: any) {
    return this.s.getNotices(p.classId)
  }

  /** 考试成绩明细 + 趋势分析 */
  @Get('exams')
  @UseGuards(JwtAuthGuard)
  exams(@CurrentParent() p: any) {
    return this.s.getExams(p)
  }

  /** 孩子所在班级的作业 */
  @Get('homework')
  @UseGuards(JwtAuthGuard)
  homework(@CurrentParent() p: any) {
    return this.s.getHomework(p)
  }

  /** 家长订阅微信通知（wx.login code → openId 落库） */
  @Post('subscribe')
  @UseGuards(JwtAuthGuard)
  subscribe(@Body() b: SubscribeDto, @CurrentParent() p: any) {
    return this.s.subscribe(p.studentNo, (b && b.code) || '')
  }

  /** 当前家长的 IM UserSig（前端凭此登录 tim-wx-sdk） */
  @Get('im-user-sig')
  @UseGuards(JwtAuthGuard)
  sig(@CurrentParent() p: any) {
    return this.s.getImUserSig(p)
  }
}
