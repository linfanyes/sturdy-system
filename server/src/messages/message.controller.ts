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
 * 站内消息（四角色互通版）：
 * - 教师 ↔ 家长
 * - 校管 ↔ 本校教师
 * - 校管 ↔ 超管
 * - 超管 ↔ 全部校管
 * - 校管 ↔ 校管（跨校）
 *
 * @CurrentTeacher 实际返回 req.user（含 sub=用户ID、role=角色），
 * 统一承载四种角色令牌。
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
    return this.svc.list(u.sub, u.role, Math.max(0, Number(skip) || 0), Math.min(Number(take) || 20, 100))
  }

  /** GET /api/messages/sent?skip=&take= 当前用户发送的消息 */
  @Get('sent')
  listSent(
    @CurrentTeacher() u: any,
    @Query('skip') skip?: string,
    @Query('take') take?: string,
  ) {
    return this.svc.listSent(u.sub, u.role, Math.max(0, Number(skip) || 0), Math.min(Number(take) || 20, 100))
  }

  /** GET /api/messages/unread-count 当前用户未读消息数 */
  @Get('unread-count')
  unreadCount(@CurrentTeacher() u: any) {
    return this.svc.unreadCount(u.sub, u.role)
  }

  /**
   * GET /api/messages/recipients
   * 当前登录用户可发送消息的收件人列表。
   * 根据 role 动态返回：
   *   - teacher: 本班家长 + 本校校管
   *   - parent: 班主任/科任老师 + 校管
   *   - school_admin: 本校教师 + 其他校管 + 超管
   *   - super: 全部校管
   */
  @Get('recipients')
  recipients(@CurrentTeacher() u: any) {
    return this.svc.listRecipients(u.sub, u.role, u.schoolId)
  }

  /** POST /api/messages 发送消息（四角色通用） */
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
