import { Controller, Get, Post, Patch, Param, Query, Body, UseGuards } from '@nestjs/common'
import { NotificationService } from './notification.service'
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard'
import { CurrentTeacher } from '../common/decorators/current-teacher.decorator'

@Controller('notifications')
export class NotificationController {
  constructor(private readonly svc: NotificationService) {}

  @Get()
  @UseGuards(JwtAuthGuard)
  list(@CurrentTeacher() t: any, @Query('skip') skip?: string, @Query('take') take?: string) {
    return this.svc.list(t.sub, Number(skip) || 0, Number(take) || 50)
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
