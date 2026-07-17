import { Entity, Column } from 'typeorm'
import { BaseEntity } from '../common/entities/base.entity'

@Entity('seat_layouts')
export class SeatLayout extends BaseEntity {
  @Column() classId: string
  @Column() name: string
  @Column({ type: 'int' }) rows: number
  @Column({ type: 'int' }) cols: number
  @Column('simple-json') seats: (string | null)[][]
  @Column({ type: 'boolean', default: false }) active: boolean
}
