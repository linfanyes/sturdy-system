import { Controller, Post, Get, Delete, Patch, Body, Param, UseGuards, Query } from '@nestjs/common'
import { AdminService } from './admin.service'
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard'
import { Roles } from '../common/decorators/roles.decorator'
import { AuditService } from '../audit/audit.service'
import { createRateLimitGuard } from '../common/guards/rate-limit.guard'
import { AdminLoginDto } from '../auth/dto/unified-login.dto'
import { CreateSchoolDto, UpdateSchoolDto } from './dto/create-school.dto'
import {
  CreateSchoolAdminDto, UpdateSchoolAdminDto, ToggleEnabledDto,
  ResetPasswordDto, ResetAllDto,
} from './dto/school-admin.dto'

// 超管登录：每分钟最多 6 次
const AdminLoginRateLimit = createRateLimitGuard(60_000, 6)

/**
 * 分页上限（与 base.controller 的 MAX_TAKE 对齐）：客户端 take 超 500 截断，
 * 防超管审计大查询（如 grades 5000 级拉取）拖垮数据库。
 */
const MAX_TAKE = 500
function clampTake(take?: string, def = 100): number {
  const v = Number(take) || def
  return Math.min(v, MAX_TAKE)
}
function clampSkip(skip?: string): number {
  return Math.max(0, Number(skip) || 0)
}

@Controller('admin')
@Roles('super')
export class AdminController {
  constructor(
    private readonly svc: AdminService,
    private readonly audit: AuditService,
  ) {}

  @Post('login')
  @UseGuards(AdminLoginRateLimit)
  login(@Body() b: AdminLoginDto) {
    return this.svc.login(b?.username || '', b?.password || '')
  }

  /* ===== 学校管理（超管维护学校与主键编号） ===== */
  @Get('schools')
  @UseGuards(JwtAuthGuard)
  listSchools(@Query('skip') skip?: string, @Query('take') take?: string) {
    return this.svc.listSchools(clampSkip(skip), clampTake(take, 100))
  }

  @Get('schools/:id')
  @UseGuards(JwtAuthGuard)
  getSchool(@Param('id') id: string) {
    return this.svc.getSchool(id)
  }

  @Post('schools')
  @UseGuards(JwtAuthGuard)
  createSchool(@Body() b: CreateSchoolDto) { return this.svc.createSchool(b) }

  @Patch('schools/:id')
  @UseGuards(JwtAuthGuard)
  updateSchool(@Param('id') id: string, @Body() b: UpdateSchoolDto) { return this.svc.updateSchool(id, b) }

  /** 学校级功能包开关（超管独占）：覆盖该校 featureFlags（null/[]=全部开启；数组=仅列出的包级key可用） */
  @Get('schools/:id/features')
  @UseGuards(JwtAuthGuard)
  getSchoolFeatures(@Param('id') id: string) {
    return this.svc.getSchoolFeatures(id)
  }

  @Patch('schools/:id/features')
  @UseGuards(JwtAuthGuard)
  updateSchoolFeatures(@Param('id') id: string, @Body() b: { featureFlags?: string[] }) {
    return this.svc.updateSchoolFeatures(id, b?.featureFlags || [])
  }

  @Delete('schools/:id')
  @UseGuards(JwtAuthGuard)
  deleteSchool(@Param('id') id: string) { return this.svc.deleteSchool(id) }

  @Post('schools/batch-toggle')
  @UseGuards(JwtAuthGuard)
  batchToggleSchool(@Body() b: { ids: string[]; enabled: boolean }) {
    return this.svc.batchToggleSchoolEnabled(b?.ids || [], b?.enabled !== false)
  }

  /* ===== 学校管理员管理（超管只管理学校管理员） ===== */
  @Get('school-admins')
  @UseGuards(JwtAuthGuard)
  listAdmins(@Query('skip') skip?: string, @Query('take') take?: string) {
    return this.svc.listAdmins(clampSkip(skip), clampTake(take, 100))
  }

  @Post('school-admins')
  @UseGuards(JwtAuthGuard)
  createAdmin(@Body() b: CreateSchoolAdminDto) { return this.svc.createAdmin(b) }

