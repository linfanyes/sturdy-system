import { Entity, Column, Index } from 'typeorm'
import { BaseEntity } from '../common/entities/base.entity'

// 说明：LessonObservation / WorkLog 实体已收敛至各自模块（lesson-observation / work-log），
// 本文件不再重复定义（历史债 #2：重复定义曾导致同一表两套实体元数据分叉）。
// 索引元数据（idx_adm_tch_cls / idx_adm_tch）已迁移至对应模块实体。

@Index('idx_lpt_tch', ['teacherId'])
@Entity('lesson_plan_templates')
export class LessonPlanTemplate extends BaseEntity {
  @Column() title: string
  @Column({ default: '' }) subject: string
  @Column({ default: '新授课' }) lessonType: string
  @Column({ default: '' }) grade: string
  @Column({ type: 'text', nullable: true }) content: string
  @Column({ type: 'boolean', default: false }) isFavorite: boolean
}
