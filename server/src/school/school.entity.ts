import { Entity, Column, Index } from 'typeorm'
import { BaseEntity } from '../common/entities/base.entity'

/* ===== 学校实体（超管管理）===== */
// P1-7 修复：继承 BaseEntity，获得 id/teacherId/createdAt/updatedAt/deletedAt 一致性
@Entity('schools')
export class School extends BaseEntity {
  @Column({ unique: true, length: 12 })
  code: string // 学校编号（2 位前缀 + 5 位随机 + 平台后缀 H/W，共 8 位，超管创建时生成，唯一且不可修改）

  @Column()
  name: string

  @Column({ default: '' })
  address: string

  @Column({ default: '' })
  contact: string

  @Column({ default: '' })
  phone: string

  @Column({ default: 'active' })
  status: string // active / inactive

  /**
   * 学校级功能包开关（超管独占配置）。
   * - null / [] / undefined  = 该校全部功能包开启（不收窄教师级）。
   * - 指定数组            = 仅列出的「包级 key」可用，其余被学校级强制关闭。
   * 解析顺序：学校级(order 10) ∩ 教师级(order 20)；学校级关闭的 key，下级即使开启也失效。
   */
  @Column('simple-json', { nullable: true, comment: '学校级功能包开关：null/[]=全部开启；数组=仅列出的包级key可用（超管独占）' })
  featureFlags: string[] | null
}

/* ===== 班级/课表/考勤/作业/通知/资源 ===== */

@Index('idx_sch_tch_cls', ['teacherId', 'classId'])
@Entity('schedules')
export class ScheduleItem extends BaseEntity {
  @Column() classId: string
  @Column({ type: 'int' }) dayOfWeek: number
  @Column({ type: 'int' }) period: number
  // 周次：all=全周, single=单周, double=双周
  @Column({ default: 'all' }) weekType: string
  // 非数字节次名（早读/晨读/晚自习/晚修等）；普通数字节次为 null
  @Column({ type: 'varchar', length: 20, nullable: true }) section: string | null
  @Column({ default: '' }) subject: string
  @Column({ default: '' }) teacher: string
  @Column({ type: 'text', nullable: true }) note: string
}

@Index('idx_att_tch_cls', ['teacherId', 'classId'])
@Entity('attendances')
export class Attendance extends BaseEntity {
  @Column() classId: string
  @Column() date: string
  @Column('simple-json') records: { studentId: string; status: string }[]
}

@Index('idx_hwk_tch_cls', ['teacherId', 'classId'])
@Entity('homework')
export class Homework extends BaseEntity {
  @Column() classId: string
  @Column() subject: string
  @Column() title: string
  @Column({ type: 'text', nullable: true }) content: string
  @Column({ default: '' }) startDate: string
  @Column({ default: '' }) deadline: string
  @Column({ default: '待批改' }) status: string
}

@Index('idx_ntc_tch_cls', ['teacherId', 'classId'])
@Entity('notices')
export class Notice extends BaseEntity {
  @Column({ default: '全校' }) classId: string
  @Column() title: string
  @Column({ type: 'text', nullable: true }) content: string
  @Column({ type: 'boolean', default: false }) pinned: boolean
  @Column({ type: 'boolean', default: false }) ended: boolean
  @Column({ nullable: true }) endedAt: string
  @Column({ default: 'class' }) scope: string  // 'class'=班级公告 'school'=学校公告
}

@Index('idx_res_tch', ['teacherId'])
@Entity('resources')
export class Resource extends BaseEntity {
  @Column() title: string
  @Column({ default: '' }) url: string
  @Column({ default: '' }) category: string
  @Column('simple-json', { nullable: true }) tags: string[]
  @Column({ type: 'text', nullable: true }) description: string
  @Column({ type: 'text', nullable: true }) image: string
}
