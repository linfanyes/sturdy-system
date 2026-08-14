import { Entity, Column, Index } from 'typeorm'
import { BaseEntity } from '../common/entities/base.entity'

/**
 * 少儿编程作品。
 * - blocks：积木脚本，JSON 数组（控件 id + 参数 + 顺序），由前端序列化/反序列化。
 * - classId：发布到的班级（开放给家长时填写）；null 表示仅教师私有。
 * - publishedToParent：是否开放给该班级家长查看（默认 false，即「默认不开放」）。
 */
@Index('idx_kc_tch', ['teacherId'])
@Index('idx_kc_cls_pub', ['classId', 'publishedToParent'])
@Entity('kids_coding_projects')
export class CodingProject extends BaseEntity {
  @Column() title: string

  @Column({ type: 'text', nullable: true }) description: string

  /** 积木脚本：JSON 数组（控件 id + 参数 + 顺序），由前端序列化/反序列化 */
  @Column('json', { nullable: true }) blocks: any

  /** 发布到的班级（开放给家长时填写）；null = 仅教师私有 */
  @Column({ type: 'varchar', length: 64, nullable: true }) classId: string | null

  /** 是否开放给该班级家长查看（默认 false） */
  @Column({ type: 'boolean', default: false }) publishedToParent: boolean

  /** 作者教师展示名（冗余，便于家长端展示） */
  @Column({ type: 'varchar', length: 64, nullable: true }) teacherName: string | null
}
