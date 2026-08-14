import { Controller, Get, Post, Param, Query, Body, UseGuards, BadRequestException } from '@nestjs/common'
import { Throttle } from '@nestjs/throttler'
import { Roles } from '../common/decorators/roles.decorator'
import { Feature } from '../common/decorators/feature.decorator'
import { FeatureGuard } from '../common/feature/feature.guard'
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard'
import { CurrentTeacher } from '../common/decorators/current-teacher.decorator'
import { CrudController } from '../common/crud/base.controller'
import { Grade } from './grade.entity'
import { GradesService } from './grades.service'

@Roles('teacher')
@Feature('grades')
@UseGuards(JwtAuthGuard, FeatureGuard)
@Controller('grades')
export class GradesController extends CrudController<Grade> {
  constructor(s: GradesService) {
    super(s)
  }

  @Throttle('dashboard')
  @Get()
  findAll(
    @CurrentTeacher() t: any,
    @Query('classId') classId?: string,
    @Query('skip') skip?: string,
    @Query('take') take?: string,
    @Query('term') term?: string,
    @Query('date') date?: string,
    @Query('subject') subject?: string,
    @Query('examName') examName?: string,
  ) {
    const n = Number(take) || 0
    return (this.service as GradesService).findAll(
      t.sub,
      classId,
      Math.max(0, Number(skip) || 0),
      n > 0 ? Math.min(n, 500) : 500,
      term,
      date,
      subject,
      examName,
    )
  }

  @Post('merge')
  @UseGuards(JwtAuthGuard)
  merge(@Body() dto: any, @CurrentTeacher() t: any) {
    return (this.service as GradesService).mergeGrade(t.sub, dto)
  }

  @Post('import-preview')
  @UseGuards(JwtAuthGuard)
  importPreview(
    @Body() body: { classId: string; filename: string; data: string },
    @CurrentTeacher() t: any,
  ) {
    if (!body?.classId || !body?.filename || !body?.data)
      throw new BadRequestException('缺少必要参数')
    return (this.service as GradesService).importPreview(
      t.sub,
      body.classId,
      body.filename,
      body.data,
    )
  }

  @Post('import-commit')
  @UseGuards(JwtAuthGuard)
  importCommit(@Body() body: any, @CurrentTeacher() t: any) {
    if (!body?.classId || !body?.examName || !body?.subject)
      throw new BadRequestException('缺少班级/考试/科目')
    if (!Array.isArray(body.rows) || !body.rows.length)
      throw new BadRequestException('没有可导入的数据')
    return (this.service as GradesService).importGrades(t.sub, body)
  }

  @Post('import-ai')
  @UseGuards(JwtAuthGuard)
  importAi(
    @Body() body: { classId: string; mode: string; data: string; filename?: string },
    @CurrentTeacher() t: any,
  ) {
    if (!body?.classId || !body?.mode || !body?.data)
      throw new BadRequestException('缺少必要参数')
    return (this.service as GradesService).importAi(
      t.sub,
      body.classId,
      body.mode,
      body.data,
      body.filename || '',
    )
  }

  @Get('analysis/exam')
  @UseGuards(JwtAuthGuard)
  examStats(
    @Query('classId') classId: string,
    @Query('examId') examId: string,
    @Query('fullScoreMap') fullScoreMap: string = '',
    @CurrentTeacher() t: any,
  ) {
    if (!classId || !examId) throw new BadRequestException('缺少 classId 或 examId')
    let map: Record<string, number> = {}
    try {
      if (fullScoreMap) map = JSON.parse(fullScoreMap)
    } catch { /* ignore */ }
    return (this.service as GradesService).examStats(t.sub, classId, examId, map)
  }

  @Get('analysis/trend')
  @UseGuards(JwtAuthGuard)
  examTrend(
    @Query('classId') classId: string,
    @Query('subject') subject: string = '',
    @CurrentTeacher() t: any,
  ) {
    if (!classId) throw new BadRequestException('缺少 classId')
    return (this.service as GradesService).examTrend(t.sub, classId, subject || undefined)
  }

  @Get('analysis/rank')
  @UseGuards(JwtAuthGuard)
  classRank(
    @Query('classId') classId: string,
    @Query('examId') examId: string,
    @Query('subject') subject: string = '',
    @CurrentTeacher() t: any,
  ) {
    if (!classId || !examId) throw new BadRequestException('缺少 classId 或 examId')
    return (this.service as GradesService).classRank(t.sub, classId, examId, subject || undefined)
  }

  @Get('analysis/student/:studentId')
  @UseGuards(JwtAuthGuard)
  studentHistory(
    @Param('studentId') studentId: string,
    @CurrentTeacher() t: any,
  ) {
    return (this.service as GradesService).studentHistory(t.sub, studentId)
  }

  @Get('analysis/weak')
  @UseGuards(JwtAuthGuard)
  weakStudents(
    @Query('classId') classId: string,
    @Query('examId') examId: string = '',
    @CurrentTeacher() t: any,
  ) {
    if (!classId) throw new BadRequestException('缺少 classId')
    return (this.service as GradesService).weakStudents(t.sub, classId, examId || undefined)
  }

  @Get('export')
  @UseGuards(JwtAuthGuard)
  async exportGrades(
    @Query('classId') classId: string,
    @CurrentTeacher() t: any,
    @Query('term') term?: string,
  ) {
    if (!classId) throw new BadRequestException('缺少 classId')
    const r = await (this.service as GradesService).findAll(t.sub, classId, 0, 5000, term)
    return { total: Array.isArray(r) ? r.length : (r?.items?.length || 0), data: Array.isArray(r) ? r : (r?.items || []) }
  }
}
