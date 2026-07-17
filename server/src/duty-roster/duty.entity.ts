import { Entity, Column } from 'typeorm'
import { BaseEntity } from '../common/entities/base.entity'

@Entity('duty_rosters')
export class DutyRoster extends BaseEntity {
  @Column() classId: string
  @Column() name: string
  @Column() type: string
  @Column('simple-json') assignments: { date: string; persons: string[] }[]
}
