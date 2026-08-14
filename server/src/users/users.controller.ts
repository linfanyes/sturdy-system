import { Controller, Get, Put, Patch, Body, UseGuards } from '@nestjs/common'
import { UsersService } from './users.service'
import { UpdateProfileDto } from './dto/update-profile.dto'
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard'
import { Roles } from '../common/decorators/roles.decorator'
import { CurrentTeacher } from '../common/decorators/current-teacher.decorator'

@Roles('teacher')
@Controller('users')
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @Get('me')
  @UseGuards(JwtAuthGuard)
  async me(@CurrentTeacher() t: any) {
    const u = await this.users.findById(t.sub)
    // 安全修复：只返回非敏感字段，杜绝 passwordHash / sessionKey / openid 泄露。
    // 微信 openid 仅以「是否绑定 + 尾号」形式返回，满足前端展示且不暴露原始标识。
    return {
      id: u.id,
      name: u.name,
      username: u.username,
      school: u.school,
      schoolId: u.schoolId,
      phone: u.phone,
      gender: u.gender,
      position: u.position,
      positions: u.positions,
      grade: u.grade,
      email: u.email,
      avatar: u.avatar,
      motto: u.motto,
      teacherNo: u.teacherNo,
      wechatName: u.wechatName,
      theme: u.theme,
      colorScheme: u.colorScheme,
      fontSize: u.fontSize,
      features: u.features,
      enabled: u.enabled,
      subject: u.subject,
      subjects: u.subjects,
      term: u.term,
      wechatBound: !!u.openid,
      wechatOpenidTail: u.openid ? u.openid.slice(-6) : '',
    }
  }

  @Put('me')
  @UseGuards(JwtAuthGuard)
  updateMe(@CurrentTeacher() t: any, @Body() dto: UpdateProfileDto) {
    return this.users.update(t.sub, dto)
  }

  @Patch('me')
  @UseGuards(JwtAuthGuard)
  patchMe(@CurrentTeacher() t: any, @Body() dto: UpdateProfileDto) {
    return this.users.update(t.sub, dto)
  }
}
