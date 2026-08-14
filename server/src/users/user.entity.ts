import { Entity, Column } from 'typeorm'
import { BaseEntity } from '../common/entities/base.entity'

/**
 * 教师（= 租户）账号。微信授权登录后按 openid 自动建档。
 *
 * 继承 BaseEntity 统一 id/createdAt/updatedAt 定义。
 * User 表通过 schoolId 字段实现学校级隔离（非 teacherId），
 * 故重写 teacherId 为可选字段（不使用 BaseEntity 的 tenant 隔离语义）。
 */
@Entity('users')
export class User extends BaseEntity {

  /**
   * 重写 BaseEntity.teacherId：对 User 实体，
   * teacherId 不充当 tenant isolation 键（User 表通过 schoolId 隔离），
   * 保留此字段以兼容 BaseEntity 结构，由应用层按需填充。
   */
  @Column({ type: 'varchar', length: 64, nullable: true, comment: '租户键：教师ID（User表不使用此字段隔离数据，保留以兼容BaseEntity）' })
  teacherId: string

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

  @Column({ default: '', comment: '职务（如：班主任、一年级语文组长）；单选兼容字段' })
  position: string

  @Column('simple-array', { nullable: true, comment: '教师职务列表（支持多选，如 班主任,语文组长）' })
  positions: string[]

  @Column({ default: '', comment: '教师任教学段/年级（如 一年级），便于教师管理中按年级查看' })
  grade: string

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
}
