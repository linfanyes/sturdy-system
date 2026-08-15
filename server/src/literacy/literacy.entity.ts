import { Entity, Column, Index } from 'typeorm'
import { BaseEntity } from '../common/entities/base.entity'

/** 内容分类：数字素养 / 网络安全 / 生涯启蒙 */
export type LiteracyCategory = 'digital_literacy' | 'online_safety' | 'career'

/**
 * 数字素养 / 生涯启蒙 微课。完成学习可获得徽章，激励学生主动成长。
 */
@Index('idx_lit_cat', ['category'])
@Entity('literacy_lessons')
export class LiteracyLesson extends BaseEntity {
  @Column({ type: 'varchar', length: 16, default: 'digital_literacy' }) category: LiteracyCategory

  @Column({ type: 'varchar', length: 80 }) title: string

  @Column({ type: 'text' }) content: string

  /** 预计时长（分钟） */
  @Column({ type: 'int', default: 5 }) duration: number

  /** 排序 */
  @Column({ type: 'int', default: 0 }) sort: number
}

/** 完成徽章（学生完成某微课后获得） */
@Index('idx_lb_lesson_stu', ['lessonId', 'studentId'])
@Index('idx_lb_tch_cls', ['teacherId', 'classId'])
@Entity('literacy_badges')
export class LiteracyBadge extends BaseEntity {
  @Column({ type: 'varchar', length: 64 }) lessonId: string
  @Column({ type: 'varchar', length: 64 }) studentId: string
  @Column({ type: 'varchar', length: 64 }) teacherId: string
  @Column({ type: 'varchar', length: 64, nullable: true }) classId: string | null
  @Column({ default: '' }) completedAt: string
}
