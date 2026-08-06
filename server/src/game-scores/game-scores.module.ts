import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { GameScore } from './game-score.entity'
import { GameScoresService } from './game-scores.service'
import { GameScoresController } from './game-scores.controller'

@Module({
  imports: [TypeOrmModule.forFeature([GameScore])],
  providers: [GameScoresService],
  controllers: [GameScoresController],
})
export class GameScoresModule {}