import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { AppConfig } from './app-config.entity'
import { AiSettings } from './ai-settings.entity'
import { AiProvider } from './ai-provider.entity'
import { ConfigService } from './config.service'
import { ConfigController } from './config.controller'
import { AiProviderService } from './ai-provider.service'
import { AiProviderController } from './ai-provider.controller'

@Module({
  imports: [TypeOrmModule.forFeature([AppConfig, AiSettings, AiProvider])],
  providers: [ConfigService, AiProviderService],
  controllers: [ConfigController, AiProviderController],
  exports: [ConfigService, AiProviderService],
})
export class ConfigModule {}
