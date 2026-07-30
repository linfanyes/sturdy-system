import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Query,
  Body,
  UseGuards,
} from '@nestjs/common'
import { MessageService } from './message.service'
import { CreateMessageDto } from './dto/create-message.dto'
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard'
import { CurrentTeacher } from '../common/decorators/current-teacher.decorator'

/**
 * 消息中心后端接口。
 * 守卫与取当前用户装饰器对齐项目现有 Notice/Notification 模块。
 * @CurrentTeacher 实际返回 req.user（含 sub=用户ID、role=角色），教师与家长令牌皆可解析。
 */
@Controller('messages')
@UseGuards(JwtAuthGuard)
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

  /** POST /api/messages 发送消息（body 校验，缺必填返回 400） */
  @Post()
  send(@CurrentTeacher() u: any, @Body() dto: CreateMessageDto) {
    return this.svc.send(u.sub, u.role, dto)
  }

  /** PATCH /api/messages/:id/read 标记单条已读（仅收件人本人） */
  @Patch(':id/read')
  markRead(@CurrentTeacher() u: any, @Param('id') id: string) {
    return this.svc.markRead(id, u.sub, u.role)
  }
}
