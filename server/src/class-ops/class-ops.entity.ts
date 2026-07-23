import { Entity, Column, Index } from 'typeorm'
import { BaseEntity } from '../common/entities/base.entity'

@Index('idx_teacher_class', ['teacherId', 'classId'])
@Entity('class_expenses')
export class ClassExpense extends BaseEntity {
  @Column() classId: string
  @Column() type: string
  @Column({ default: '' }) category: string
  @Column({ type: 'float', default: 0 }) amount: number
  @Column() date: string
  @Column({ type: 'text', nullable: true }) description: string
  @Column({ default: '' }) handler: string
}

@Index('idx_teacher_class', ['teacherId', 'classId'])
@Entity('class_activities')
export class ClassActivity extends BaseEntity {
  @Column() classId: string
  @Column() title: string
  @Column() date: string
  @Column({ type: 'text', nullable: true }) description: string
  @Column('simple-json', { nullable: true }) photos: string[]
}

@Index('idx_teacher_class', ['teacherId', 'classId'])
@Entity('class_duty_configs')
export class ClassDutyConfig extends BaseEntity {
  @Column() classId: string
  @Column('simple-json') duties: string[]
  @Column('simple-json') assignments: Record<string, string[]>
}
