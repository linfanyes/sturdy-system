import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Query,
  Body,
  UseGuards,
} from '@nestjs/common'
import { MessageService } from './message.service'
import { CreateMessageDto } from './dto/create-message.dto'
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard'
import { CurrentTeacher } from '../common/decorators/current-teacher.decorator'
import { Roles } from '../common/decorators/roles.decorator'

/**
 * 留言板（家校留言）——替代腾讯云 IM 的持久化消息系统。
 * 教师和家长均可在各自端发送/查看留言，数据持久化到 MySQL，无需额外开通 IM 服务。
 * 支持教师给家长留言、家长给教师留言、以及系统通知。
 * @CurrentTeacher 实际返回 req.user（含 sub=用户ID、role=角色），教师与家长令牌皆可解析。
 */
@UseGuards(JwtAuthGuard)
@Controller('messages')
export class MessageController {
  constructor(private readonly svc: MessageService) {}

  /** GET /api/messages?skip=&take= 当前用户作为收件人的消息列表 */
  @Get()
  list(
    @CurrentTeacher() u: any,
    @Query('skip') skip?: string,
    @Query('take') take?: string,
  ) {
    return this.svc.list(u.sub, u.role, Number(skip) || 0, Number(take) || 20)
  }

  /** GET /api/messages/sent?skip=&take= 当前用户发送的消息 */
  @Get('sent')
  listSent(
    @CurrentTeacher() u: any,
    @Query('skip') skip?: string,
    @Query('take') take?: string,
  ) {
    return this.svc.listSent(u.sub, u.role, Number(skip) || 0, Number(take) || 20)
  }

  /** GET /api/messages/unread-count 当前用户未读消息数 */
  @Get('unread-count')
  unreadCount(@CurrentTeacher() u: any) {
    return this.svc.unreadCount(u.sub, u.role)
  }

  /** GET /api/messages/recipients 获取教师可发消息的收件人列表（家长） */
  @Roles('teacher')
  @Get('recipients')
  recipients(@CurrentTeacher() u: any) {
    return this.svc.listRecipients(u.sub)
  }

  /** POST /api/messages 发送消息 */
  @Post()
  send(@CurrentTeacher() u: any, @Body() dto: CreateMessageDto) {
    return this.svc.send(u.sub, u.role, dto)
  }

  /** PATCH /api/messages/:id/read 标记单条已读（仅收件人本人） */
  @Patch(':id/read')
  markRead(@CurrentTeacher() u: any, @Param('id') id: string) {
    return this.svc.markRead(id, u.sub, u.role)
  }

  /** PATCH /api/messages/mark-all-read 一键全部已读 */
  @Patch('mark-all-read')
  markAllRead(@CurrentTeacher() u: any) {
    return this.svc.markAllRead(u.sub, u.role)
  }

  /** DELETE /api/messages/:id 删除消息（仅收件人或发件人） */
  @Delete(':id')
  remove(@CurrentTeacher() u: any, @Param('id') id: string) {
    return this.svc.remove(id, u.sub, u.role)
  }
}
