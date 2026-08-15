import {
  Controller,
  Get,
  Put,
  Body,
  UseGuards,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common'
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard'
import { Roles } from '../common/decorators/roles.decorator'
import { CurrentTeacher } from '../common/decorators/current-teacher.decorator'
import { CurrentParent } from '../parent-auth/current-parent.decorator'
import { NotifyPrefService } from './notify-pref.service'
import { UpsertNotifyPrefDto } from './notify-pref.dto'

/** 教师端通知偏好 */
@UseGuards(JwtAuthGuard)
@Roles('teacher', 'schoolAdmin', 'super')
@Controller('notify-prefs')
export class TeacherNotifyPrefController {
  constructor(private readonly svc: NotifyPrefService) {}

  @Get('me')
  me(@CurrentTeacher() t: any) {
    if (!t?.id) throw new ForbiddenException('未识别教师身份')
    return this.svc.getOrCreate(t.id, 'teacher')
  }

  @Put('me')
  upsert(@CurrentTeacher() t: any, @Body() dto: UpsertNotifyPrefDto) {
    if (!t?.id) throw new ForbiddenException('未识别教师身份')
    return this.svc.upsert(t.id, 'teacher', dto)
  }
}

/** 家长端通知偏好与成绩分级可见 */
@UseGuards(JwtAuthGuard)
@Roles('parent')
@Controller('parent/notify-prefs')
export class ParentNotifyPrefController {
  constructor(private readonly svc: NotifyPrefService) {}

  @Get('me')
  me(@CurrentParent() p: any) {
    const ownerId = p?.sub || p?.id
    if (!ownerId) throw new ForbiddenException('未识别家长身份')
    return this.svc.getOrCreate(ownerId, 'parent')
  }

  @Put('me')
  upsert(@CurrentParent() p: any, @Body() dto: UpsertNotifyPrefDto) {
    const ownerId = p?.sub || p?.id
    if (!ownerId) throw new ForbiddenException('未识别家长身份')
    return this.svc.upsert(ownerId, 'parent', dto)
  }
}
