import { Entity, Column } from 'typeorm'
import { BaseEntity } from '../common/entities/base.entity'

/** 课程表条目：某班某星期某节次的课程；调课时 status 置为 adjusted 并通知家长 */
@Entity('schedules')
export class Schedule extends BaseEntity {
  @Column() teacherId: string
  @Column() classId: string
  @Column({ default: '' }) className: string

  /** 星期 1–7 */
  @Column({ type: 'int' }) dayOfWeek: number
  /** 节次 */
  @Column({ type: 'int' }) period: number
  /** 科目 */
  @Column({ default: '' }) subject: string
  /** 上课地点 */
  @Column({ default: '' }) location: string
  /** 上课教师姓名 */
  @Column({ default: '' }) teacherName: string

  /** 正常 / 调课 */
  @Column({ default: 'normal' }) status: 'normal' | 'adjusted'
  /** 调课原因 */
  @Column({ type: 'text', nullable: true }) adjustReason: string | null
  /** 调课目标日期 YYYY-MM-DD */
  @Column({ type: 'varchar', nullable: true }) adjustToDate: string | null
  /** 调课目标节次 */
  @Column({ type: 'int', nullable: true }) adjustToPeriod: number | null
  /** 关联学期（可选） */
  @Column({ type: 'varchar', nullable: true }) semesterId: string | null
}
