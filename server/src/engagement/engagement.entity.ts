import { Entity, Column, Index } from 'typeorm'
import { BaseEntity } from '../common/entities/base.entity'

@Index('idx_teacher_class_stu', ['teacherId', 'classId', 'studentId'])
@Index('idx_reward_records_cov', ['teacherId', 'createdAt'])
@Entity('reward_records')
export class RewardRecord extends BaseEntity {
  @Column() classId: string
  @Column() studentId: string
  @Column() type: string
  @Column({ type: 'int', default: 0 }) points: number
  @Column({ type: 'text', nullable: true }) reason: string
  @Column() date: string
}

@Index('idx_teacher_class_stu', ['teacherId', 'classId', 'studentId'])
@Index('idx_score_records_cov', ['teacherId', 'createdAt'])
@Entity('score_records')
export class ScoreRecord extends BaseEntity {
  @Column() classId: string
  @Column() studentId: string
  @Column() studentName: string
  @Column({ type: 'int', default: 0 }) delta: number
  @Column({ type: 'text', nullable: true }) reason: string
}

@Index('idx_teacher_class', ['teacherId', 'classId'])
@Entity('group_scores')
export class GroupScore extends BaseEntity {
  @Column() classId: string
  @Column() name: string
  @Column({ type: 'int', default: 0 }) points: number
  @Column({ default: '' }) color: string
}
