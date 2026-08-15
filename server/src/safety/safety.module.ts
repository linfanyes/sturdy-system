import { Module, Controller, Get, Post, Param, Body, Query, UseGuards } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard'
import { Roles as RolesDecorator } from '../common/decorators/roles.decorator'
import { CurrentTeacher } from '../common/decorators/current-teacher.decorator'
import { CurrentParent } from '../parent-auth/current-parent.decorator'
import { SafetyReport, SafetyCheckin } from './safety.entity'
import { SafetyService } from './safety.service'
import { Student } from '../students/student.entity'
import { ClassItem } from '../classes/class.entity'
import { Checkin } from '../checkin/checkin.module'

@Controller('safety')
@RolesDecorator('teacher', 'schoolAdmin', 'super')
@UseGuards(JwtAuthGuard)
export class TeacherSafetyController {
  constructor(private readonly svc: SafetyService) {}

  /** 举报列表（可按班级/状态过滤） */
  @Get('reports')
  list(@CurrentTeacher() t: any, @Query('classId') classId: string, @Query('status') status?: string) {
    return this.svc.listReports(t.id, classId, status)
  }

  /** 处理举报（跟进 / 改等级 / 标记解决） */
  @Post('reports/:id/respond')
  respond(@CurrentTeacher() t: any, @Param('id') id: string, @Body() body: any) {
    return this.svc.respond(t.id, id, body)
  }

  /** 考勤异常预警（近 7 天无打卡学生） */
  @Get('anomalies')
  anomalies(@CurrentTeacher() t: any, @Query('classId') classId: string) {
    return this.svc.getAnomalies(t.id, classId)
  }

  /** 安全打卡（教师记录） */
  @Post('checkin')
  checkin(@CurrentTeacher() t: any, @Body() body: any) {
    return this.svc.submitCheckin(body.studentId, body)
  }
}

@Controller('parent/safety')
@RolesDecorator('parent')
@UseGuards(JwtAuthGuard)
export class ParentSafetyController {
  constructor(private readonly svc: SafetyService) {}

  /** 匿名举报（校园安全 / 防欺凌） */
  @Post('report')
  report(@CurrentParent() p: any, @Body() body: any) {
    return this.svc.submitReport(p.studentId, body)
  }

  /** 安全打卡（离校 / 到家，家长协助） */
  @Post('checkin')
  checkin(@CurrentParent() p: any, @Body() body: any) {
    return this.svc.submitCheckin(p.studentId, body)
  }
}

@Module({
  imports: [
    TypeOrmModule.forFeature([SafetyReport, SafetyCheckin, Student, ClassItem, Checkin]),
  ],
  controllers: [TeacherSafetyController, ParentSafetyController],
  providers: [SafetyService],
  exports: [SafetyService],
})
export class SafetyModule {}
