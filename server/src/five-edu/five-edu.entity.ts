import { Entity, Column, Index } from 'typeorm'
import { BaseEntity } from '../common/entities/base.entity'

/** 五育维度 */
export type FiveEduDimension = 'moral' | 'intellectual' | 'physical' | 'aesthetic' | 'labour'
/** 评价主体 / 记录类型 */
export type FiveEduEvalType = 'teacher' | 'self' | 'peer' | 'home'

/**
 * 过程性评价记录：覆盖「老师评 + 自评 + 同伴互评」三主体，
 * 同时承载「劳动教育家校任务（家务打卡）」(evalType='home', dimension='labour')。
 * score 为 1–5 表现评分；content 为评语 / 任务描述。
 */
@Index('idx_fedu_tch_cls', ['teacherId', 'classId'])
@Index('idx_fedu_tch_stu', ['teacherId', 'studentId'])
@Index('idx_fedu_tch_dim', ['teacherId', 'dimension'])
@Entity('five_edu_records')
export class FiveEduRecord extends BaseEntity {
  @Column({ type: 'varchar', length: 64 }) studentId: string
  @Column({ type: 'varchar', length: 64, nullable: true }) studentName: string | null
  @Column({ type: 'varchar', length: 64, nullable: true }) classId: string | null

  @Column({ type: 'varchar', length: 16 }) dimension: FiveEduDimension
  @Column({ type: 'varchar', length: 16, default: 'teacher' }) evalType: FiveEduEvalType

  /** 1–5 表现评分 */
  @Column({ type: 'int', default: 0 }) score: number

  /** 评语 / 任务描述 / 家长留言 */
  @Column({ type: 'text', nullable: true }) content: string | null

  /** 评价人 / 家长名 */
  @Column({ type: 'varchar', length: 64, default: '' }) evaluatorName: string

  /** 记录日期 YYYY-MM-DD */
  @Column({ default: '' }) date: string
}
