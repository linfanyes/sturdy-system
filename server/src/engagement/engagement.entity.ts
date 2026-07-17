import { Entity, Column } from 'typeorm'
import { BaseEntity } from '../common/entities/base.entity'

@Entity('reward_records')
export class RewardRecord extends BaseEntity {
  @Column() classId: string
  @Column() studentId: string
  @Column() type: string
  @Column({ type: 'int', default: 0 }) points: number
  @Column({ type: 'text', default: '' }) reason: string
  @Column() date: string
}

@Entity('score_records')
export class ScoreRecord extends BaseEntity {
  @Column() classId: string
  @Column() studentId: string
  @Column() studentName: string
  @Column({ type: 'int', default: 0 }) delta: number
  @Column({ type: 'text', default: '' }) reason: string
}

@Entity('group_scores')
export class GroupScore extends BaseEntity {
  @Column() classId: string
  @Column() name: string
  @Column({ type: 'int', default: 0 }) points: number
  @Column({ default: '' }) color: string
}
