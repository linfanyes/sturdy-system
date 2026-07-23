import { Entity, Column } from 'typeorm'
import { BaseEntity } from '../common/entities/base.entity'

@Entity('generated_papers')
export class GeneratedPaper extends BaseEntity {
  @Column() title: string
  @Column({ default: '' }) grade: string
  @Column({ default: '' }) subject: string
  @Column({ type: 'text', nullable: true }) prompt: string
  @Column({ type: 'text', nullable: true }) content: string
}

@Entity('generated_lesson_plans')
export class GeneratedLessonPlan extends BaseEntity {
  @Column() title: string
  @Column({ default: '' }) topic: string
  @Column({ default: '' }) subject: string
  @Column({ default: '' }) grade: string
  @Column({ type: 'text', nullable: true }) prompt: string
  @Column({ type: 'text', nullable: true }) content: string
}

@Entity('generated_knowledges')
export class GeneratedKnowledge extends BaseEntity {
  @Column() title: string
  @Column({ default: '' }) grade: string
  @Column({ default: '' }) subject: string
  @Column({ default: '' }) textbook: string
  @Column({ default: '' }) term: string
  @Column({ type: 'text', nullable: true }) prompt: string
  @Column({ type: 'text', nullable: true }) content: string
}

@Entity('paper_queries')
export class PaperQueryDoc extends BaseEntity {
  @Column() keyword: string
  @Column() title: string
  @Column({ default: '' }) source: string
  @Column({ default: '' }) year: string
  @Column({ type: 'text', nullable: true }) abstract: string
  @Column({ type: 'text', nullable: true }) content: string
}
