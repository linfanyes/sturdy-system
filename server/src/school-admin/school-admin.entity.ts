import { Entity, Column } from 'typeorm'
import { PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm'

@Entity('school_admins')
export class SchoolAdmin {
  @PrimaryGeneratedColumn('uuid')
  id: string

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

  @CreateDateColumn()
  createdAt: Date

  @UpdateDateColumn()
  updatedAt: Date
}
