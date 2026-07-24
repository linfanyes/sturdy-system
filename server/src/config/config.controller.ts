import {
  Controller,
  Get,
  Put,
  Param,
  Body,
  UseGuards,
} from '@nestjs/common'
import { ConfigService } from './config.service'
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard'
import { Roles } from '../common/decorators/roles.decorator'
import { CurrentTeacher } from '../common/decorators/current-teacher.decorator'

// 明文下发存在泄露风险的密钥类配置项（仅做脱敏展示，写入时仍可接收明文）
const SECRET_KEYS = new Set(['wxAppSecret', 'imSecretKey', 'aiApiKey'])

function maskSecret(value: string): string {
  if (!value) return ''
  if (value.length <= 4) return '****'
  return value.slice(0, 2) + '****' + value.slice(-2)
}

@Controller('config')
export class ConfigController {
  constructor(private readonly cfg: ConfigService) {}

  @Get('public')
  publicConfig() {
    return this.cfg.publicConfig()
  }

  @Roles('super')
  @Get('app')
  @UseGuards(JwtAuthGuard)
  listApp() {
    // 仅超级管理员可读取平台级配置；密钥类字段脱敏下发，避免明文泄露到前端/日志。
    const rows = this.cfg.listAppConfig()
    return Array.isArray(rows)
      ? rows.map((r) => ({ ...r, value: SECRET_KEYS.has(r.key) ? maskSecret(r.value) : r.value }))
      : rows
  }

  @Roles('super')
  @Put('app/:key')
  @UseGuards(JwtAuthGuard)
  setApp(@Param('key') key: string, @Body() body: { value: string }) {
    return this.cfg.setAppConfig(key, body.value)
  }

  @Roles('teacher')
  @Get('ai')
  @UseGuards(JwtAuthGuard)
  getAi(@CurrentTeacher() t: any) {
    return this.cfg.getAiSettings(t.sub)
  }

  @Roles('teacher')
  @Put('ai')
  @UseGuards(JwtAuthGuard)
  saveAi(@CurrentTeacher() t: any, @Body() dto: any) {
    return this.cfg.saveAiSettings(t.sub, dto)
  }
}
