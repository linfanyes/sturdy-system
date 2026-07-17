import { Entity, Column } from 'typeorm'
import { BaseEntity } from '../common/entities/base.entity'

@Entity('schedules')
export class ScheduleItem extends BaseEntity {
  @Column() classId: string
  @Column({ type: 'int' }) dayOfWeek: number
  @Column({ type: 'int' }) period: number
  @Column({ default: '' }) subject: string
  @Column({ default: '' }) teacher: string
  @Column({ type: 'text', default: '' }) note: string
}

@Entity('attendances')
export class Attendance extends BaseEntity {
  @Column() classId: string
  @Column() date: string
  @Column('simple-json') records: { studentId: string; status: string }[]
}

@Entity('homework')
export class Homework extends BaseEntity {
  @Column() classId: string
  @Column() subject: string
  @Column() title: string
  @Column({ type: 'text', default: '' }) content: string
  @Column({ default: '' }) startDate: string
  @Column({ default: '' }) deadline: string
  @Column({ default: '待批改' }) status: string
}

@Entity('notices')
export class Notice extends BaseEntity {
  @Column({ default: '全校' }) classId: string
  @Column() title: string
  @Column({ type: 'text', default: '' }) content: string
  @Column({ type: 'boolean', default: false }) pinned: boolean
  @Column({ type: 'boolean', default: false }) ended: boolean
  @Column({ nullable: true }) endedAt: string
}

@Entity('resources')
export class Resource extends BaseEntity {
  @Column() title: string
  @Column({ default: '' }) url: string
  @Column({ default: '' }) category: string
  @Column('simple-json', { default: '[]' }) tags: string[]
  @Column({ type: 'text', default: '' }) description: string
}
