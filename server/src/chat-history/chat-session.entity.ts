import { Entity, Column, Index, ValueTransformer } from 'typeorm'
import { BaseEntity } from '../common/entities/base.entity'

/** JSON 数组 ↔ TEXT 互转（消息列表） */
const jsonArrayTransformer: ValueTransformer = {
  to: (value: any[]) => (value ? JSON.stringify(value) : '[]'),
  from: (value: string) => {
    if (!value) return []
    try { return JSON.parse(value) } catch { return [] }
  },
}

/**
 * AI 对话会话实体（按教师租户隔离）。
 * 一条记录 = 一个会话，messages 存该会话全部消息 [{role:'user'|'assistant', content, createdAt}]。
 */
@Index('idx_ch_tch_updated', ['teacherId', 'updatedAt'])
@Entity('chat_sessions')
export class ChatSession extends BaseEntity {
  @Column({ length: 64, default: '通用' })
  title: string

  @Column({ type: 'text', nullable: true, transformer: jsonArrayTransformer })
  messages: { role: string; content: string; createdAt: string }[]

  @Column({ type: 'boolean', default: false })
  pinned: boolean
}