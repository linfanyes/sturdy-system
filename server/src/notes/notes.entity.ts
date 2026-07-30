import { Entity, Column, Index, ValueTransformer } from 'typeorm'
import { BaseEntity } from '../common/entities/base.entity'

// JSON 数组 ↔ LONGTEXT 互转：simple-json 映射为 TEXT(64KB)，base64 照片远超此限
const jsonArrayTransformer: ValueTransformer = {
  to: (value: string[]) => (value ? JSON.stringify(value) : null),
  from: (value: string) => {
    if (!value) return []
    try { return JSON.parse(value) } catch { return [] }
  },
}

@Index('idx_not_tch', ['teacherId'])
@Entity('notes')
export class NoteItem extends BaseEntity {
  @Column() title: string
  @Column({ type: 'text', nullable: true }) content: string
  @Column({ default: '其他' }) category: string
  @Column({ type: 'boolean', default: false }) pinned: boolean
  @Column({ type: 'boolean', default: false }) favorite: boolean
  /** 直接插入的图片（base64 data URL 数组，与 award-record 一致） */
  @Column({ type: 'longtext', nullable: true, transformer: jsonArrayTransformer }) images: string[]
}

@Index('idx_todo_tch', ['teacherId'])
@Entity('todos')
export class TodoItem extends BaseEntity {
  @Column() title: string
  @Column({ type: 'text', nullable: true }) note: string
  @Column({ default: '' }) date: string
  @Column({ type: 'boolean', default: false }) done: boolean
}

@Index('idx_pkh_tch_cls', ['teacherId', 'classId'])
@Entity('picker_history')
export class PickerHistory extends BaseEntity {
  @Column() classId: string
  @Column() studentId: string
  @Column() studentName: string
}
