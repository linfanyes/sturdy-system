import { Entity, Column, Index } from 'typeorm'
import { BaseEntity } from '../common/entities/base.entity'

@Index('idx_teacher_class', ['teacherId', 'classId'])
@Entity('exams')
export class Exam extends BaseEntity {
  @Column() term: string
  @Column() name: string
  @Column({ default: '' }) teacherName: string
  @Column() classId: string
  @Column('simple-json') subjects: string[]
  @Column('simple-json', { nullable: true }) subjectFullScores: Record<string, number>
  @Column() date: string
  @Column({ type: 'text', nullable: true }) note: string
  @Column({ type: 'text', nullable: true }) analysisNote: string
}
