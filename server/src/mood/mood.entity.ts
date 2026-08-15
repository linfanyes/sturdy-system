import { Entity, Column, Index } from 'typeorm'
import { BaseEntity } from '../common/entities/base.entity'

/**
 * 学生每日心情打卡。
 * 一位学生一天仅一条（studentId + date 唯一），重复提交按 upsert 处理。
 * teacherId 为班级归属教师（租户键），classId 便于按班聚合。
 */
@Index('idx_mood_stu_date', ['studentId', 'date'])
@Index('idx_mood_tch_cls', ['teacherId', 'classId'])
@Index('idx_mood_tch_date', ['teacherId', 'date'])
@Entity('mood_checkins')
export class MoodCheckIn extends BaseEntity {
  /** 打卡学生 id（与家长端当前学生一致） */
  @Column({ type: 'varchar', length: 64 }) studentId: string

  /** 学生展示名（冗余，便于教师端直接看） */
  @Column({ type: 'varchar', length: 64, nullable: true }) studentName: string | null

  /** 所属班级（冗余，便于按班聚合） */
  @Column({ type: 'varchar', length: 64, nullable: true }) classId: string | null

  /** 心情等级 1–5：1=很低落 2=低落 3=一般 4=不错 5=很好 */
  @Column({ type: 'int' }) level: number

  /** 选择的表情编码（如 'sad' / 'ok' / 'happy'），前端映射图标 */
  @Column({ type: 'varchar', length: 24, nullable: true }) emoji: string | null

  /** 可选留言 */
  @Column({ type: 'text', nullable: true }) note: string | null

  /** 打卡日期 YYYY-MM-DD（本地日，用于每日唯一与按日聚合） */
  @Column({ type: 'varchar', length: 10 }) date: string
}

/**
 * 树洞（匿名倾诉）。
 * 学生/家长可匿名提交；AI 先做共情回复，高危（riskLevel=high）自动升级由教师/心理老师跟进。
 */
@Index('idx_tree_tch', ['teacherId'])
@Index('idx_tree_status', ['teacherId', 'status'])
@Entity('mood_tree_holes')
export class TreeHole extends BaseEntity {
  /** 提交者学生 id（匿名仍保留，便于必要时定向关怀；可为 null） */
  @Column({ type: 'varchar', length: 64, nullable: true }) studentId: string | null

  /** 所属班级（冗余） */
  @Column({ type: 'varchar', length: 64, nullable: true }) classId: string | null

  /** 倾诉内容 */
  @Column({ type: 'text' }) content: string

  /** 处理状态：pending=待处理 responded=已回复 escalated=已升级 */
  @Column({ type: 'varchar', length: 16, default: 'pending' }) status: 'pending' | 'responded' | 'escalated'

  /** 风险等级：none=无 low=偏低 high=高危（需人工介入） */
  @Column({ type: 'varchar', length: 8, default: 'none' }) riskLevel: 'none' | 'low' | 'high'

  /** AI 初步共情回复（高危时仍需教师/心理老师人工跟进） */
  @Column({ type: 'text', nullable: true }) aiReply: string | null

  /** 教师/心理老师的人工回复 */
  @Column({ type: 'text', nullable: true }) staffReply: string | null
}
