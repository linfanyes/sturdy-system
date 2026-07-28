import { Entity, Column } from 'typeorm'
import { BaseEntity } from '../common/entities/base.entity'

/**
 * 管理员维护的 AI 服务商清单（全局共享）。
 * API Key 不存此表——各教师在 ai_settings 中自行录入，
 * 确保平台统一管控服务商接入，用户自主保管密钥。
 */
@Entity('ai_providers')
export class AiProvider extends BaseEntity {
  /** 唯一标识，如 'ali-qwen'、'deepseek'、'custom-xxx' */
  @Column({ unique: true })
  code: string

  /** 显示名称，如 '阿里百炼（通义千问）'、'DeepSeek' */
  @Column()
  name: string

  /** 服务商接入地址 */
  @Column()
  baseUrl: string

  /** 文本模型列表 */
  @Column('simple-json', { default: () => '[]' })
  textModels: string[]

  /** 多模态模型列表 */
  @Column('simple-json', { default: () => '[]' })
  visionModels: string[]

  /** 文生图模型列表 */
  @Column('simple-json', { default: () => '[]' })
  imageModels: string[]

  /** 文生视频模型列表 */
  @Column('simple-json', { default: () => '[]' })
  videoModels: string[]

  /** 是否默认（教师未指定时 fallback 到此服务商） */
  @Column({ default: false })
  isDefault: boolean

  /** 是否启用 */
  @Column({ default: true })
  enabled: boolean

  /** 排序权重（越小越靠前） */
  @Column({ default: 0 })
  sortOrder: number
}
