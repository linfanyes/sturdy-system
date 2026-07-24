import { Entity, Column, PrimaryGeneratedColumn } from 'typeorm'

/**
 * 教师（= 租户）账号。微信授权登录后按 openid 自动建档。
 */
@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @Column({ unique: true, nullable: true, comment: '微信 openid' })
  openid: string

  @Column({ default: '老师' })
  name: string

  @Column({ default: '语文' })
  subject: string

  @Column('simple-array', { nullable: true })
  subjects: string[]

  @Column({ default: '' })
  term: string

  @Column({ default: '' })
  school: string

  @Column({ nullable: true })
  schoolId: string

  @Column({ nullable: true, unique: true })
  username: string

  @Column({ nullable: true })
  passwordHash: string

  @Column({ default: '' })
  phone: string

  @Column({ default: '', comment: '性别（男/女）' })
  gender: string

  @Column({ default: '' })
  email: string

  @Column({ default: '🍎' })
  avatar: string

  @Column({ type: 'text', nullable: true })
  motto: string

  @Column({ nullable: true })
  sessionKey: string

  @Column({ nullable: true, comment: '教师编号（JS+学校代码+5位序号，用于微信绑定）' })
  teacherNo: string

  @Column({ nullable: true, comment: '微信昵称（绑定时的微信用户昵称）' })
  wechatName: string

  @Column({ default: 'light' })
  theme: string

  @Column({ default: 'butter' })
  colorScheme: string

  @Column({ default: 'md' })
  fontSize: string

  @Column('simple-json', { nullable: true, comment: '管理员配置的功能权限,空数组或null=全部可用' })
  features: string[]

  @Column({ type: 'boolean', default: true, comment: '是否启用（学校管理员控制）' })
  enabled: boolean

  @Column({ type: 'datetime', default: () => 'CURRENT_TIMESTAMP' })
  createdAt: Date

  @Column({ type: 'datetime', default: () => 'CURRENT_TIMESTAMP' })
  updatedAt: Date
}
