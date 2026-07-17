import { Entity, Column } from 'typeorm'
import { BaseEntity } from '../common/entities/base.entity'

@Entity('notes')
export class NoteItem extends BaseEntity {
  @Column() title: string
  @Column({ type: 'text', default: '' }) content: string
  @Column({ default: '其他' }) category: string
  @Column({ type: 'boolean', default: false }) pinned: boolean
  @Column({ type: 'boolean', default: false }) favorite: boolean
}

@Entity('todos')
export class TodoItem extends BaseEntity {
  @Column() title: string
  @Column({ type: 'text', default: '' }) note: string
  @Column({ default: '' }) date: string
  @Column({ type: 'boolean', default: false }) done: boolean
}

@Entity('picker_history')
export class PickerHistory extends BaseEntity {
  @Column() classId: string
  @Column() studentId: string
  @Column() studentName: string
}
