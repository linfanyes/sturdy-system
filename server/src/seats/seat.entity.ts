import { Entity, Column, Index } from 'typeorm'
import { BaseEntity } from '../common/entities/base.entity'

@Index('idx_teacher_class', ['teacherId', 'classId'])
@Entity('seat_layouts')
export class SeatLayout extends BaseEntity {
  @Column() classId: string
  @Column() name: string
  @Column({ type: 'int' }) rows: number
  @Column({ type: 'int' }) cols: number
  @Column('simple-json') seats: (string | null)[][]
  @Column({ type: 'boolean', default: false }) active: boolean
  // 过道列：在哪些列之后插入过道（0-based col index），如 [2,5] 表示第 2 列和第 5 列后有过道
  @Column('simple-json', { nullable: true }) aisleCols: number[]
}
