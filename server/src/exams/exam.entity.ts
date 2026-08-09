import { Entity, Column, Index } from 'typeorm'
import { BaseEntity } from '../common/entities/base.entity'

@Index('idx_exm_tch_cls', ['teacherId', 'classId'])
@Entity('exams')
export class Exam extends BaseEntity {
  @Column() term: string
  @Column() name: string
  @Column({ default: '' }) teacherName: string
  // 复合索引(idx_exm_tch_cls)无法单独命中 classId 查询，独立索引加速按班级过滤
  @Index('idx_exm_class')
  @Column() classId: string
  @Column('simple-json') subjects: string[]
  @Column('simple-json', { nullable: true }) subjectFullScores: Record<string, number>
  @Column() date: string
  @Column({ type: 'text', nullable: true }) note: string
  @Column({ type: 'text', nullable: true }) analysisNote: string
}