  @Patch('school-admins/:id')
  @UseGuards(JwtAuthGuard)
  updateAdmin(@Param('id') id: string, @Body() b: UpdateSchoolAdminDto) { return this.svc.updateAdmin(id, b) }

  @Patch('school-admins/:id/enabled')
  @UseGuards(JwtAuthGuard)
  toggleEnabled(@Param('id') id: string, @Body() b: ToggleEnabledDto) {
    return this.svc.toggleAdminEnabled(id, b?.enabled !== false)
  }

  @Patch('school-admins/:id/password')
  @UseGuards(JwtAuthGuard)
  resetPassword(@Param('id') id: string, @Body() b: ResetPasswordDto) {
    return this.svc.resetAdminPassword(id, b?.password || '')
  }

  @Delete('school-admins/:id')
  @UseGuards(JwtAuthGuard)
  deleteAdmin(@Param('id') id: string) { return this.svc.deleteAdmin(id) }

  @Post('school-admins/batch-toggle')
  @UseGuards(JwtAuthGuard)
  batchToggleAdmin(@Body() b: { ids: string[]; enabled: boolean }) {
    return this.svc.batchToggleAdminEnabled(b?.ids || [], b?.enabled !== false)
  }

  @Post('reset-all')
  @UseGuards(JwtAuthGuard)
  resetAll(@Body() b: ResetAllDto) { return this.svc.resetAll(b?.confirm === true) }

  /* ===== 教师管理（超管可以查看所有教师并清理单个教师数据） ===== */
  @Get('teachers')
  @UseGuards(JwtAuthGuard)
  listTeachers(@Query('skip') skip?: string, @Query('take') take?: string) {
    return this.svc.listTeachers(clampSkip(skip), clampTake(take, 500))
  }

  /* ===== 班级管理（超管审计视图：跨校查看班级） ===== */
  @Get('classes')
  @UseGuards(JwtAuthGuard)
  listClasses(@Query('schoolId') schoolId?: string, @Query('skip') skip?: string, @Query('take') take?: string) {
    return this.svc.listClasses(schoolId, clampSkip(skip), clampTake(take, 500))
  }

  /* ===== 学生管理（超管审计视图：跨校查看学生） ===== */
  @Get('students')
  @UseGuards(JwtAuthGuard)
  listStudents(@Query('schoolId') schoolId?: string, @Query('classId') classId?: string, @Query('skip') skip?: string, @Query('take') take?: string) {
    return this.svc.listStudents(schoolId, classId, clampSkip(skip), clampTake(take, 500))
  }

  @Post('teachers/:id/clear-data')
  @UseGuards(JwtAuthGuard)
  clearTeacherData(@Param('id') id: string) { return this.svc.clearTeacherData(id) }

  @Get('audit-logs')
  @UseGuards(JwtAuthGuard)
  auditLogs(@Query('schoolId') schoolId?: string, @Query('skip') skip?: string, @Query('take') take?: string) {
    return this.audit.list(schoolId, clampSkip(skip), clampTake(take, 100))
  }

  // ===== 超管只读：考试 / 成绩审计（P4） =====

  @Get('audit-exams')
  @UseGuards(JwtAuthGuard)
  auditExams(
    @Query('schoolId') schoolId?: string,
    @Query('classId') classId?: string,
    @Query('skip') skip?: string,
    @Query('take') take?: string,
  ) {
    return this.svc.listAuditExams(schoolId, classId, clampSkip(skip), clampTake(take, 500))
  }

  @Get('audit-grades')
  @UseGuards(JwtAuthGuard)
  auditGrades(
    @Query('schoolId') schoolId?: string,
    @Query('classId') classId?: string,
    @Query('subject') subject?: string,
    @Query('examName') examName?: string,
    @Query('skip') skip?: string,
    @Query('take') take?: string,
  ) {
    return this.svc.listAuditGrades(schoolId, classId, subject, examName, clampSkip(skip), clampTake(take, 500))
  }

  @Get('audit-grade-summary')
  @UseGuards(JwtAuthGuard)
  auditGradeSummary(@Query('schoolId') schoolId?: string, @Query('classId') classId?: string) {
    return this.svc.gradeAuditSummary(schoolId, classId)
  }
}
