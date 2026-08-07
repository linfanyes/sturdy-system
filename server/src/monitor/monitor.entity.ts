import { Entity, Column, Index, PrimaryGeneratedColumn, CreateDateColumn } from 'typeorm'

/**
 * 前端监控日志（错误 / 性能指标）。
 * 与业务实体不同：无租户键（teacherId），错误可能发生在未登录时；
 * 仅在请求头携带 userId/role 时透传归属信息，用于问题定位。
 */
@Index('idx_monitor_type_created', ['type', 'createdAt'])
@Entity('monitor_logs')
export class MonitorLog {
  @PrimaryGeneratedColumn('uuid')
  id: string

  /** error | unhandledrejection | vitals | perf */
  @Column({ type: 'varchar', length: 32, default: 'error' })
  type: string

  /** 来源页面路由（如 /teacher/exams） */
  @Column({ type: 'varchar', length: 255, default: '' })
  page: string

  /** 错误消息或指标名（如 LCP） */
  @Column({ type: 'varchar', length: 2000, default: '' })
  message: string

  @Column({ type: 'text', nullable: true })
  stack: string

  /** 附加 JSON（指标值 / 错误上下文 / 用户代理等） */
  @Column({ type: 'text', nullable: true })
  meta: string

  /** 来源 URL（不含查询串，防敏感参数落库） */
  @Column({ type: 'varchar', length: 500, default: '' })
  url: string

  /** 可选归属：token 携带者 userId / role（尽力解析，失败留空） */
  @Column({ type: 'varchar', length: 64, default: '' })
  userId: string

  @Column({ type: 'varchar', length: 32, default: '' })
  role: string

  @CreateDateColumn({ type: 'datetime' })
  createdAt: Date
}
