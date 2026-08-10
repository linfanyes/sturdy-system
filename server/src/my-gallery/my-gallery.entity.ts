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
  // QA/SQLite 兼容：longtext 为 MySQL 专有类型，内存库（better-sqlite3）降级为 text（run.ts 设 QA_MODE=1）
  @Column({ type: (process.env.QA_MODE === '1' ? 'text' : 'longtext') as any, nullable: true, transformer: jsonArrayTransformer }) photos: string[]
}
