import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { GameScore } from './game-score.entity'

/**
 * 小游戏得分服务：按教师租户隔离，幂等记录每游戏最高分。
 */
@Injectable()
export class GameScoresService {
  constructor(
    @InjectRepository(GameScore)
    private readonly repo: Repository<GameScore>,
  ) {}

  /**
   * 上报一次对局结果（幂等 upsert 最高分）。
   * @param teacherId 当前教师 id（租户键）
   * @param dto 对局数据
   */
  async submit(teacherId: string, dto: { gameKey: string; gameName?: string; score: number; durationSec?: number }) {
    const gameKey = dto.gameKey?.trim()
    if (!gameKey) throw new Error('gameKey 不能为空')

    let rec = await this.repo.findOne({ where: { teacherId, gameKey } })
    if (!rec) {
      rec = this.repo.create({
        teacherId,
        gameKey,
        gameName: dto.gameName?.trim() || gameKey,
        bestScore: 0,
        lastScore: 0,
        playCount: 0,
        durationSec: 0,
      })
    }
    const score = Math.max(0, Number(dto.score) || 0)
    rec.lastScore = score
    if (score > rec.bestScore) rec.bestScore = score
    rec.playCount += 1
    if (dto.durationSec) rec.durationSec = Number(dto.durationSec) || 0
    await this.repo.save(rec)
    return rec
  }

  /** 查询当前教师所有游戏得分（按最高分降序） */
  async list(teacherId: string) {
    const rows = await this.repo.find({
      where: { teacherId },
      order: { bestScore: 'DESC' } as any,
    })
    return rows
  }

  /** 查询单游戏最高分（教师端展示用，无则返回空对象） */
  async best(teacherId: string, gameKey: string) {
    const rec = await this.repo.findOne({ where: { teacherId, gameKey } })
    if (!rec) return null
    return rec
  }
}