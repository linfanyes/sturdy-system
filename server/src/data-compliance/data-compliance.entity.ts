import { Entity, Column, Index } from 'typeorm'
import { BaseEntity } from '../common/entities/base.entity'

/** 监护人数据授权（未成年人数据保护：告知-同意-可撤回） */
@Entity('data_consent')
@Index(['ownerId'], { unique: true })
export class DataConsent extends BaseEntity {
  /** 家长 JWT.sub（IM 账号） */
  @Column({ type: 'varchar', length: 64 })
  ownerId!: string

  @Column({ type: 'varchar', length: 64, nullable: true })
  studentId?: string

  @Column({ type: 'varchar', length: 64, nullable: true })
  studentName?: string

  /** 各授权项开关：mood(心情/树洞) worksPublic(作品公开) aiAnalysis(AI分析) */
  @Column('simple-json', { nullable: true })
  consents?: Record<string, boolean>

  /** 授权条款版本 */
  @Column({ type: 'varchar', length: 16, default: '1.0' })
  version!: string

  /** 撤回时间；为空表示仍有效 */
  @Column({ type: 'datetime', nullable: true })
  withdrawnAt: Date | null
}
