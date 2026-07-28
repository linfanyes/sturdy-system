import {
  Controller,
  Get,
  Put,
  Post,
  Patch,
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

  /**
   * 批量保存平台配置（前端平台配置页一次性提交所有字段）。
   * body: { items: [{ key, value }] }；密钥类字段若为空且前端标记为脱敏态，
   * 由前端在调用前剔除，这里直接覆盖写入。
   */
  @Roles('super')
  @Put('app')
  @UseGuards(JwtAuthGuard)
  saveApp(@Body() body: { items?: { key: string; value: string }[] }) {
    return this.cfg.saveAppConfig(body?.items || [])
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

  /**
   * 查询服务商可用模型列表（实时查询 /models，失败回退预设默认）。
   * 任意已登录用户均可调用；baseUrl / apiKey 由客户端传入（不泄露平台密钥）。
   * 支持传入 providerCode 自动从 ai_providers 表解析 baseUrl。
   */
  @Post('ai/models')
  @UseGuards(JwtAuthGuard)
  listProviderModels(@Body() dto: { provider?: string; providerCode?: string; baseUrl?: string; apiKey?: string }) {
    return this.cfg.listProviderModels(dto || {})
  }

  /**
   * 教师读取平台 AI 默认配置（作为教师个人 AI 设置的兜底默认值）。
   * 复用 getAiSettings：无教师个人设置时回退平台默认值。
   */
  @Roles('teacher')
  @Get('teacher/ai-defaults')
  @UseGuards(JwtAuthGuard)
  getTeacherAiDefaults(@CurrentTeacher() t: any) {
    return this.cfg.getAiSettings(t.sub)
  }

  /** 教师读取个人 AI 设置（无则回退平台默认值） */
  @Roles('teacher')
  @Get('ai-settings')
  @UseGuards(JwtAuthGuard)
  getAiSettings(@CurrentTeacher() t: any) {
    return this.cfg.getAiSettings(t.sub)
  }

  /** 教师保存个人 AI 设置（web 用 PATCH；保留原有 @Put('ai') 超管域不变） */
  @Roles('teacher')
  @Patch('ai-settings')
  @UseGuards(JwtAuthGuard)
  saveAiSettings(@CurrentTeacher() t: any, @Body() dto: any) {
    return this.cfg.saveAiSettings(t.sub, dto)
  }

  /**
   * 教师读取平台应用配置（仅公开配置，不含敏感密钥）。
   * 仅返回教师需要的公开配置项，避免密钥脱敏下发。
   */
  @Roles('teacher')
  @Get('app-config')
  @UseGuards(JwtAuthGuard)
  async getAppConfig() {
    const rows = await this.cfg.listAppConfig()
    // 仅返回教师需要的公开配置键
    const publicKeys = new Set([
      'theme', 'semester', 'schoolYear',
      'loginCode', 'defaultSubjects',
      'aiTextModel', 'aiVisionModel', 'aiImageModel', 'aiVideoModel',
      'aiTemperature', 'aiName', 'aiBaseUrl',
      'wxAppId', 'imSdkAppId', // 公开 ID 类（非密钥）
    ])
    const map: Record<string, string> = {}
    for (const r of rows) {
      if (publicKeys.has(r.key)) {
        map[r.key] = r.value
      }
    }
    return map
  }

  /**
   * 教师保存应用偏好（如 theme/semester/schoolYear）。
   * 仅允许非敏感的特定键，避免越权改写平台敏感配置（apiKey/secret 等仍由超管 @Put('app') 管理）。
   */
  @Roles('teacher')
  @Patch('app-config')
  @UseGuards(JwtAuthGuard)
  async saveTeacherAppConfig(@Body() body: { theme?: string; semester?: string; schoolYear?: string }) {
    const allowed = ['theme', 'semester', 'schoolYear']
    const items = allowed
      .filter((k) => (body as any)?.[k] !== undefined)
      .map((k) => ({ key: k, value: String((body as any)[k]) }))
    return this.cfg.saveAppConfig(items)
  }
}
