import { Entity, Column, Index } from 'typeorm'
import { BaseEntity } from '../common/entities/base.entity'

/** 习惯类型 */
export type HabitType = 'reading' | 'sport' | 'early_sleep' | 'other'

/**
 * 21 天习惯养成挑战：阅读 / 运动 / 早睡 等，连续打卡养成好习惯。
 * 由教师或家长发起，归属到学生（个人挑战）或班级（班级挑战）。
 */
@Index('idx_habit_tch_stu', ['teacherId', 'studentId'])
@Index('idx_habit_tch_cls', ['teacherId', 'classId'])
@Entity('habit_challenges')
export class HabitChallenge extends BaseEntity {
  @Column({ type: 'varchar', length: 16, default: 'reading' }) type: HabitType

  @Column({ type: 'varchar', length: 64 }) title: string

  /** 目标连续天数（默认 21 天） */
  @Column({ type: 'int', default: 21 }) targetDays: number

  @Column({ type: 'varchar', length: 64 }) teacherId: string

  @Column({ type: 'varchar', length: 64, nullable: true }) classId: string | null

  /** 个人挑战归属学生；班级挑战为 null */
  @Column({ type: 'varchar', length: 64, nullable: true }) studentId: string | null

  /** 发起人角色 */
  @Column({ type: 'varchar', length: 8, default: 'parent' }) createdByRole: 'teacher' | 'parent'

  @Column({ default: '' }) startDate: string

  @Column({ type: 'text', nullable: true }) note: string | null
}

/** 习惯打卡记录 */
@Index('idx_hc_cha_stu_date', ['challengeId', 'studentId', 'date'])
@Entity('habit_checkins')
export class HabitCheckin extends BaseEntity {
  @Column({ type: 'varchar', length: 64 }) challengeId: string
  @Column({ type: 'varchar', length: 64 }) studentId: string
  @Column({ type: 'varchar', length: 64 }) teacherId: string
  @Column({ type: 'varchar', length: 64, nullable: true }) classId: string | null
  @Column({ default: '' }) date: string
  @Column({ type: 'text', nullable: true }) note: string | null
}
