import { Injectable, OnModuleInit } from '@nestjs/common'
import { ConfigService as EnvConfigService } from '@nestjs/config'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { AppConfig } from './app-config.entity'
import { AiSettings } from './ai-settings.entity'
import { AiProvider } from './ai-provider.entity'
import { fetchProviderModels, type ProviderModelsResult } from './provider-models'

@Injectable()
export class ConfigService implements OnModuleInit {
  constructor(
    @InjectRepository(AppConfig)
    private readonly appRepo: Repository<AppConfig>,
    @InjectRepository(AiSettings)
    private readonly aiRepo: Repository<AiSettings>,
    @InjectRepository(AiProvider)
    private readonly providerRepo: Repository<AiProvider>,
    private readonly env: EnvConfigService,
  ) {}

  async onModuleInit() {
    await this.seed()
    await this.migrateModelDefaults()
    await this.migrateImDefaults()
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
        key: 'aiImageModel',
        value: this.env.get('AI_IMAGE_MODEL') || '',
        description: '文生图模型',
      },
      {
        key: 'aiVideoModel',
        value: this.env.get('AI_VIDEO_MODEL') || '',
        description: '文生视频模型',
      },
      {
        key: 'aiResourceModels',
        value: this.env.get('AI_RESOURCE_MODELS') || '{}',
        description: '按场景覆盖默认模型（JSON）',
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
      {
        key: 'wxAppId',
        value: this.env.get('WX_APPID') || 'wx1e6d151c7eb428cc',
        description: '微信小程序 AppID（内容安全审核用）',
      },
      {
        key: 'wxAppSecret',
        value: this.env.get('WX_APP_SECRET') || '',
        description: '微信小程序 AppSecret（内容安全审核用，未配置则放行）',
      },
      {
        key: 'imSdkAppId',
        value: this.env.get('IM_SDK_APP_ID') || '',
        description: '腾讯云 IM SDKAppID（家校沟通，体验版免费，未配置则用演示模式）',
      },
      {
        key: 'imSecretKey',
        value: this.env.get('IM_SECRET_KEY') || '',
        description: '腾讯云 IM 密钥（生成 UserSig 用，不与前端分享）',
      },
    ]
    for (const d of defaults) {
      const exist = await this.appRepo.findOne({ where: { key: d.key } })
      if (!exist) await this.appRepo.save(this.appRepo.create(d))
    }
  }

  /**
   * 确保 AI 模型默认值与 .env 配置一致。
   * 不再自动升级模型名称，由用户自行在设置页面修改。
   */
  private async migrateModelDefaults() {
    // 确保平台配置中模型字段不为空，缺失时用 .env 值回填
    for (const [key, envKey, fallback] of [
      ['aiTextModel', 'AI_TEXT_MODEL', 'qwen-plus'],
      ['aiVisionModel', 'AI_VISION_MODEL', 'qwen-vl-plus'],
    ] as const) {
      const c = await this.appRepo.findOne({ where: { key } })
      if (c && !c.value) {
        c.value = this.env.get(envKey) || fallback
        await this.appRepo.save(c)
      }
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

  /** 批量保存平台配置（事务式逐条写入） */
  async saveAppConfig(items: { key: string; value: string }[]) {
    for (const it of items || []) {
      if (!it || !it.key) continue
      await this.setAppConfig(it.key, it.value ?? '')
    }
    return { ok: true }
  }

  /**
   * 腾讯云 IM 配置：若已存在但值为空，则用后端环境变量（SDKAppID / SecretKey）回填，
   * 保证「腾讯IM配置默认取后端的 SDKAppID 和 SecretKey」。
   */
  private async migrateImDefaults() {
    for (const [key, envKey] of [
      ['imSdkAppId', 'IM_SDK_APP_ID'],
      ['imSecretKey', 'IM_SECRET_KEY'],
    ] as const) {
      const c = await this.appRepo.findOne({ where: { key } })
      if (c && (!c.value || !c.value.trim())) {
        const envVal = this.env.get(envKey) || ''
        if (envVal) {
          c.value = envVal
          await this.appRepo.save(c)
        }
      }
    }
  }

  /** 下发给小程序的公开配置（剔除敏感项） */
  async publicConfig() {
    const subjects = (await this.getAppConfigValue('defaultSubjects')) || ''
    return {
      defaultSubjects: subjects.split(',').map((s) => s.trim()).filter(Boolean),
    }
  }

  /** 取教师的 AI 设置；无则回退平台默认值 + 默认服务商 */
  async getAiSettings(teacherId: string): Promise<AiSettings> {
    let s = await this.aiRepo.findOne({ where: { teacherId } })
    if (!s) {
      const defaultProv = await this.providerRepo.findOne({ where: { isDefault: true, enabled: true } })
        || await this.providerRepo.findOne({ where: { enabled: true }, order: { sortOrder: 'ASC' } })
      const env = (key: string, fallback = '') => this.env.get(key) || fallback
      s = this.aiRepo.create({
        teacherId,
        providerCode: defaultProv?.code || '',
        baseUrl: defaultProv?.baseUrl || env('aiBaseUrl'),
        apiKey: '', // 密钥必须由教师自行填写，平台不下发
        textModel: defaultProv?.textModels?.[0] || env('aiTextModel', 'qwen-plus'),
        visionModel: defaultProv?.visionModels?.[0] || env('aiVisionModel', 'qwen-vl-plus'),
        imageModel: defaultProv?.imageModels?.[0] || env('aiImageModel'),
        videoModel: defaultProv?.videoModels?.[0] || env('aiVideoModel'),
        temperature: parseFloat(env('aiTemperature', '0.7')),
        aiName: env('aiName', '小林子'),
        systemPrompt: env('aiSystemPrompt', '你是一位耐心、专业的中国中小学班主任助手。'),
      })
    }
    // 若 baseUrl 为空但有 providerCode，自动从 ai_providers 填充
    if (!s.baseUrl && s.providerCode) {
      const prov = await this.providerRepo.findOne({ where: { code: s.providerCode } })
      if (prov) {
        s.baseUrl = prov.baseUrl
        if (!s.textModel) s.textModel = prov.textModels?.[0] || ''
        if (!s.visionModel) s.visionModel = prov.visionModels?.[0] || ''
        if (!s.imageModel) s.imageModel = prov.imageModels?.[0] || ''
        if (!s.videoModel) s.videoModel = prov.videoModels?.[0] || ''
      }
    }
    return s
  }

  async saveAiSettings(teacherId: string, dto: Partial<AiSettings>) {
    let s = await this.aiRepo.findOne({ where: { teacherId } })
    if (!s) s = this.aiRepo.create({ teacherId })
    // 若切换了 providerCode 且 apiKey 为空，自动从 ai_providers 填充 baseUrl + 默认模型
    if (dto.providerCode && dto.providerCode !== s.providerCode && !dto.apiKey) {
      const prov = await this.providerRepo.findOne({ where: { code: dto.providerCode } })
      if (prov) {
        dto.baseUrl = prov.baseUrl
        if (!dto.textModel) dto.textModel = prov.textModels?.[0] || ''
        if (!dto.visionModel) dto.visionModel = prov.visionModels?.[0] || ''
        if (!dto.imageModel) dto.imageModel = prov.imageModels?.[0] || ''
        if (!dto.videoModel) dto.videoModel = prov.videoModels?.[0] || ''
      }
    }
    Object.assign(s, dto, { teacherId })
    return this.aiRepo.save(s)
  }

  /**
   * 查询服务商的可用模型列表。
   * 优先实时查询各服务商 /models 接口；baseUrl / apiKey 未传时回退平台级配置。
   * 支持传入 providerCode 从 ai_providers 表自动解析 baseUrl。
   */
  async listProviderModels(dto: {
    provider?: string
    providerCode?: string
    baseUrl?: string
    apiKey?: string
  }): Promise<ProviderModelsResult> {
    let baseUrl = dto.baseUrl
    if (!baseUrl && dto.providerCode) {
      const prov = await this.providerRepo.findOne({ where: { code: dto.providerCode } })
      if (prov) baseUrl = prov.baseUrl
    }
    baseUrl = baseUrl || (await this.getAppConfigValue('aiBaseUrl')) || ''
    const apiKey = dto.apiKey || (await this.getAppConfigValue('aiApiKey')) || ''
    return fetchProviderModels({ provider: dto.provider, baseUrl, apiKey })
  }
}
