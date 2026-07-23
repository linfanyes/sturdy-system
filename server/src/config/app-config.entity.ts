import { Entity, Column, PrimaryGeneratedColumn } from 'typeorm'

/**
 * 平台级配置（全局，不区分教师）。启动时会用环境变量种子填充。
 * 包含：默认学科、登录码、AI 默认地址/密钥/模型等。
 */
@Entity('app_config')
export class AppConfig {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @Column({ unique: true })
  key: string

  @Column({ type: 'text' })
  value: string

  @Column({ default: 'string' })
  type: string

  @Column({ type: 'text', nullable: true })
  description: string
}
