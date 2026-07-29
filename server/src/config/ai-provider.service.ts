import { Injectable, OnModuleInit } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { AiProvider } from './ai-provider.entity'

@Injectable()
export class AiProviderService implements OnModuleInit {
  constructor(
    @InjectRepository(AiProvider)
    private readonly repo: Repository<AiProvider>,
  ) {}

  async onModuleInit() {
    await this.seed()
  }

  /** 首次启动：若 ai_providers 表为空，则用硬编码默认值填充 */
  private async seed() {
    const count = await this.repo.count()
    if (count > 0) return
    const defaults: Partial<AiProvider>[] = [
      {
        teacherId: '',
        code: 'ali-qwen',
        name: '阿里百炼（通义千问）',
        baseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
        textModels: ['qwen-plus', 'qwen-max', 'qwen-turbo'],
        visionModels: ['qwen-vl-plus', 'qwen-vl-max'],
        imageModels: [],
        videoModels: [],
        isDefault: true,
        enabled: true,
        sortOrder: 1,
      },
      {
        teacherId: '',
        code: 'deepseek',
        name: 'DeepSeek',
        baseUrl: 'https://api.deepseek.com/v1',
        textModels: ['deepseek-v4-flash', 'deepseek-v4-pro'],
        visionModels: ['deepseek-v4-pro'],
        imageModels: [],
        videoModels: [],
        isDefault: false,
        enabled: true,
        sortOrder: 2,
      },
      {
        teacherId: '',
        code: 'glm',
        name: '智谱GLM',
        baseUrl: 'https://open.bigmodel.cn/api/paas/v4',
        textModels: ['GLM-4.7-Flash'],
        visionModels: ['GLM-4.6V-Flash'],
        imageModels: ['GLM-4.6V-Flash'],
        videoModels: ['CogVideoX-Flash'],
        isDefault: false,
        enabled: true,
        sortOrder: 3,
      },
    ]
    for (const d of defaults) {
      await this.repo.save(this.repo.create(d))
    }
  }

  async list() {
    return this.repo.find({ order: { sortOrder: 'ASC' } })
  }

  async get(code: string) {
    return this.repo.findOne({ where: { code } })
  }

  async getDefault() {
    const def = await this.repo.findOne({ where: { isDefault: true, enabled: true } })
    if (def) return def
    return this.repo.findOne({ where: { enabled: true }, order: { sortOrder: 'ASC' } })
  }

  async create(dto: Partial<AiProvider>) {
    if (!dto.code || !dto.name) throw new Error('code 和 name 必填')
    const exist = await this.repo.findOne({ where: { code: dto.code } })
    if (exist) throw new Error(`服务商 ${dto.code} 已存在`)
    // 新服务商设为默认时，清除其他默认
    if (dto.isDefault) await this.repo.update({}, { isDefault: false })
    if (!dto.teacherId) dto.teacherId = ''
    return this.repo.save(this.repo.create(dto))
  }

  async update(code: string, dto: Partial<AiProvider>) {
    const p = await this.repo.findOne({ where: { code } })
    if (!p) throw new Error('服务商不存在')
    if (dto.isDefault) await this.repo.update({ code: { $ne: code } } as any, { isDefault: false })
    Object.assign(p, dto, { code: p.code }) // 不允许改 code
    return this.repo.save(p)
  }

  async remove(code: string) {
    const p = await this.repo.findOne({ where: { code } })
    if (!p) throw new Error('服务商不存在')
    await this.repo.remove(p)
    // 若删除的是默认，自动将最早启用的设为默认
    if (p.isDefault) {
      const next = await this.repo.findOne({ where: { enabled: true }, order: { sortOrder: 'ASC' } })
      if (next) { next.isDefault = true; await this.repo.save(next) }
    }
    return { ok: true }
  }
}
