import { Entity, Column, ValueTransformer, Index } from 'typeorm'
import { BaseEntity } from '../common/entities/base.entity'

// JSON 数组 ↔ LONGTEXT 互转：simple-json 映射为 TEXT(64KB)，base64 照片远超此限
const jsonArrayTransformer: ValueTransformer = {
  to: (value: string[]) => (value ? JSON.stringify(value) : null),
  from: (value: string) => {
    if (!value) return []
    try { return JSON.parse(value) } catch { return [] }
  },
}

@Index('idx_gal_tch_cls', ['teacherId', 'classId'])
@Entity('class_galleries')
export class ClassGallery extends BaseEntity {
  @Column() classId: string
  @Column() title: string
  @Column({ type: 'text', nullable: true }) description: string
  @Column({ default: '' }) date: string
  // 图片以 base64 dataURL 数组直存，用 LONGTEXT 容纳多张照片（TEXT 仅 64KB 会溢出）
  // QA/SQLite 兼容：longtext 为 MySQL 专有类型，内存库（better-sqlite3）降级为 text（run.ts 设 QA_MODE=1）
  @Column({ type: (process.env.QA_MODE === '1' ? 'text' : 'longtext') as any, nullable: true, transformer: jsonArrayTransformer }) photos: string[]
}
