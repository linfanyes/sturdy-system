import { Entity, Column, Index } from 'typeorm'
import { BaseEntity } from '../common/entities/base.entity'

@Index('idx_school_action', ['schoolId', 'action'])
@Entity('audit_logs')
export class AuditLog extends BaseEntity {
  @Column() schoolId: string
  @Column() action: string     // 'create_teacher' | 'delete_teacher' | 'reset_password' | 'create_class' | 'delete_class' | 'create_school_admin' | 'delete_school_admin'
  @Column() operator: string   // 操作者姓名
  @Column() target: string     // 操作对象描述
  @Column({ type: 'text', nullable: true }) detail: string
}
