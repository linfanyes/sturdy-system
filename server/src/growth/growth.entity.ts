import { Entity, Column, Index } from 'typeorm'
import { BaseEntity } from '../common/entities/base.entity'

@Index('idx_teacher_student', ['teacherId', 'studentId'])
@Index('idx_growth_entries_cov', ['teacherId', 'createdAt'])
@Entity('growth_entries')
export class GrowthEntry extends BaseEntity {
  @Column() studentId: string
  @Column() studentName: string
  @Column() type: string
  @Column() date: string
  @Column() title: string
  @Column({ type: 'text', nullable: true }) content: string
}

@Index('idx_teacher_student', ['teacherId', 'studentId'])
@Index('idx_behavior_records_cov', ['teacherId', 'createdAt'])
@Entity('behavior_records')
export class BehaviorRecord extends BaseEntity {
  @Column() studentId: string
  @Column() studentName: string
  @Column() date: string
  @Column() behavior: string
  @Column({ type: 'text', nullable: true }) note: string
}
