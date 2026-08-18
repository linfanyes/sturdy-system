import { Entity, Column } from 'typeorm'
import { BaseEntity } from '../common/entities/base.entity'

/** 分层作业：教师按基础 / 提高 / 拓展三层布置，家长端按层查看 */
@Entity('assignments')
export class Assignment extends BaseEntity {
  @Column() classId: string
  @Column({ default: '' }) className: string
  /** 学科（与 grades / textbook 一致：语文 / 数学 / 英语 等自由字符串） */
  @Column({ default: '' }) subject: string
  @Column({ default: '' }) title: string
  /** 总说明 */
  @Column('text', { nullable: true }) content: string | null
  /** 基础层 */
  @Column('text', { nullable: true }) contentBasic: string | null
  /** 提高层 */
  @Column('text', { nullable: true }) contentImprove: string | null
  /** 拓展层 */
  @Column('text', { nullable: true }) contentExtend: string | null
  /** 截止日期 YYYY-MM-DD */
  @Column({ default: '' }) dueDate: string
}
