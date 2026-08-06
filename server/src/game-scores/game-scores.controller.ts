import { Controller, Get, Post, Body, Query, UseGuards, Param } from '@nestjs/common'
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard'
import { Roles } from '../common/decorators/roles.decorator'
import { CurrentTeacher } from '../common/decorators/current-teacher.decorator'
import { GameScoresService } from './game-scores.service'

@Roles('teacher')
@UseGuards(JwtAuthGuard)
@Controller('game-scores')
export class GameScoresController {
  constructor(private readonly svc: GameScoresService) {}

  /** 上报一次对局得分（幂等更新最高分） */
  @Post()
  submit(@CurrentTeacher() t: any, @Body() dto: { gameKey: string; gameName?: string; score: number; durationSec?: number }) {
    return this.svc.submit(t.sub, dto)
  }

  /** 查询当前教师所有游戏得分（榜单） */
  @Get()
  list(@CurrentTeacher() t: any) {
    return this.svc.list(t.sub)
  }

  /** 查询单游戏最高分 */
  @Get(':gameKey')
  best(@CurrentTeacher() t: any, @Param('gameKey') gameKey: string) {
    return this.svc.best(t.sub, gameKey)
  }
}