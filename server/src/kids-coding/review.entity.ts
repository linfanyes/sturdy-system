import { Entity, Column, Index } from 'typeorm'
import { BaseEntity } from '../common/entities/base.entity'

/**
 * 少儿编程教师点评。
 * 针对学生提交的某份练习作业给出反馈（评语 + 可选星级），学生/家长在家长端回看，
 * 形成「练—交—评—改」的学习闭环关键一环。
 */
@Index('idx_kc_rv_proj', ['projectId'])
@Index('idx_kc_rv_tch', ['teacherId'])
@Index('idx_kc_rv_stu', ['studentId'])
@Entity('kids_coding_reviews')
export class CodingReview extends BaseEntity {
  /** 被点评的练习作品 id（kids_coding_projects.id） */
  @Column({ type: 'varchar', length: 64 }) projectId: string

  /** 关联任务卡（可选，便于按挑战聚合评价） */
  @Column({ type: 'varchar', length: 64, nullable: true }) challengeId: string | null

  /** 练习作品所有者学生 id（冗余，便于查询该学生的全部点评） */
  @Column({ type: 'varchar', length: 64, nullable: true }) studentId: string | null

  /** 教师文字评语 */
  @Column({ type: 'text', nullable: true }) comment: string | null

  /** 星级评分 1–5（null = 未打分） */
  @Column({ type: 'tinyint', nullable: true }) rating: number | null

  /** 是否已完成批改（true 表示教师已给出反馈） */
  @Column({ type: 'boolean', default: true }) done: boolean
}
