import { Entity, Column, Index } from 'typeorm'
import { BaseEntity } from '../common/entities/base.entity'

/**
 * 班级成员关系表：记录教师与班级的多对多关系（按学期隔离）。
 * - role: 'head'（班主任）| 'subject'（科任老师）
 * - subjects: 该老师在此班级任教的学科列表（JSON 数组，班主任可兼任本班科任）
 * - term: 学期名（如 '2026春季'），与 ClassItem.term 对齐
 *
 * 班主任业务规则（一师一班 head / 一班一 head）在同一 term 内生效；
 * 跨学期互不影响——春季的 head 记录不阻止秋季担任其他班 head。
 *
 * 学期轮换：秋季开学校管建新班（term='2026秋季'）并指定新班主任，
 * 春季的 head 记录作为历史保留，老师切换到春季学期仍可查看该班学生表现。
 */
@Entity('class_members')
@Index('idx_cm_class', ['classId'])
@Index('idx_cm_teacher', ['teacherId'])
@Index('idx_cm_teacher_class_term', ['teacherId', 'classId', 'term'], { unique: true })
export class ClassMember extends BaseEntity {
  @Column() classId: string

  @Column() teacherId: string

  /** 班级可见名称（冗余，便于列表展示） */
  @Column({ default: '' }) className: string

  /** 角色：head=班主任, subject=科任老师 */
  @Column({ default: 'subject' }) role: string

  /** 任教学科列表（JSON 数组，如 ['语文','数学']；班主任可兼任本班科任） */
  @Column('simple-json', { nullable: true }) subjects: string[]

  /** 学期名（如 '2026春季'，与 ClassItem.term 对齐；空串表示未分学期） */
  @Column({ default: '' }) term: string
}
