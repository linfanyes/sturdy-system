import { Entity, Column, Index } from 'typeorm'
import { BaseEntity } from '../common/entities/base.entity'

@Index('idx_teacher_class', ['teacherId', 'classId'])
@Entity('duty_rosters')
export class DutyRoster extends BaseEntity {
  @Column() classId: string
  @Column() name: string
  @Column() type: string
  @Column('simple-json') assignments: { date: string; persons: string[] }[]
}
