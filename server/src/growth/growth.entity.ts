import { Entity, Column } from 'typeorm'
import { BaseEntity } from '../common/entities/base.entity'

@Entity('growth_entries')
export class GrowthEntry extends BaseEntity {
  @Column() studentId: string
  @Column() studentName: string
  @Column() type: string
  @Column() date: string
  @Column() title: string
  @Column({ type: 'text', nullable: true }) content: string
}

@Entity('behavior_records')
export class BehaviorRecord extends BaseEntity {
  @Column() studentId: string
  @Column() studentName: string
  @Column() date: string
  @Column() behavior: string
  @Column({ type: 'text', nullable: true }) note: string
}
