import { Entity, Column, Index } from 'typeorm'
import { BaseEntity } from '../common/entities/base.entity'

/**
 * 少儿编程任务卡（课堂挑战）。
 * 教师创建并发到某个班级，学生在家长端「挑战」中看到，完成练习后作为作业提交。
 */
@Index('idx_kc_ch_cls', ['classId'])
@Index('idx_kc_ch_tch', ['teacherId'])
@Entity('kids_coding_challenges')
export class CodingChallenge extends BaseEntity {
  /** 挑战标题，如「画一个正方形」 */
  @Column({ type: 'varchar', length: 255 }) title: string

  /** 任务说明 / 目标描述（学生看到的学习目标） */
  @Column({ type: 'text', nullable: true }) goal: string | null

  /** 发布到的班级（学生按班级看到对应挑战） */
  @Column({ type: 'varchar', length: 64, nullable: true }) classId: string | null

  /** 起始积木模板（可选）：学生打开挑战时预填的脚手架代码，JSON 数组 */
  @Column('json', { nullable: true }) starterBlocks: any

  /**
   * 自动判题配置（可选，预留）。
   * 例如：{ type:'reach', x:100, y:0 } / { type:'steps', max:20 } / { type:'draw', minSegments:4 }
   * 运行引擎跑完后比对落点/轨迹/步数给出 ✅/❌。留空则由教师人工批改。
   */
  @Column('json', { nullable: true }) criteria: any

  /** 作者教师展示名（冗余，便于家长端展示） */
  @Column({ type: 'varchar', length: 64, nullable: true }) teacherName: string | null
}
