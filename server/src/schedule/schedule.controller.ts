import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards } from '@nestjs/common'
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard'
import { Roles } from '../common/decorators/roles.decorator'
import { CurrentTeacher } from '../common/decorators/current-teacher.decorator'
import { CurrentParent } from '../parent-auth/current-parent.decorator'
import { ScheduleService } from './schedule.service'

@Controller('schedule')
@UseGuards(JwtAuthGuard)
export class TeacherScheduleController {
  constructor(private readonly svc: ScheduleService) {}

  @Post()
  @Roles('teacher')
  create(@CurrentTeacher() u: any, @Body() dto: any) {
    return this.svc.create(u.sub, dto)
  }

  @Get()
  @Roles('teacher')
  list(@CurrentTeacher() u: any, @Query('classId') classId: string) {
    return this.svc.listByClass(u.sub, classId)
  }

  @Put(':id')
  @Roles('teacher')
  update(@CurrentTeacher() u: any, @Param('id') id: string, @Body() dto: any) {
    return this.svc.update(u.sub, id, dto)
  }

  @Delete(':id')
  @Roles('teacher')
  remove(@CurrentTeacher() u: any, @Param('id') id: string) {
    return this.svc.remove(u.sub, id)
  }

  /** 调课并通知全班家长 */
  @Post(':id/adjust')
  @Roles('teacher')
  adjust(@CurrentTeacher() u: any, @Param('id') id: string, @Body() dto: any) {
    return this.svc.adjust(u.sub, id, dto)
  }
}

@Controller('parent/schedule')
@UseGuards(JwtAuthGuard)
export class ParentScheduleController {
  constructor(private readonly svc: ScheduleService) {}

  @Get()
  parentList(@CurrentParent() p: any) {
    return this.svc.parentList(p.studentId)
  }
}
