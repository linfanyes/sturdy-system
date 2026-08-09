import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { ScoreRecord, RewardRecord } from '../engagement/engagement.entity'
import { Student } from '../students/student.entity'
import { ClassItem } from '../classes/class.entity'
import { LeaderboardController } from './leaderboard.controller'

/**
 * EvaluationModule —— 排行榜（班级积分/奖惩聚合）。
 * 整改：此前模块内联了一份 LeaderboardController，与独立 leaderboard.controller.ts 重复；
 * 现统一注册独立文件（含 ForbiddenException 权限校验）作为唯一实现，消除死代码。
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([ScoreRecord, RewardRecord, Student, ClassItem]),
  ],
  controllers: [LeaderboardController],
})
export class EvaluationModule {}