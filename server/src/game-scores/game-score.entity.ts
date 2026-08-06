import { Entity, Column, Index } from 'typeorm'
import { BaseEntity } from '../common/entities/base.entity'

/**
 * 小游戏得分记录实体（按教师租户隔离）。
 * 同一游戏每人仅保留一条最高分记录（幂等 upsert）。
 */
@Index('idx_gsc_tch_game', ['teacherId', 'gameKey'])
@Entity('game_scores')
export class GameScore extends BaseEntity {
  /** 游戏唯一标识（如 '2048'、'flappy'、'snake'） */
  @Column({ length: 64 })
  gameKey: string

  /** 游戏显示名（用于榜单展示） */
  @Column({ length: 64 })
  gameName: string

  /** 最高分 */
  @Column({ type: 'int', default: 0 })
  bestScore: number

  /** 最近一次得分 */
  @Column({ type: 'int', default: 0 })
  lastScore: number

  /** 游玩次数 */
  @Column({ type: 'int', default: 0 })
  playCount: number

  /** 对局时长（秒，最近一次） */
  @Column({ type: 'int', default: 0 })
  durationSec: number
}