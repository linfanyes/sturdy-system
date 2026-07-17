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

  @Column({ default: '🍎' })
  avatar: string

  @Column({ type: 'text', nullable: true })
  motto: string

  @Column({ nullable: true })
  sessionKey: string

  @Column({ default: 'light' })
  theme: string

  @Column({ default: 'butter' })
  colorScheme: string

  @Column({ default: 'md' })
  fontSize: string

  @Column({ type: 'datetime', default: () => 'CURRENT_TIMESTAMP' })
  createdAt: Date

  @Column({ type: 'datetime', default: () => 'CURRENT_TIMESTAMP' })
  updatedAt: Date
}
