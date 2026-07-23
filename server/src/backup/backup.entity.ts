import { Entity, Column, Index } from 'typeorm'
import { BaseEntity } from '../common/entities/base.entity'

/**
 * 数据备份记录。
 * payload 字段保存 JSON 字符串，包含 user/classes/students/grades/notes/teachers 等全量数据快照。
 * 自动备份（每 2 小时一次）与手动备份都写入此表。
 */
@Index('idx_teacher', ['teacherId'])
@Entity('backup_snapshots')
export class BackupSnapshot extends BaseEntity {
  @Column({ type: 'varchar', length: 64, comment: '备份类型：manual / auto' })
  type: string

  @Column({ type: 'varchar', length: 200 })
  label: string

  @Column({ type: 'longtext' })
  payload: string
}
