import { Controller, Post, Get, Body, UseGuards } from '@nestjs/common'
import { ParentAuthService } from './parent-auth.service'
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard'
import { Roles } from '../common/decorators/roles.decorator'
import { CurrentParent } from './current-parent.decorator'

@Controller('parent-auth')
@Roles('parent')
export class ParentAuthController {
  constructor(private readonly s: ParentAuthService) {}

  /** 家长凭学生学号 + 密码登录 */
  @Post('login')
  login(@Body() b: { studentNo?: string; password?: string }) {
    return this.s.login((b && b.studentNo) || '', (b && b.password) || '')
  }

  /** 家长绑定微信（自动或手动） */
  @Post('bind-wechat')
  @UseGuards(JwtAuthGuard)
  bindWechat(@Body() b: { code?: string; nickName?: string }, @CurrentParent() p: any) {
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
    return this.s.getHomework(p.classId)
  }

  /** 家长订阅微信通知（wx.login code → openId 落库） */
  @Post('subscribe')
  @UseGuards(JwtAuthGuard)
  subscribe(@Body() b: { code?: string }, @CurrentParent() p: any) {
    return this.s.subscribe(p.studentNo, (b && b.code) || '')
  }

  /** 当前家长的 IM UserSig（前端凭此登录 tim-wx-sdk） */
  @Get('im-user-sig')
  @UseGuards(JwtAuthGuard)
  sig(@CurrentParent() p: any) {
    return this.s.getImUserSig(p)
  }
}
