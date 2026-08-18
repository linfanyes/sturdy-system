import {
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
} from 'typeorm'

/**
 * 所有业务实体的基类。
 * teacherId 作为租户键：每位微信老师的数据完全隔离。
 * deletedAt 支持软删除（TypeORM @DeleteDateColumn 自动映射）。
 */
export abstract class BaseEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @Column({ type: 'varchar', length: 64, nullable: true, comment: '租户键：教师ID（默认 nullable，各实体按需覆盖 required 语义）' })
  teacherId: string

  @CreateDateColumn({ type: 'datetime' })
  createdAt: Date

  @UpdateDateColumn({ type: 'datetime' })
  updatedAt: Date

  @DeleteDateColumn({ type: 'datetime', nullable: true, comment: '软删除时间：NULL=未删除，非NULL=已删除' })
  deletedAt: Date | null
}
