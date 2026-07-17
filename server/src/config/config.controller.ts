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
import { CurrentTeacher } from '../common/decorators/current-teacher.decorator'

@Controller('config')
export class ConfigController {
  constructor(private readonly cfg: ConfigService) {}

  @Get('public')
  publicConfig() {
    return this.cfg.publicConfig()
  }

  @Get('app')
  @UseGuards(JwtAuthGuard)
  listApp() {
    return this.cfg.listAppConfig()
  }

  @Put('app/:key')
  @UseGuards(JwtAuthGuard)
  setApp(@Param('key') key: string, @Body() body: { value: string }) {
    return this.cfg.setAppConfig(key, body.value)
  }

  @Get('ai')
  @UseGuards(JwtAuthGuard)
  getAi(@CurrentTeacher() t: any) {
    return this.cfg.getAiSettings(t.sub)
  }

  @Put('ai')
  @UseGuards(JwtAuthGuard)
  saveAi(@CurrentTeacher() t: any, @Body() dto: any) {
    return this.cfg.saveAiSettings(t.sub, dto)
  }
}
