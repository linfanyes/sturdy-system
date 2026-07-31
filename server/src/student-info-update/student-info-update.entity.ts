import { Entity, Column, Index } from 'typeorm'
import { BaseEntity } from '../common/entities/base.entity'

/**
 * 家长提交的学生信息修改申请。
 * 审核通过后由教师端将 payload 写入 Student 实体。
 */
@Entity('student_info_updates')
export class StudentInfoUpdate extends BaseEntity {
  @Index('idx_siu_student')
  @Column() studentId: string
  @Column() classId: string
  @Column({ default: '' }) studentName: string
  /** 提交人家长 ID */
  @Column({ default: '' }) parentId: string
  @Column({ default: '' }) parentName: string
  /** 待修改字段键值对：{ parentPhone, address, studentPhone, ... } */
  @Column('simple-json', { nullable: true }) payload: Record<string, any>
  /** 待审核/已通过/已拒绝 */
  @Column({ default: 'pending' }) status: 'pending' | 'approved' | 'rejected'
  @Column({ type: 'text', nullable: true }) reviewNote: string | null
  @Column({ default: '' }) reviewedBy: string
  @Column({ type: 'datetime', nullable: true }) reviewedAt: Date | null
}
