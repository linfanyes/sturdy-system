import { Entity, Column, Index } from 'typeorm'
import { BaseEntity } from '../common/entities/base.entity'

@Index('idx_teacher_class', ['teacherId', 'classId'])
@Entity('lesson_observations')
export class LessonObservation extends BaseEntity {
  @Column() teacherName: string
  @Column() classId: string
  @Column({ default: '' }) className: string
  @Column({ default: '' }) subject: string
  @Column({ default: '' }) topic: string
  @Column() date: string
  @Column({ type: 'text', nullable: true }) strengths: string
  @Column({ type: 'text', nullable: true }) suggestions: string
  @Column({ default: '良好' }) overallRating: string
}

@Index('idx_teacher', ['teacherId'])
@Entity('work_logs')
export class WorkLog extends BaseEntity {
  @Column() date: string
  @Column({ type: 'text', nullable: true }) content: string
  @Column({ type: 'int', default: 0 }) classCount: number
  @Column({ type: 'int', default: 0 }) homeworkCount: number
  @Column({ type: 'text', nullable: true }) note: string
}

@Index('idx_teacher', ['teacherId'])
@Entity('lesson_plan_templates')
export class LessonPlanTemplate extends BaseEntity {
  @Column() title: string
  @Column({ default: '' }) subject: string
  @Column({ default: '新授课' }) lessonType: string
  @Column({ default: '' }) grade: string
  @Column({ type: 'text', nullable: true }) content: string
  @Column({ type: 'boolean', default: false }) isFavorite: boolean
}
