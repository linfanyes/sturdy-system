import {
  Entity,
  Column,
  Index,
  PrimaryGeneratedColumn,
  CreateDateColumn,
} from 'typeorm'

/**
 * 站内消息（与 Notice/Notification 互补）：
 * - Notice 为系统公告（只读广播），Notification 为事务通知（可标记已读）；
 * - Message 为点对点消息，可双向发送，支持教师↔家长、系统→用户等场景。
 *
 * recipientId / recipientRole 共同确定收件人（租户隔离键）：
 *   教师令牌 sub=teacherId、role='teacher'；家长令牌 sub=家长IM账号、role='parent'。
 */
@Index('idx_message_recipient_read', ['recipientId', 'recipientRole', 'isRead'])
@Entity('messages')
export class Message {
  @PrimaryGeneratedColumn('uuid')
  id: string

  /** 发件人ID；系统消息可为空 */
  @Column({ type: 'varchar', length: 64, nullable: true })
  senderId: string | null

  /** 发件人角色 */
  @Column({ type: 'varchar', length: 32, nullable: true })
  senderRole: string | null

  /** 收件人ID（必填，取当前登录用户 id 过滤） */
  @Column({ type: 'varchar', length: 64 })
  recipientId: string

  /** 收件人角色（必填，与 recipientId 共同作为租户隔离键） */
  @Column({ type: 'varchar', length: 32 })
  recipientRole: string

  @Column({ type: 'varchar', length: 255 })
  title: string

  @Column({ type: 'text' })
  content: string

  /** 'direct' | 'system' | 'notice' */
  @Column({ type: 'varchar', length: 32, default: 'system' })
  type: string

  @Column({ type: 'boolean', default: false })
  isRead: boolean

  @CreateDateColumn({ type: 'datetime' })
  createdAt: Date
}
