import { Entity, Column, Index } from 'typeorm'
import { BaseEntity } from '../common/entities/base.entity'

/**
 * 班级成员关系表：记录教师与班级的多对多关系。
 * - role: 'head'（班主任）| 'subject'（科任老师）
 * - subjects: 该老师在此班级任教的学科列表（JSON 数组）
 *
 * 班主任创建班级时自动写入 role='head' 记录；
 * 校管可在"教师管理"中把科任老师加入班级（role='subject'）。
 * base.service 的 findAll/findOne 对"班级维度"实体按此表过滤，实现同班协作。
 */
@Entity('class_members')
@Index('idx_cm_class', ['classId'])
@Index('idx_cm_teacher', ['teacherId'])
@Index('idx_cm_teacher_class', ['teacherId', 'classId'], { unique: true })
export class ClassMember extends BaseEntity {
  @Column() classId: string

  @Column() teacherId: string

  /** 班级可见名称（冗余，便于列表展示） */
  @Column({ default: '' }) className: string

  /** 角色：head=班主任, subject=科任老师 */
  @Column({ default: 'subject' }) role: string

  /** 任教学科列表（JSON 数组，如 ['语文','数学']） */
  @Column('simple-json', { nullable: true }) subjects: string[]
}
