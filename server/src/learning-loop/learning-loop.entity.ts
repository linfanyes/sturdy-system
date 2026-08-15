import { Entity, Column, Index } from 'typeorm'
import { BaseEntity } from '../common/entities/base.entity'

/**
 * 学习计划：教师/家长为学生制定的「本周攻克知识点」清单与进度。
 * weekLabel 形如 2026-W33，便于按周回溯。
 */
@Index('idx_lp_tch_stu', ['teacherId', 'studentId'])
@Index('idx_lp_tch_week', ['teacherId', 'weekLabel'])
@Entity('study_plans')
export class StudyPlan extends BaseEntity {
  @Column({ type: 'varchar', length: 64 }) studentId: string
  @Column({ type: 'varchar', length: 64, nullable: true }) studentName: string | null
  @Column({ type: 'varchar', length: 64, nullable: true }) classId: string | null

  /** 形如 2026-W33 的周标识 */
  @Column() weekLabel: string

  /** 本周要攻克的知识点列表 */
  @Column('simple-json', { nullable: true }) knowledgePoints: string[] | null

  /** 完成进度 0–100 */
  @Column({ type: 'int', default: 0 }) progress: number

  @Column({ type: 'text', nullable: true }) note: string | null
}

/**
 * 薄弱点智能练习：由 AI 根据错题/成绩薄弱知识点生成的同类题。
 * 学生端闯关式完成，done 标记是否已掌握。
 */
@Index('idx_wpe_tch_stu', ['teacherId', 'studentId'])
@Index('idx_wpe_tch_kp', ['teacherId', 'knowledgePoint'])
@Entity('weak_point_exercises')
export class WeakPointExercise extends BaseEntity {
  @Column({ type: 'varchar', length: 64 }) studentId: string
  @Column({ type: 'varchar', length: 64, nullable: true }) studentName: string | null
  @Column({ type: 'varchar', length: 64, nullable: true }) classId: string | null

  /** 关联知识点 */
  @Column({ default: '' }) knowledgePoint: string

  /** AI 生成的题目 */
  @Column({ type: 'text' }) question: string

  /** AI 给出的参考答案 / 解析 */
  @Column({ type: 'text', nullable: true }) answer: string | null

  /** 是否已完成（学生标记掌握） */
  @Column({ type: 'boolean', default: false }) done: boolean

  /** 尝试次数 */
  @Column({ type: 'int', default: 0 }) attempts: number
}
