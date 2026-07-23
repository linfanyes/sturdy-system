import {
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm'

/**
 * 所有业务实体的基类。
 * teacherId 作为租户键：每位微信老师的数据完全隔离。
 */
export abstract class BaseEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @Column({ type: 'varchar', length: 64, comment: '租户键：教师ID' })
  teacherId: string

  @CreateDateColumn({ type: 'datetime' })
  createdAt: Date

  @UpdateDateColumn({ type: 'datetime' })
  updatedAt: Date
}
