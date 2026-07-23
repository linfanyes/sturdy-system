import { Entity, Column, Index } from 'typeorm'
import { BaseEntity } from '../common/entities/base.entity'

/**
 * 教学日历计划实体
 * 教师可在日历上添加教学计划、备课安排、考试安排等
 */
@Index('idx_teacher_date', ['teacherId', 'date'])
@Index('idx_calendar_cov', ['teacherId', 'createdAt'])
@Entity('teaching_calendar')
export class TeachingCalendarItem extends BaseEntity {
  /** 计划标题 */
  @Column() title: string

  /** 计划日期 (YYYY-MM-DD) */
  @Column() date: string

  /** 年级（可选） */
  @Column({ default: '' }) grade: string

  /** 科目（可选） */
  @Column({ default: '' }) subject: string

  /** 备注 */
  @Column({ type: 'text', nullable: true }) note: string

  /** 颜色标记 */
  @Column({ default: '#e8f1fb' }) color: string

  /** 计划类型：normal-普通, exam-考试, meeting-教研, other-其他 */
  @Column({ default: 'normal' }) type: string
}
