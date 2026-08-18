import { Entity, Column, Index } from 'typeorm'
import { BaseEntity } from '../common/entities/base.entity'

/**
 * P1-2修复：聊天消息明细表（ChatSession.messages JSON 拆分）。
 *
 * 原 ChatSession.messages 以 TEXT+transformer 存储完整对话历史，
 * 存在以下问题：
 * 1. 长对话可能触发行大小限制（LONGTEXT 行溢出）
 * 2. 无法分页加载消息
 * 3. 单条消息更新需重写整个 JSON
 *
 * 新表 chat_messages 每行一条消息，便于：
 * - 分页加载（先加载最新 N 条）
 * - 单条消息编辑/删除
 * - 全文搜索消息内容
 *
 * ChatSession.messages 字段保留为快速读取的小对话缓存（< 10 条时用），
 * 超过阈值时自动转存到本表。
 */
@Index('idx_cm_session_seq', ['sessionId', 'sequence'])
@Index('idx_cm_teacher', ['teacherId'])
@Entity('chat_messages')
export class ChatMessage extends BaseEntity {
  /** 关联的会话 ID */
  @Column({ type: 'varchar', length: 64 })
  sessionId: string

  /** 消息角色：user / assistant / system */
  @Column({ type: 'varchar', length: 16 })
  role: string

  /** 消息内容 */
  @Column({ type: 'text' })
  content: string

  /** 消息序号（从 0 递增，保证顺序） */
  @Column({ type: 'int', default: 0 })
  sequence: number

  /** token 用量（仅 assistant 消息） */
  @Column({ type: 'int', nullable: true })
  tokens?: number
}
