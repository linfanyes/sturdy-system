import { Entity, Column, Index } from 'typeorm'
import { BaseEntity } from '../common/entities/base.entity'

/**
 * 少儿编程作品。
 * 归属区分（二者互斥）：
 * - 教师作品：teacherId 有值、studentId 为 null；可经 publishedToParent 发布给班级家长查看。
 * - 练习作品：studentId 有值、teacherId 为 null；由家长/学生本人在家长端创作，仅本人可见。
 */
@Index('idx_kc_tch', ['teacherId'])
@Index('idx_kc_cls_pub', ['classId', 'publishedToParent'])
@Index('idx_kc_stu', ['studentId'])
@Entity('kids_coding_projects')
export class CodingProject extends BaseEntity {
  @Column() title: string

  @Column({ type: 'text', nullable: true }) description: string

  /** 积木脚本：JSON 数组（控件 id + 参数 + 顺序），由前端序列化/反序列化 */
  @Column('json', { nullable: true }) blocks: any

  /** 发布到的班级（教师作品开放给家长时填写）；null = 仅教师私有 */
  @Column({ type: 'varchar', length: 64, nullable: true }) classId: string | null

  /** 是否开放给该班级家长查看（默认 false，即「默认不开放」） */
  @Column({ type: 'boolean', default: false }) publishedToParent: boolean

  /** 作者教师展示名（冗余，便于家长端展示） */
  @Column({ type: 'varchar', length: 64, nullable: true }) teacherName: string | null

  /** 练习作品所有者（家长端创作的学生练习）；有值表示练习作品，与 teacherId 互斥 */
  @Column({ type: 'varchar', length: 64, nullable: true }) studentId: string | null

  /** 关联的任务卡（学生练习对应某道挑战）；null = 自由练习 */
  @Column({ type: 'varchar', length: 64, nullable: true }) challengeId: string | null

  /** 是否作为作业提交（true=已提交作业，false=草稿/随便练） */
  @Column({ type: 'boolean', default: false }) submitted: boolean

  /** 作业提交时间（草稿为 null） */
  @Column({ type: 'datetime', nullable: true }) submittedAt: Date | null

  /** 是否被选入班级作品墙（教师精选，家长端只读画廊可见） */
  @Column({ type: 'boolean', default: false }) showInGallery: boolean
}
