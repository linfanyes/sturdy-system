import { Entity, Column, ValueTransformer, Index } from 'typeorm'
import { BaseEntity } from '../common/entities/base.entity'

export const jsonArrayTransformer: ValueTransformer = {
  to: (value: string[]) => (value ? JSON.stringify(value) : null),
  from: (value: string) => {
    if (!value) return []
    try { return JSON.parse(value) } catch { return [] }
  },
}

@Index('idx_mgl_tch', ['teacherId'])
@Entity('my_galleries')
export class MyGallery extends BaseEntity {
  @Column() title: string
  @Column({ nullable: true }) date: string
  @Column({ type: 'text', nullable: true }) description: string
  @Column({ type: 'longtext', nullable: true, transformer: jsonArrayTransformer }) photos: string[]
}
