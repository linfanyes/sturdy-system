import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { ChatSession } from './chat-session.entity'
import { ChatHistoryService } from './chat-history.service'
import { ChatHistoryController } from './chat-history.controller'

@Module({
  imports: [TypeOrmModule.forFeature([ChatSession])],
  providers: [ChatHistoryService],
  controllers: [ChatHistoryController],
})
export class ChatHistoryModule {}