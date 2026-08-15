import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { DataConsent } from './data-compliance.entity'
import { DataComplianceService } from './data-compliance.service'
import { ParentConsentController, AdminComplianceController } from './data-compliance.controller'
import { AuditModule } from '../audit/audit.module'

@Module({
  imports: [TypeOrmModule.forFeature([DataConsent]), AuditModule],
  controllers: [ParentConsentController, AdminComplianceController],
  providers: [DataComplianceService],
  exports: [DataComplianceService],
})
export class DataComplianceModule {}
