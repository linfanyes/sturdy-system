import { Entity, Column, Index } from 'typeorm'
import { BaseEntity } from '../common/entities/base.entity'

@Index('idx_school_action', ['schoolId', 'action'])
@Entity('audit_logs')
export class AuditLog extends BaseEntity {
  /** 租户键：审计按 schoolId 隔离，teacherId 一律留空（与迁移 0021 的 DEFAULT '' 对齐，保证写入不依赖 DB 默认值） */
  @Column({ type: 'varchar', length: 64, default: '', comment: '租户键：审计级按 schoolId 隔离，留空' })
  teacherId: string
  @Column() schoolId: string
  @Column() action: string     // 'create_teacher' | 'delete_teacher' | 'reset_password' | 'create_class' | 'delete_class' | 'create_school_admin' | 'delete_school_admin'
  @Column() operator: string   // 操作者姓名
  @Column() target: string     // 操作对象描述
  @Column({ type: 'text', nullable: true }) detail: string
}
