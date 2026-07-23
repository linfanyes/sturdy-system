import { Entity, Column, Index } from 'typeorm'
import { BaseEntity } from '../common/entities/base.entity'

export interface GradeScore {
  studentId: string
  score: number | null
}

@Index('idx_teacher_class', ['teacherId', 'classId'])
@Index('idx_grades_cov', ['teacherId', 'createdAt'])
@Entity('grades')
export class Grade extends BaseEntity {
  @Column() classId: string
  @Column() subject: string
  @Column() examName: string
  @Column({ nullable: true }) examId: string
  @Column() date: string
  @Column('simple-json') scores: GradeScore[]
}
