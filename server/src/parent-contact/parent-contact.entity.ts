import { Entity, Column } from 'typeorm'
import { BaseEntity } from '../common/entities/base.entity'

@Entity('parent_contacts')
export class ParentContact extends BaseEntity {
  @Column() studentId: string
  @Column() studentName: string
  @Column() parentName: string
  @Column() relation: string
  @Column() phone: string
  @Column({ default: '' }) wechat: string
  @Column() method: string
  @Column({ type: 'text' }) content: string
  @Column() date: string
  @Column({ type: 'text', nullable: true }) followUp: string
}

@Entity('notice_templates')
export class NoticeTemplate extends BaseEntity {
  @Column() title: string
  @Column({ type: 'text' }) content: string
  @Column() category: string
}
