import { Entity, Column } from 'typeorm'
import { Transform } from 'class-transformer'
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

  /** P3-1修复：API 响应时自动掩码手机号（138****8000） */
  @Transform(({ obj }) => {
    const p = obj?.phone || ''
    return p.length >= 7 ? p.slice(0, 3) + '****' + p.slice(-4) : p
  })
  readonly maskedPhone!: string
  @Column({ default: '' }) email: string
  @Column('simple-json', { nullable: true }) teachings: TeachingEntry[]
  @Column('simple-array', { nullable: true }) subjects: string[]
  @Column('simple-array', { nullable: true }) classIds: string[]
  @Column({ type: 'text', nullable: true }) remark: string
  @Column({ default: '' }) joinAt: string
  @Column({ default: '🧑' }) avatar: string
  @Column({ type: 'boolean', default: false }) isStarred: boolean
}
