import { Entity, Column } from 'typeorm'
import { BaseEntity } from '../common/entities/base.entity'

export interface GradeScore {
  studentId: string
  score: number | null
}

@Entity('grades')
export class Grade extends BaseEntity {
  @Column() classId: string
  @Column() subject: string
  @Column() examName: string
  @Column({ nullable: true }) examId: string
  @Column() date: string
  @Column('simple-json') scores: GradeScore[]
}
