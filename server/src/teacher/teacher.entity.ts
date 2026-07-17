import { Entity, Column } from 'typeorm'
import { BaseEntity } from '../common/entities/base.entity'

export interface TeachingEntry {
  classId: string
  subject: string
}

@Entity('teachers')
export class Teacher extends BaseEntity {
  @Column() name: string
  @Column({ default: '' }) position: string
  @Column({ default: '' }) phone: string
  @Column({ default: '' }) email: string
  @Column('simple-json', { default: '[]' }) teachings: TeachingEntry[]
  @Column({ type: 'text', default: '' }) remark: string
  @Column({ default: '' }) joinAt: string
  @Column({ default: '🧑' }) avatar: string
  @Column({ type: 'boolean', default: false }) isStarred: boolean
}
