import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm'

/**
 * 教材知识库：按学校隔离的公共资料。
 * 层级：教材 Textbook → 单元 TextbookUnit → 知识点 TextbookKnowledgePoint
 * 覆盖小学人教版语文、人教版数学、外研版三起英语三科。
 */

/** 教材（一本具体教材，如「人教版三年级语文上册」） */
@Entity('textbooks')
@Index('idx_textbooks_school', ['schoolId'])
@Index('idx_textbooks_publisher_subject_grade', ['publisher', 'subject', 'grade', 'term'])
export class Textbook {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @Column({ type: 'varchar', length: 36, comment: '归属学校ID' })
  schoolId: string

  @Column({ length: 50, default: '' }) publisher: string   // 人教版 / 外研版
  @Column({ length: 20, default: '' }) subject: string     // 语文 / 数学 / 英语
  @Column({ length: 20, default: '' }) grade: string       // 三年级
  @Column({ length: 20, default: '' }) term: string        // 上册 / 下册
  @Column({ length: 200 }) name: string                        // 教材名称
  @Column({ type: 'text', nullable: true }) cover: string
  @Column({ default: 'published' }) status: string  // draft / published

  @CreateDateColumn({ type: 'datetime' }) createdAt: Date
  @UpdateDateColumn({ type: 'datetime' }) updatedAt: Date
}

/** 单元（教材下的章节，如「第一单元 秋天」） */
@Entity('textbook_units')
@Index('idx_textbook_units_textbook', ['textbookId'])
export class TextbookUnit {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @Column({ type: 'varchar', length: 36 }) textbookId: string
  @Column({ type: 'int', default: 0 }) unitOrder: number
  @Column() title: string
  @Column({ type: 'text', nullable: true }) summary: string

  @CreateDateColumn({ type: 'datetime' }) createdAt: Date
  @UpdateDateColumn({ type: 'datetime' }) updatedAt: Date
}

/** 知识点（单元下的具体知识点） */
@Entity('textbook_knowledge_points')
@Index('idx_textbook_kp_unit', ['unitId'])
export class TextbookKnowledgePoint {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @Column({ type: 'varchar', length: 36 }) unitId: string
  @Column({ type: 'int', default: 0 }) pointOrder: number
  @Column() title: string
  @Column({ default: '重点' }) type: string     // 概念 / 例题 / 易错点 / 拓展 / 重点
  @Column({ type: 'text' }) content: string
  @Column({ default: '' }) difficulty: string   // 简单 / 中等 / 困难
  @Column({ default: '' }) keywords: string     // 检索关键词，逗号分隔

  @CreateDateColumn({ type: 'datetime' }) createdAt: Date
  @UpdateDateColumn({ type: 'datetime' }) updatedAt: Date
}
