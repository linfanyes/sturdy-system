import { Entity, Column, Index } from 'typeorm'
import { BaseEntity } from '../common/entities/base.entity'

export interface InsightStudentDelta {
  studentId: string
  studentName: string | null
  delta: number
}

/**
 * 班级周度洞察快照：由 InsightService 每周聚合 mood + 成绩后生成，
 * 推送给班主任并在教师端「班级洞察」看板留存，便于回溯。
 */
@Entity('class_insights')
@Index('idx_ci_tch_cls', ['teacherId', 'classId'])
@Index('idx_ci_tch_week', ['teacherId', 'weekLabel'])
export class ClassInsight extends BaseEntity {
  @Column() classId: string
  @Column({ default: '' }) className: string

  /** 形如 2026-W33 的周标识 */
  @Column() weekLabel: string
  @Column() weekStart: string
  @Column() weekEnd: string

  /** 情绪：本周平均等级（1–5，null 表示无数据） */
  @Column({ type: 'float', nullable: true }) emotionAvg: number | null
  @Column({ default: 0 }) lowMoodCount: number
  @Column('simple-json', { nullable: true }) lowMoodStudents: InsightStudentDelta[] | null

  /** 学业：最近一次考试班级均分、上一次均分、变化 */
  @Column({ type: 'float', nullable: true }) gradeLatestAvg: number | null
  @Column({ type: 'float', nullable: true }) gradePrevAvg: number | null
  @Column({ type: 'float', nullable: true }) gradeDelta: number | null
  @Column('simple-json', { nullable: true }) gradeImproved: InsightStudentDelta[] | null
  @Column('simple-json', { nullable: true }) gradeDeclined: InsightStudentDelta[] | null

  /** AI 生成的班级洞察文案；generatedBy 标记来源以便降级 */
  @Column('text') summary: string
  @Column({ default: 'template' }) generatedBy: 'ai' | 'template'
}
