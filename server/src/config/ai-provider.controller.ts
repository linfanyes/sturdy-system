import { Controller, Get, Post, Patch, Delete, Body, Param, UseGuards } from '@nestjs/common'
import { AiProviderService } from './ai-provider.service'
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard'
import { Roles } from '../common/decorators/roles.decorator'

@Controller('ai-providers')
export class AiProviderController {
  constructor(private readonly svc: AiProviderService) {}

  // 任意已登录用户均可查看（教师端配置时需选择服务商）
  @Get()
  @UseGuards(JwtAuthGuard)
  list() {
    return this.svc.list()
  }

  // 仅超管可增删改
  @Roles('super')
  @Post()
  @UseGuards(JwtAuthGuard)
  create(@Body() dto: any) {
    return this.svc.create(dto)
  }

  @Roles('super')
  @Patch(':code')
  @UseGuards(JwtAuthGuard)
  update(@Param('code') code: string, @Body() dto: any) {
    return this.svc.update(code, dto)
  }

  @Roles('super')
  @Delete(':code')
  @UseGuards(JwtAuthGuard)
  remove(@Param('code') code: string) {
    return this.svc.remove(code)
  }
}
