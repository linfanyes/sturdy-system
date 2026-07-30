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

@Index('idx_cop_tch_cls', ['teacherId', 'classId'])
@Entity('class_expenses')
export class ClassExpense extends BaseEntity {
  @Column() classId: string
  @Column() type: string
  @Column({ default: '' }) category: string
  @Column({ type: 'float', default: 0 }) amount: number
  @Column() date: string
  @Column({ type: 'text', nullable: true }) description: string
  @Column({ default: '' }) handler: string
}

@Index('idx_act_tch_cls', ['teacherId', 'classId'])
@Entity('class_activities')
export class ClassActivity extends BaseEntity {
  @Column() classId: string
  @Column() title: string
  @Column() date: string
  @Column({ type: 'text', nullable: true }) description: string
  // 图片以 base64 dataURL 数组直存，用 LONGTEXT(4GB) 容纳多张照片
  @Column({ type: 'longtext', nullable: true, transformer: jsonArrayTransformer }) photos: string[]
}

@Index('idx_dtc_tch_cls', ['teacherId', 'classId'])
@Entity('class_duty_configs')
export class ClassDutyConfig extends BaseEntity {
  @Column() classId: string
  @Column('simple-json') duties: string[]
  @Column('simple-json') assignments: Record<string, string[]>
}
