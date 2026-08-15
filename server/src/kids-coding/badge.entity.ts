import { Entity, Column, Index } from 'typeorm'
import { BaseEntity } from '../common/entities/base.entity'

/**
 * 少儿编程成就徽章（按学生累计获得）。
 * 徽章由系统按规则（练习数/提交数/评分等）在查询时计算并落库，避免重复颁发。
 */
@Index('idx_kc_badge_stu', ['studentId'])
@Index('idx_kc_badge_stu_type', ['studentId', 'type'])
@Entity('kids_coding_badges')
export class CodingBadge extends BaseEntity {
  /** 徽章所属学生 id */
  @Column({ type: 'varchar', length: 64 }) studentId: string

  /** 徽章类型（见 BADGE_RULES） */
  @Column({ type: 'varchar', length: 48 }) type: string

  /** 获得时间 */
  @Column({ type: 'datetime', nullable: true }) earnedAt: Date | null
}
