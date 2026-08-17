import { Entity, Column } from 'typeorm'
import { BaseEntity } from '../common/entities/base.entity'

// P1-3修复：继承 BaseEntity，统一 id/createdAt/updatedAt/teacherId 字段
// teacherId 在 BaseEntity 中 nullable，校管场景不使用（用 schoolId 隔离）
@Entity('school_admins')
export class SchoolAdmin extends BaseEntity {
  @Column({ unique: true })
  username: string

  @Column()
  passwordHash: string

  @Column()
  name: string

  @Column()
  schoolId: string  // 归属学校

  @Column('simple-json', { nullable: true })
  permissions: string[]  // 可管理模块：teachers / classes / notices ...

  @Column({ type: 'boolean', default: true })
  enabled: boolean  // 开启标志：true=启用 / false=禁用
}
