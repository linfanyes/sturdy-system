import { Controller, Get, Post, Patch, Param, Query, Body, UseGuards } from '@nestjs/common'
import { Feature } from '../common/decorators/feature.decorator'
import { FeatureGuard } from '../common/feature/feature.guard'
import { NotificationService } from './notification.service'
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard'
import { Roles } from '../common/decorators/roles.decorator'
import { CurrentTeacher } from '../common/decorators/current-teacher.decorator'

// 缺陷修复：补充 @Roles 角色限制（此前仅依赖登录态，任何已登录角色均可读他人通知列表，
// 且 super 令牌携带的 sub 会直接命中其他用户通知）。通知仅面向教师/校管。
@Roles('teacher', 'school_admin')
@Feature('notices')
@UseGuards(JwtAuthGuard, FeatureGuard)
@Controller('notifications')
export class NotificationController {
  constructor(private readonly svc: NotificationService) {}

  @Get()
  @UseGuards(JwtAuthGuard)
  list(@CurrentTeacher() t: any, @Query('skip') skip?: string, @Query('take') take?: string) {
    return this.svc.list(t.sub, Math.max(0, Number(skip) || 0), Number(take) || 50)
  }

  @Get('unread-count')
  @UseGuards(JwtAuthGuard)
  unreadCount(@CurrentTeacher() t: any) {
    return this.svc.unreadCount(t.sub).then(count => ({ count }))
  }

  @Patch(':id/read')
  @UseGuards(JwtAuthGuard)
  markRead(@CurrentTeacher() t: any, @Param('id') id: string) {
    return this.svc.markRead(t.sub, id)
  }

  @Post('mark-all-read')
  @UseGuards(JwtAuthGuard)
  markAllRead(@CurrentTeacher() t: any) {
    return this.svc.markAllRead(t.sub)
  }
}
