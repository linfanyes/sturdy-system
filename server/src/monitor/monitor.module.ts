import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { MonitorLog } from './monitor.entity'
import { MonitorService } from './monitor.service'
import { MonitorController } from './monitor.controller'

@Module({
  imports: [TypeOrmModule.forFeature([MonitorLog])],
  controllers: [MonitorController],
  providers: [MonitorService],
  exports: [MonitorService],
})
export class MonitorModule {}
