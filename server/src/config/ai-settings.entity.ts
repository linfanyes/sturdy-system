import { Entity, Column } from 'typeorm'
import { BaseEntity } from '../common/entities/base.entity'

/**
 * 每位教师的 AI 设置。密钥仅存后端，绝不下发到小程序。
 * 教师选择服务商（providerCode），自行录入 API Key。
 * 管理员维护全局 ai_providers 清单（增删改厂商）。
 */
@Entity('ai_settings')
export class AiSettings extends BaseEntity {
  /** 关联服务商 code（如 'ali-qwen'、'deepseek'），由教师选择 */
  @Column({ default: '' })
  providerCode: string

  @Column({ default: '' })
  baseUrl: string

  @Column({ type: 'text', nullable: true })
  apiKey: string

  @Column({ default: '' })
  textModel: string

  @Column({ default: '' })
  visionModel: string

  @Column({ default: '' })
  imageModel: string

  @Column({ default: '' })
  videoModel: string

  @Column({ type: 'float', default: 0.7 })
  temperature: number

  @Column({ default: '小林子' })
  aiName: string

  @Column({ type: 'text', nullable: true })
  systemPrompt: string

  /** 按资源（场景）覆盖默认模型，如 { "exam-analysis": "qwen3-max", "chat": "qwen3.7-plus" } */
  @Column('simple-json', { nullable: true })
  resourceModels: Record<string, string>
}
