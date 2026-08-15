import { Entity, Column, Index } from 'typeorm'
import { BaseEntity } from '../common/entities/base.entity'

/** 举报类型 */
export type SafetyReportType = 'bullying' | 'security' | 'other'
/** 风险等级 / 处理状态 */
export type SafetyLevel = 'low' | 'medium' | 'high'
export type SafetyStatus = 'pending' | 'processing' | 'resolved'

/**
 * 校园安全 / 防欺凌 匿名举报。
 * 学生/家长可匿名提交，按 班主任 → 校管 分级响应；高危自动置顶。
 */
@Index('idx_saf_tch_cls', ['teacherId', 'classId'])
@Index('idx_saf_tch_status', ['teacherId', 'status'])
@Entity('safety_reports')
export class SafetyReport extends BaseEntity {
  @Column({ type: 'varchar', length: 16, default: 'other' }) type: SafetyReportType

  @Column({ type: 'text' }) content: string

  /** 风险等级（提交时可建议，处理人可调整） */
  @Column({ type: 'varchar', length: 8, default: 'medium' }) level: SafetyLevel

  @Column({ type: 'varchar', length: 12, default: 'pending' }) status: SafetyStatus

  /** 是否匿名（默认匿名，保护举报人） */
  @Column({ type: 'boolean', default: true }) anonymous: boolean

  /** 举报人学生 id（非匿名时记录，便于必要时回访） */
  @Column({ type: 'varchar', length: 64, nullable: true }) reporterStudentId: string | null

  @Column({ type: 'varchar', length: 64, nullable: true }) classId: string | null

  /** 处理人姓名 */
  @Column({ type: 'varchar', length: 64, default: '' }) handlerName: string

  /** 处理说明 / 跟进记录 */
  @Column({ type: 'text', nullable: true }) note: string | null
}

/** 安全打卡类型：离校 / 到家 */
export type SafetyCheckinType = 'leave' | 'arrive'

/**
 * 安全打卡：低龄学生离校 / 到家 由家长协助打卡，便于教师掌握去向。
 */
@Index('idx_sc_tch_stu', ['teacherId', 'studentId'])
@Index('idx_sc_tch_cls', ['teacherId', 'classId'])
@Entity('safety_checkins')
export class SafetyCheckin extends BaseEntity {
  @Column({ type: 'varchar', length: 64 }) studentId: string
  @Column({ type: 'varchar', length: 64, nullable: true }) studentName: string | null
  @Column({ type: 'varchar', length: 64, nullable: true }) classId: string | null

  @Column({ type: 'varchar', length: 8, default: 'leave' }) type: SafetyCheckinType

  @Column({ default: '' }) date: string
  @Column({ default: '' }) time: string
  @Column({ type: 'text', nullable: true }) note: string | null
}
