import { Entity, Column } from 'typeorm'
import { BaseEntity } from '../common/entities/base.entity'

/** 班级周报 / 月报：定时聚合成绩、五育、心情、习惯、安全后由 AI 生成文案 */
@Entity('reports')
export class Report extends BaseEntity {
  @Column() teacherId: string
  @Column() classId: string
  @Column({ default: '' }) className: string
  /** weekly 周报 / monthly 月报 */
  @Column({ default: 'weekly' }) type: 'weekly' | 'monthly'
  /** 周期标识，如 2026-W33 / 2026-08 */
  @Column({ default: '' }) periodLabel: string
  @Column({ default: '' }) title: string
  /** AI 生成的报告正文（HTML 安全纯文本） */
  @Column('text', { nullable: true }) content: string | null
  /** 结构化指标（JSON 字符串），供前端展示卡片 */
  @Column('text', { nullable: true }) metrics: string | null
  @Column({ default: 'ai' }) generatedBy: 'ai' | 'template'
  /** 统计区间 */
  @Column({ default: '' }) fromDate: string
  @Column({ default: '' }) toDate: string
}
