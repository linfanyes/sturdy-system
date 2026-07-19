import { Entity, Column } from 'typeorm'
import { BaseEntity } from '../common/entities/base.entity'

@Entity('parent_contacts')
export class ParentContact extends BaseEntity {
  @Column() studentId: string
  @Column() studentName: string
  // 班级隔离键：写入时绑定学生所在班级，支持按班级过滤
  @Column({ default: '' }) classId: string
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
