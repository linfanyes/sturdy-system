import { Entity, Column, Index } from 'typeorm'
import { BaseEntity } from '../common/entities/base.entity'

@Index('idx_teacher_read', ['teacherId', 'read'])
@Entity('notifications')
export class NotificationItem extends BaseEntity {
  @Column() teacherId: string
  @Column() title: string
  @Column({ type: 'text', nullable: true }) content: string
  @Column({ default: 'info' }) type: string   // 'info' | 'notice' | 'homework' | 'grade'
  @Column({ default: false }) read: boolean
  @Column({ nullable: true }) link: string     // 点击后的跳转路径
}
