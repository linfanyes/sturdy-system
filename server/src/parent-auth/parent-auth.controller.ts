import { Controller, Post, Get, Body, Req, UseGuards, BadRequestException, UnauthorizedException } from '@nestjs/common'
import { ParentAuthService } from './parent-auth.service'
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard'
import { createRateLimitGuard } from '../common/guards/rate-limit.guard'
import { Roles } from '../common/decorators/roles.decorator'
import { CurrentParent } from './current-parent.decorator'
import { ParentLoginDto, ChangePasswordDto, BindWechatDto, SubscribeDto } from './dto/parent-auth.dto'
import { StudentInfoUpdateService } from '../student-info-update/student-info-update.module'

// 家长登录防暴力破解：单 IP+学号 每分钟最多 10 次
const ParentLoginRateLimit = createRateLimitGuard(60_000, 10)

@Controller('parent-auth')
@Roles('parent')
export class ParentAuthController {
  constructor(
    private readonly s: ParentAuthService,
    private readonly updateSvc: StudentInfoUpdateService,
  ) {}

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

  /** 孩子打卡/考勤汇总（仅限当前家长绑定的学生，按 studentId 隔离） */
  @Get('attendance')
  @UseGuards(JwtAuthGuard)
  attendance(@CurrentParent() p: any) {
    return this.s.getAttendance(p)
  }

  /** 孩子行为表现记录（仅限当前家长绑定的学生，按 studentId 隔离） */
  @Get('behavior')
  @UseGuards(JwtAuthGuard)
  behavior(@CurrentParent() p: any) {
    return this.s.getBehavior(p)
  }

  /** 孩子课表&值日（按 classId 隔离，值日再按孩子姓名匹配） */
  @Get('schedule')
  @UseGuards(JwtAuthGuard)
  schedule(@CurrentParent() p: any) {
    return this.s.getSchedule(p)
  }

  /** 家校沟通记录（仅限当前家长绑定的学生，按 studentId 隔离） */
  @Get('communications')
  @UseGuards(JwtAuthGuard)
  communications(@CurrentParent() p: any) {
    return this.s.getCommunications(p)
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

  /** 多娃切换：切换到另一个孩子的视角 */
  @Post('switch-student')
  @UseGuards(JwtAuthGuard)
  async switchStudent(@CurrentParent() p: any, @Body() b: { studentId: string }) {
    if (!b.studentId) throw new BadRequestException('缺少 studentId')
    return this.s.switchStudent(p, b.studentId)
  }

  /** 多娃考试对比（≥2 个孩子时启用） */
  @Get('compare-kids')
  @UseGuards(JwtAuthGuard)
  async compareKids(@CurrentParent() p: any) {
    return this.s.getKidsComparison(p)
  }

  /** 师兼家角色切换：教师激活家长身份（需已登录教师） */
  @Post('activate-parent')
  @UseGuards(JwtAuthGuard)
  async activateParent(@Req() req: any) {
    const userId = req.user?.sub || req.user?.id
    if (!userId) throw new UnauthorizedException('无效身份')
    return this.s.activateParent(userId)
  }

  /** 家长端：提交学生信息修改申请（需老师审核后入库） */
  @Post('student-update-request')
  @UseGuards(JwtAuthGuard)
  async submitUpdateRequest(@CurrentParent() p: any, @Body() b: { payload: Record<string, any> }) {
    if (!b?.payload || !Object.keys(b.payload).length) throw new BadRequestException('请填写需要修改的信息')
    return this.updateSvc.submit(p, p.studentId, b.payload)
  }

  /** 家长端：查看自己提交的修改申请列表及审核状态 */
  @Get('student-update-requests')
  @UseGuards(JwtAuthGuard)
  async listUpdateRequests(@CurrentParent() p: any) {
    return this.updateSvc.listMine(p)
  }
}
