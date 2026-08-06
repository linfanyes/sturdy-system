import { Controller, Get, Post, Patch, Delete, Body, Param, UseGuards } from '@nestjs/common'
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard'
import { Roles } from '../common/decorators/roles.decorator'
import { CurrentTeacher } from '../common/decorators/current-teacher.decorator'
import { ChatHistoryService } from './chat-history.service'

@Roles('teacher')
@UseGuards(JwtAuthGuard)
@Controller('chat-sessions')
export class ChatHistoryController {
  constructor(private readonly svc: ChatHistoryService) {}

  @Post()
  create(@CurrentTeacher() t: any, @Body() dto: { title?: string }) {
    return this.svc.create(t.sub, dto)
  }

  @Get()
  list(@CurrentTeacher() t: any) {
    return this.svc.list(t.sub)
  }

  @Get(':id')
  detail(@CurrentTeacher() t: any, @Param('id') id: string) {
    return this.svc.detail(t.sub, id)
  }

  @Patch(':id/messages')
  append(@CurrentTeacher() t: any, @Param('id') id: string, @Body() dto: { role: 'user' | 'assistant'; content: string }) {
    return this.svc.append(t.sub, id, dto.role, dto.content)
  }

  @Patch(':id/pin')
  togglePin(@CurrentTeacher() t: any, @Param('id') id: string) {
    return this.svc.togglePin(t.sub, id)
  }

  @Delete(':id')
  remove(@CurrentTeacher() t: any, @Param('id') id: string) {
    return this.svc.remove(t.sub, id)
  }
}