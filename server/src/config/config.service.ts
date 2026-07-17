import { Injectable, OnModuleInit } from '@nestjs/common'
import { ConfigService as EnvConfigService } from '@nestjs/config'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { AppConfig } from './app-config.entity'
import { AiSettings } from './ai-settings.entity'

@Injectable()
export class ConfigService implements OnModuleInit {
  constructor(
    @InjectRepository(AppConfig)
    private readonly appRepo: Repository<AppConfig>,
    @InjectRepository(AiSettings)
    private readonly aiRepo: Repository<AiSettings>,
    private readonly env: EnvConfigService,
  ) {}

  async onModuleInit() {
    await this.seed()
  }

  /** 用环境变量首次填充平台配置（仅当 key 不存在时） */
  private async seed() {
    const defaults: Array<{ key: string; value: string; description: string }> = [
      {
        key: 'defaultSubjects',
        value:
          this.env.get('DEFAULT_SUBJECTS') ||
          '语文,数学,英语,科学,品德,音乐,美术,体育,综合实践,信息技术',
        description: '默认任教学科（逗号分隔）',
      },
      {
        key: 'loginCode',
        value: this.env.get('LOGIN_CODE') || '1314520',
        description: '小程序登录码',
      },
      {
        key: 'aiBaseUrl',
        value: this.env.get('AI_BASE_URL') || '',
        description: 'AI 接口地址',
      },
      {
        key: 'aiApiKey',
        value: this.env.get('AI_API_KEY') || '',
        description: 'AI 密钥',
      },
      {
        key: 'aiTextModel',
        value: this.env.get('AI_TEXT_MODEL') || 'qwen-plus',
        description: '文本模型',
      },
      {
        key: 'aiVisionModel',
        value: this.env.get('AI_VISION_MODEL') || 'qwen-vl-plus',
        description: '多模态模型',
      },
      {
        key: 'aiTemperature',
        value: String(this.env.get('AI_TEMPERATURE') || 0.7),
        description: '温度',
      },
      {
        key: 'aiName',
        value: this.env.get('AI_NAME') || '小林子',
        description: 'AI 名字',
      },
      {
        key: 'aiSystemPrompt',
        value:
          this.env.get('AI_SYSTEM_PROMPT') ||
          '你是一位耐心、专业的中国中小学班主任助手。',
        description: '系统提示词',
      },
    ]
    for (const d of defaults) {
      const exist = await this.appRepo.findOne({ where: { key: d.key } })
      if (!exist) await this.appRepo.save(this.appRepo.create(d))
    }
  }

  listAppConfig() {
    return this.appRepo.find({ order: { key: 'ASC' } })
  }

  async getAppConfigValue(key: string): Promise<string | undefined> {
    const c = await this.appRepo.findOne({ where: { key } })
    return c?.value
  }

  async setAppConfig(key: string, value: string, description?: string) {
    let c = await this.appRepo.findOne({ where: { key } })
    if (!c) c = this.appRepo.create({ key })
    c.value = value
    if (description) c.description = description
    return this.appRepo.save(c)
  }

  /** 下发给小程序的公开配置（剔除敏感项） */
  async publicConfig() {
    const subjects = (await this.getAppConfigValue('defaultSubjects')) || ''
    return {
      defaultSubjects: subjects.split(',').map((s) => s.trim()).filter(Boolean),
    }
  }

  /** 取教师的 AI 设置；无则回退平台默认值 */
  async getAiSettings(teacherId: string): Promise<AiSettings> {
    let s = await this.aiRepo.findOne({ where: { teacherId } })
    if (!s) {
      s = this.aiRepo.create({
        teacherId,
        baseUrl: (await this.getAppConfigValue('aiBaseUrl')) || '',
        apiKey: (await this.getAppConfigValue('aiApiKey')) || '',
        textModel: (await this.getAppConfigValue('aiTextModel')) || 'qwen-plus',
        visionModel:
          (await this.getAppConfigValue('aiVisionModel')) || 'qwen-vl-plus',
        temperature: parseFloat(
          (await this.getAppConfigValue('aiTemperature')) || '0.7',
        ),
        aiName: (await this.getAppConfigValue('aiName')) || '小林子',
        systemPrompt: (await this.getAppConfigValue('aiSystemPrompt')) || '',
      })
    }
    return s
  }

  async saveAiSettings(teacherId: string, dto: Partial<AiSettings>) {
    let s = await this.aiRepo.findOne({ where: { teacherId } })
    if (!s) s = this.aiRepo.create({ teacherId })
    Object.assign(s, dto, { teacherId })
    return this.aiRepo.save(s)
  }
}
