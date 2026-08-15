import { Entity, Column, Index } from 'typeorm'
import { BaseEntity } from '../common/entities/base.entity'

/** 通知偏好与数据可见性设置（家长 / 教师通用） */
@Entity('notify_pref')
@Index(['ownerId', 'ownerRole'], { unique: true })
export class NotifyPref extends BaseEntity {
  /** 拥有者标识：家长为 JWT.sub（IM 账号），教师为教师 id */
  @Column({ type: 'varchar', length: 64 })
  ownerId!: string

  /** teacher | parent */
  @Column({ type: 'varchar', length: 16 })
  ownerRole!: string

  /** 免打扰开始时刻（HH:mm），含 */
  @Column({ type: 'varchar', length: 8, default: '22:00' })
  quietStart!: string

  /** 免打扰结束时刻（HH:mm），含 */
  @Column({ type: 'varchar', length: 8, default: '08:00' })
  quietEnd!: string

  /** 是否开启免打扰时段（该时段内不推送，仅做站内留存） */
  @Column({ type: 'boolean', default: false })
  quietEnabled!: boolean

  /** 是否合并推送（同类通知按日汇总为一条摘要） */
  @Column({ type: 'boolean', default: false })
  digestMode!: boolean

  /** 各通知类别开关：notice(公告) homework(作业) grade(成绩) mood(心情预警) message(留言) */
  @Column('simple-json', { nullable: true })
  categories?: Record<string, boolean>

  /** 成绩分级可见：家长端一屏是否展示「分数」 */
  @Column({ type: 'boolean', default: true })
  showGrade!: boolean

  /** 成绩分级可见：家长端一屏是否展示「排名」 */
  @Column({ type: 'boolean', default: true })
  showRank!: boolean
}
