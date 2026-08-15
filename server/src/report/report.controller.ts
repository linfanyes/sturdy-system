import { Controller, Get, Post, Body, Query, UseGuards } from '@nestjs/common'
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard'
import { Roles } from '../common/decorators/roles.decorator'
import { CurrentTeacher } from '../common/decorators/current-teacher.decorator'
import { CurrentParent } from '../parent-auth/current-parent.decorator'
import { ReportService } from './report.service'

@Controller('report')
@UseGuards(JwtAuthGuard)
export class TeacherReportController {
  constructor(private readonly svc: ReportService) {}

  @Get()
  @Roles('teacher')
  list(@CurrentTeacher() u: any, @Query('classId') classId: string, @Query('type') type?: string) {
    return this.svc.listByClass(u.sub, classId, type)
  }

  @Get('latest')
  @Roles('teacher')
  latest(@CurrentTeacher() u: any, @Query('classId') classId: string, @Query('type') type: 'weekly' | 'monthly' = 'weekly') {
    return this.svc.latest(u.sub, classId, type)
  }

  @Post('generate')
  @Roles('teacher')
  generate(@CurrentTeacher() u: any, @Body() dto: { classId: string; type: 'weekly' | 'monthly' }) {
    return this.svc.generate(u.sub, dto.classId, dto.type)
  }
}

@Controller('parent/report')
@UseGuards(JwtAuthGuard)
export class ParentReportController {
  constructor(private readonly svc: ReportService) {}

  @Get()
  parentLatest(@CurrentParent() p: any, @Query('type') type: 'weekly' | 'monthly' = 'weekly') {
    return this.svc.parentLatest(p.studentId, type)
  }
}
