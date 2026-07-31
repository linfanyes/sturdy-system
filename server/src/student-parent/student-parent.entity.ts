import { Entity, Column, PrimaryGeneratedColumn, Index, CreateDateColumn, UpdateDateColumn } from 'typeorm'

/**
 * 学生-家长微信绑定关联表（多对多）。
 *
 * 一个学生可绑定多个微信（爸爸、妈妈、监护人各自用自己微信绑定同一学生）；
 * 一个微信也可关联多个学生（自家多娃，跨班跨校皆可）。
 *
 * 与 Student.parentId 的关系：
 * - Student.parentId 保留为"主家长"兼容旧逻辑（首个绑定的家长写入）
 * - 本表为权威绑定关系来源，登录/切换/列表均优先查本表
 *
 * schoolId 冗余学生所属学校，便于跨校家长聚合查看。
 */
@Entity('student_parents')
@Index('idx_sp_student', ['studentId'])
@Index('idx_sp_parent', ['parentId'])
@Index('idx_sp_openid', ['openId'])
@Index('idx_sp_student_openid', ['studentId', 'openId'], { unique: true })
export class StudentParent {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @Column() studentId: string

  /** 关联 Parent.id（同一 openid 对应同一 Parent 记录） */
  @Column() parentId: string

  /** 冗余 openid，便于按微信直接查询绑定列表 */
  @Column() openId: string

  /** 关系：父亲/母亲/监护人，默认空 */
  @Column({ default: '' }) relation: string

  /** 微信昵称（绑定时由前端 getUserProfile 提供） */
  @Column({ default: '' }) nickName: string

  /** 微信头像（绑定时由前端提供，可选） */
  @Column({ default: '' }) avatar: string

  /** 是否主家长（首个绑定自动置 true，教师可改） */
  @Column({ default: false }) isPrimary: boolean

  /** 学生所属学校（冗余，跨校家长聚合用） */
  @Column({ default: '' }) schoolId: string

  /** 学生所在班级（冗余，便于按班级筛选家长列表） */
  @Column({ default: '' }) classId: string

  @CreateDateColumn() createdAt: Date
  @UpdateDateColumn() updatedAt: Date
}
