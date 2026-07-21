import { Entity, Column } from 'typeorm'
import { BaseEntity } from '../common/entities/base.entity'

@Entity('students')
export class Student extends BaseEntity {
  @Column() classId: string
  @Column() name: string
  @Column() gender: string
  @Column() studentNo: string
  @Column({ type: 'varchar', nullable: true }) birthDate: string | null
  @Column({ type: 'int', default: 0 }) seatNo: number
  @Column({ type: 'int', nullable: true }) seatRow: number
  @Column({ type: 'int', nullable: true }) seatCol: number
  @Column({ default: '' }) parentName: string
  @Column({ default: '' }) parentPhone: string
  @Column({ default: '' }) parentOpenId: string
  @Column({ type: 'text', nullable: true }) note: string
  @Column('simple-json', { nullable: true }) tags: string[]
  @Column({ nullable: true }) duty: string
  @Column({ type: 'text', nullable: true }) comment: string
}
