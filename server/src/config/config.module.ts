import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { AppConfig } from './app-config.entity'
import { AiSettings } from './ai-settings.entity'
import { ConfigService } from './config.service'
import { ConfigController } from './config.controller'

@Module({
  imports: [TypeOrmModule.forFeature([AppConfig, AiSettings])],
  providers: [ConfigService],
  controllers: [ConfigController],
  exports: [ConfigService],
})
export class ConfigModule {}
