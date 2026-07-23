import { Entity, Column, Index } from 'typeorm'
import { BaseEntity } from '../common/entities/base.entity'

@Index('idx_teacher', ['teacherId'])
@Entity('notes')
export class NoteItem extends BaseEntity {
  @Column() title: string
  @Column({ type: 'text', nullable: true }) content: string
  @Column({ default: '其他' }) category: string
  @Column({ type: 'boolean', default: false }) pinned: boolean
  @Column({ type: 'boolean', default: false }) favorite: boolean
  /** 直接插入的图片（base64 data URL 数组，与 award-record 一致） */
  @Column({ type: 'simple-json', nullable: true }) images: string[]
}

@Index('idx_teacher', ['teacherId'])
@Entity('todos')
export class TodoItem extends BaseEntity {
  @Column() title: string
  @Column({ type: 'text', nullable: true }) note: string
  @Column({ default: '' }) date: string
  @Column({ type: 'boolean', default: false }) done: boolean
}

@Index('idx_teacher_class', ['teacherId', 'classId'])
@Entity('picker_history')
export class PickerHistory extends BaseEntity {
  @Column() classId: string
  @Column() studentId: string
  @Column() studentName: string
}
