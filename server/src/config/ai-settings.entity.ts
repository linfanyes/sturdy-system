import { Entity, Column } from 'typeorm'
import { BaseEntity } from '../common/entities/base.entity'

/**
 * 每位教师的 AI 设置。密钥仅存后端，绝不下发到小程序。
 */
@Entity('ai_settings')
export class AiSettings extends BaseEntity {
  @Column({ default: '' })
  baseUrl: string

  @Column({ type: 'text', default: '' })
  apiKey: string

  @Column({ default: '' })
  textModel: string

  @Column({ default: '' })
  visionModel: string

  @Column({ type: 'float', default: 0.7 })
  temperature: number

  @Column({ default: '小林子' })
  aiName: string

  @Column({ type: 'text', default: '' })
  systemPrompt: string
}
