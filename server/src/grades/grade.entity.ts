import { Entity, Column, Index } from 'typeorm'
import { BaseEntity } from '../common/entities/base.entity'

export interface GradeScore {
  studentId: string
  score: number | null
}

@Index('idx_grd_tch_cls', ['teacherId', 'classId'])
@Index('idx_grades_cov', ['teacherId', 'createdAt'])
// P02修复：唯一索引防止并发提交同一班级同一考试同一科目的重复成绩
@Index('idx_grades_unique_submission', ['classId', 'examName', 'subject'], { unique: true })
@Entity('grades')
export class Grade extends BaseEntity {
  @Column() classId: string
  @Column() subject: string
  @Column() examName: string
  @Column({ nullable: true }) examId: string
  @Column() date: string
  @Column('simple-json') scores: GradeScore[]
}
