import { Controller, Get, Post, Patch, Delete, Param, Body, Query, UseGuards } from '@nestjs/common'
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard'
import { Roles } from '../common/decorators/roles.decorator'
import { CurrentTeacher } from '../common/decorators/current-teacher.decorator'
import { TeachingCalendarService } from './teaching-calendar.service'

const MAX_TAKE = 500
function clampTake(take?: string): number {
  const v = Number(take) || MAX_TAKE
  return Math.min(v, MAX_TAKE)
}

function stripUnsafe(dto: any): any {
  if (!dto || typeof dto !== 'object') return dto
  const out: any = {}
  const unsafe = new Set(['teacherId', 'id', 'role', 'createdAt', 'updatedAt', 'isDeleted'])
  for (const k of Object.keys(dto)) {
    if (unsafe.has(k)) continue
    out[k] = dto[k]
  }
  return out
}

/**
 * 教学日历控制器
 * 支持按月查询：GET /teaching-calendar?year=2026&month=7
 */
@Roles('teacher')
@UseGuards(JwtAuthGuard)
@Controller('teaching-calendar')
export class TeachingCalendarController {
  constructor(private readonly svc: TeachingCalendarService) {}

  @Post()
  create(@Body() dto: any, @CurrentTeacher() t: any) {
    return this.svc.create(t.sub, stripUnsafe(dto))
  }

  @Get()
  findAll(
    @CurrentTeacher() t: any,
    @Query('year') year?: string,
    @Query('month') month?: string,
    @Query('skip') skip?: string,
    @Query('take') take?: string,
  ) {
    if (year && month) {
      return this.svc.findByMonth(t.sub, Number(year), Number(month))
    }
    return this.svc.findAll(t.sub, Number(skip) || 0, clampTake(take))
  }

  @Get(':id')
  findOne(@Param('id') id: string, @CurrentTeacher() t: any) {
    return this.svc.findOne(id, t.sub)
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: any, @CurrentTeacher() t: any) {
    return this.svc.update(id, t.sub, stripUnsafe(dto))
  }

  @Delete(':id')
  remove(@Param('id') id: string, @CurrentTeacher() t: any) {
    return this.svc.remove(id, t.sub)
  }
}
