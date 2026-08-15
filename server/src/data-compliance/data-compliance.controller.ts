import {
  Controller,
  Get,
  Put,
  Post,
  Body,
  Query,
  UseGuards,
  ForbiddenException,
} from '@nestjs/common'
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard'
import { Roles } from '../common/decorators/roles.decorator'
import { CurrentParent } from '../parent-auth/current-parent.decorator'
import { DataComplianceService } from './data-compliance.service'
import { UpsertConsentDto } from './data-compliance.dto'

/** 家长端：数据授权（监护人同意 + 撤回） */
@UseGuards(JwtAuthGuard)
@Roles('parent')
@Controller('parent/consent')
export class ParentConsentController {
  constructor(private readonly svc: DataComplianceService) {}

  @Get('me')
  me(@CurrentParent() p: any) {
    const ownerId = p?.sub || p?.id
    if (!ownerId) throw new ForbiddenException('未识别家长身份')
    return this.svc.getOrCreate(ownerId, p?.studentId, p?.studentName)
  }

  @Put('me')
  upsert(@CurrentParent() p: any, @Body() dto: UpsertConsentDto) {
    const ownerId = p?.sub || p?.id
    if (!ownerId) throw new ForbiddenException('未识别家长身份')
    return this.svc.upsert(ownerId, p?.studentId, p?.studentName, dto)
  }

  @Post('withdraw')
  withdraw(@CurrentParent() p: any) {
    const ownerId = p?.sub || p?.id
    if (!ownerId) throw new ForbiddenException('未识别家长身份')
    return this.svc.withdraw(ownerId, p?.studentId)
  }
}

/** 超管 / 校管：合规概览与查询 */
@UseGuards(JwtAuthGuard)
@Roles('schoolAdmin', 'super')
@Controller('admin/data-compliance')
export class AdminComplianceController {
  constructor(private readonly svc: DataComplianceService) {}

  @Get('summary')
  summary() {
    return this.svc.summary()
  }

  @Get('consents')
  list(@Query('studentId') studentId: string) {
    if (!studentId) return []
    return this.svc.listByStudent(studentId)
  }
}
